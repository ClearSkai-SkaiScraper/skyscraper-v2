export const dynamic = "force-dynamic";
/**
 * PHASE 36: Vision Analysis API Endpoint
 * Rate-limited and authenticated
 */

import { NextRequest, NextResponse } from "next/server";

import { trackAiUsage } from "@/lib/ai/trackUsage";
import { analyzePropertyImage } from "@/lib/ai/vision";
import { createAiConfig, withAiBilling } from "@/lib/ai/withAiBilling";
import { aiFail, aiOk, classifyOpenAiError } from "@/lib/api/aiResponse";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit, getRateLimitError } from "@/lib/ratelimit";
import { validateAIRequest, visionAnalyzeSchema } from "@/lib/validation/aiSchemas";

async function POST_INNER(req: NextRequest, ctx: { userId: string; orgId: string | null }) {
  try {
    const { userId, orgId } = ctx;

    // Rate limiting check (10 requests per minute)
    const identifier = orgId || userId;
    const rateLimit = await checkRateLimit(identifier, "AI");
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: getRateLimitError(rateLimit.reset) },
        { status: 429 }
      );
    }

    const user = await prisma.users.findUnique({
      where: { clerkUserId: userId },
      select: { orgId: true },
    });

    if (!user?.orgId) {
      return NextResponse.json(aiFail("No organization", "NOT_FOUND"), { status: 404 });
    }

    const body = await req.json();
    const validation = validateAIRequest(visionAnalyzeSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error, details: validation.details },
        { status: 400 }
      );
    }
    const { imageUrl, focusAreas, claimId } = validation.data;

    const analysis = await analyzePropertyImage(imageUrl, user.orgId, {
      focusAreas,
      claimId,
    });

    // Persist the analysis to GeneratedArtifact so it survives page refresh
    try {
      await prisma.generatedArtifact.create({
        data: {
          orgId: user.orgId,
          claimId: claimId || null,
          type: "vision_analysis",
          title: `Vision Analysis — ${new Date().toLocaleDateString()}`,
          content: JSON.stringify(analysis),
          model: "gpt-4o",
          tokensUsed: 500,
          status: "completed",
          metadata: { focusAreas, imageUrl },
        },
      });
    } catch (saveErr) {
      logger.error("[Vision API] Failed to save analysis artifact:", saveErr);
    }

    // Track AI usage
    await trackAiUsage({
      orgId: user.orgId,
      feature: "vision-analyze",
      tokens: 500, // Estimated tokens for vision analysis
      metadata: { claimId, userId },
    });

    return NextResponse.json(aiOk({ analysis }), { status: 200 });
  } catch (error) {
    logger.error("[Vision API] Error:", error);
    const { message, code } = classifyOpenAiError(error);
    return NextResponse.json(aiFail("Analysis failed", code || "SERVER", { detail: message }), {
      status: 500,
    });
  }
}

export const POST = withAiBilling(
  createAiConfig("vision_analyze", { costPerRequest: 25 }),
  POST_INNER
);
