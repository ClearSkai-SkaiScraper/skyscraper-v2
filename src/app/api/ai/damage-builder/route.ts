export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest } from "next/server";

import { damageBuilderPrompt } from "@/lib/ai/promptDamageBuilder";
import { createAiConfig, withAiBilling } from "@/lib/ai/withAiBilling";
import { errors, ok, withErrorHandler } from "@/lib/api/response";
import { log } from "@/lib/logger";
import { buildDamagePdf } from "@/lib/pdf/damageReport";
import prisma from "@/lib/prisma";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { damageBuilderSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

async function handlePOST(
  req: NextRequest,
  ctx: {
    userId: string;
    orgId: string | null;
    feature: string;
    planType: string;
    betaMode: boolean;
  }
) {
  const startTime = Date.now();
  const { userId, orgId } = ctx;

  log.info("[damage-builder] Request started", { userId, orgId });

  // 2) Rate limiting: 10 AI requests per minute
  const identifier = getRateLimitIdentifier(userId, req);
  const allowed = await rateLimiters.ai.check(10, identifier);
  if (!allowed) {
    log.warn("[damage-builder] Rate limit exceeded", { userId, orgId });
    return errors.tooManyRequests();
  }

  // 3) Parse request body
  const body = await req.json();
  const validated = validateAIRequest(damageBuilderSchema, body);
  if (!validated.success) {
    return errors.badRequest(validated.error);
  }

  const {
    claimId,
    address,
    dateOfLoss,
    roofType,
    roofSqft,
    materials,
    windSpeed,
    hailSize,
    notes,
  } = validated.data;

  // 4) Build AI prompt
  const prompt = damageBuilderPrompt({
    address,
    dateOfLoss,
    roofType: roofType || "",
    roofSqft: roofSqft || 0,
    materials,
    windSpeed,
    hailSize,
    notes,
  });

  // 5) Call OpenAI
  if (!process.env.OPENAI_API_KEY) {
    return errors.internal("AI service is not configured.");
  }

  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!aiRes.ok) {
    const errorText = await aiRes.text();
    log.error("[damage-builder] OpenAI API error", { errorText });
    return errors.internal("AI service failed to generate report.");
  }

  const data = await aiRes.json();
  const content = data?.choices?.[0]?.message?.content || "{}";

  // 6) Parse AI response
  let json: any;
  try {
    json = JSON.parse(content);
  } catch (_parseError) {
    log.error("[damage-builder] Failed to parse AI response", { content });
    return errors.internal("AI returned invalid response format.");
  }

  // 7) Generate PDF
  const { publicUrl } = await buildDamagePdf({
    json,
    meta: {
      address,
      dateOfLoss,
      roofType: roofType || "",
      roofSqft: roofSqft || 0,
      orgName: "SkaiScraper",
    },
  });

  // 8) Save to ai_reports table with proper org scoping
  const { getUserName } = await import("@/lib/clerk-utils");
  await prisma.ai_reports.create({
    data: {
      id: `damage_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      orgId: orgId || "",
      claimId: claimId || null,
      userId,
      userName: await getUserName(userId),
      type: "damage_builder",
      title: `Damage Report - ${address}`,
      prompt: prompt.substring(0, 1000), // Store first 1000 chars
      content: JSON.stringify(json),
      tokensUsed: data.usage?.total_tokens || 0,
      model: "gpt-4o-mini",
      attachments: { pdfUrl: publicUrl, address, dateOfLoss, roofType, roofSqft },
      status: "generated",
      updatedAt: new Date(),
    },
  });

  // 8b) Auto-generate timeline event if claim is linked
  if (claimId) {
    try {
      const { logDamageBuilderEvent } = await import("@/lib/claims/timeline");
      await logDamageBuilderEvent(claimId, userId);
    } catch (err) {
      log.warn("[damage-builder] Timeline event logging failed", { claimId, error: err });
    }
  }

  // 9) Log success and return
  const duration = Date.now() - startTime;
  log.info("[damage-builder] Request completed", {
    userId,
    orgId,
    claimId,
    duration,
    tokensUsed: data.usage?.total_tokens || 0,
  });

  return ok({
    pdfUrl: publicUrl,
    report: json,
  });
}

export const POST = withAiBilling(
  createAiConfig("damage_builder", { costPerRequest: 30, planRequired: "pro" }),
  withErrorHandler(handlePOST, "POST /api/ai/damage-builder")
);
