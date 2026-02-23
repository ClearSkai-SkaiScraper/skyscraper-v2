/**
 * ============================================================================
 * UNIFIED AI ACTIONS HANDLER
 * ============================================================================
 *
 * POST /api/claims/[claimId]/ai/actions
 *
 * Consolidates ALL AI operations for claims into a single action-based endpoint.
 *
 * SUPPORTED ACTIONS:
 *   - chat: AI assistant conversation
 *   - summary: Generate executive summary
 *   - rebuttal: Generate rebuttal letter
 *   - predict: Lifecycle prediction
 *   - carrier_summary: Carrier submission packet
 *   - analyze: Manual analysis trigger
 *
 * REPLACES:
 *   - /api/claims/[claimId]/ai/summary
 *   - /api/claims/[claimId]/ai/rebuttal
 *   - /api/claims/[claimId]/predict
 *   - /api/claims/[claimId]/carrier-summary
 *   - /api/claims/[claimId]/rebuttal-builder
 *   - /api/claims/[claimId]/ai-reports (GET remains separate)
 *
 * ============================================================================
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { callOpenAI, getOpenAI } from "@/lib/ai/client";
import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { buildClaimContext } from "@/lib/claim/buildClaimContext";
import {
  formatPacketForDelivery,
  generateCarrierSummary,
} from "@/lib/claims/generators/carrierSummary";
import { predictClaimLifecycle, type PredictionInput } from "@/lib/claims/predictor";
import { requirePermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { htmlToPdfBuffer } from "@/lib/reports/pdf-utils";
import { saveAiPdfToStorage } from "@/lib/reports/saveAiPdfToStorage";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("chat"),
    message: z.string().min(1, "Message is required"),
  }),
  z.object({
    action: z.literal("summary"),
  }),
  z.object({
    action: z.literal("rebuttal"),
    supplementId: z.string().uuid(),
    carrierResponse: z.string().optional(),
    savePdf: z.boolean().optional().default(true),
  }),
  z.object({
    action: z.literal("rebuttal_builder"),
    denialReason: z.string().min(10),
    denialDetails: z.string().optional(),
    tone: z.enum(["professional", "firm", "legal"]).default("professional"),
  }),
  z.object({
    action: z.literal("predict"),
  }),
  z.object({
    action: z.literal("carrier_summary"),
    format: z.enum(["json", "text"]).optional().default("json"),
  }),
  z.object({
    action: z.literal("analyze"),
    analysisType: z.enum(["triage", "damage", "video", "blueprint", "policy"]),
  }),
]);

type ActionPayload = z.infer<typeof actionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  try {
    // Auth
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId, userId } = auth;

    const { claimId } = await params;

    // Verify claim belongs to org
    await getOrgClaimOrThrow(orgId, claimId);

    // Rate limit
    const identifier = getClientIdentifier(req, userId);
    const rl = await checkRateLimit(identifier, "API");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // Parse and validate body
    const body = await req.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // Route to action handler
    switch (payload.action) {
      case "chat":
        return handleChat(claimId, payload.message, orgId);

      case "summary":
        await requirePermission("use_ai_features");
        return handleSummary(claimId, orgId);

      case "rebuttal":
        await requirePermission("use_ai_features");
        return handleRebuttal(claimId, orgId, payload);

      case "rebuttal_builder":
        await requirePermission("use_ai_features");
        return handleRebuttalBuilder(claimId, orgId, payload);

      case "predict":
        return handlePredict(claimId, orgId);

      case "carrier_summary":
        return handleCarrierSummary(claimId, payload.format);

      case "analyze":
        return handleAnalyze(claimId, payload.analysisType);

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof OrgScopeError) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    logger.error("[AI Actions] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

async function handleChat(claimId: string, message: string, orgId: string) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ok: false,
      error: "AI_NOT_CONFIGURED",
      reply: "AI Assistant is not configured.",
    });
  }

  const claimContext = await buildClaimContext(claimId);
  if (!claimContext?.claim) {
    return NextResponse.json({
      ok: false,
      error: "CLAIM_NOT_FOUND",
      reply: "Couldn't load claim data.",
    });
  }

  const contextSummary = `
CLAIM CONTEXT:
Claim Number: ${claimContext.claim.claimNumber || "N/A"}
Insured: ${claimContext.claim.insured_name || "N/A"}
Property: ${claimContext.claim.propertyAddress || "N/A"}
Loss Date: ${claimContext.claim.lossDate || "N/A"}
Carrier: ${claimContext.claim.carrier || "N/A"}
Damage Type: ${claimContext.claim.damageType || "N/A"}
Status: ${claimContext.claim.status || "N/A"}
Photos: ${(claimContext as any).photos?.length || 0} available
Notes: ${(claimContext as any).notes?.length || 0} recorded
`;

  const systemPrompt = `You are an expert insurance claims assistant for SkaiScraper.
Use ONLY the data provided. NEVER invent data. Be professional and accurate.`;

  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "system", content: contextSummary },
      { role: "user", content: message },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  return NextResponse.json({
    ok: true,
    reply: completion.choices[0]?.message?.content || "No response generated.",
    tokensUsed: completion.usage?.total_tokens || 0,
  });
}

async function handleSummary(claimId: string, orgId: string) {
  const claim = await prisma.claims.findFirst({
    where: { id: claimId, orgId },
    select: {
      claimNumber: true,
      title: true,
      damageType: true,
      dateOfLoss: true,
      carrier: true,
      lifecycle_stage: true,
    },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  const prompt = `Generate a concise executive summary for this insurance claim:

Claim #${claim.claimNumber}
Title: ${claim.title}
Damage Type: ${claim.damageType}
Date of Loss: ${claim.dateOfLoss ? new Date(claim.dateOfLoss).toLocaleDateString() : "Unknown"}
Carrier: ${claim.carrier || "Unknown"}
Current Stage: ${claim.lifecycle_stage}

Provide:
1. Brief overview (2-3 sentences)
2. Key milestones
3. Current status
4. Next recommended action`;

  const result = await callOpenAI<string>({
    tag: "claim_summary",
    system: "You are an expert insurance claims adjuster. Provide clear, professional summaries.",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    maxTokens: 500,
  });

  return NextResponse.json({
    success: true,
    summary: result,
    claim: {
      claimNumber: claim.claimNumber,
      title: claim.title,
      damageType: claim.damageType,
    },
  });
}

async function handleRebuttal(
  claimId: string,
  orgId: string,
  payload: { supplementId: string; carrierResponse?: string; savePdf?: boolean }
) {
  const claim = await prisma.claims.findFirst({
    where: { id: claimId, orgId },
    include: { properties: true },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  const supplement = await prisma.claim_supplements.findFirst({
    where: { id: payload.supplementId, claim_id: claimId },
  });

  if (!supplement) {
    return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
  }

  const prompt = `Generate a professional insurance supplement rebuttal letter for:

Claim #${claim.claimNumber}
Property: ${claim.properties?.street || "N/A"}
Damage Type: ${claim.damageType}
Supplement Amount: $${(supplement.total_cents / 100).toFixed(2)}
${payload.carrierResponse ? `\nCarrier Response: ${payload.carrierResponse}` : ""}

Write a persuasive, professional rebuttal that:
1. Acknowledges the carrier's position (if provided)
2. Clearly justifies the supplement with factual reasoning
3. References industry standards and best practices
4. Maintains professional tone throughout`;

  const result = await callOpenAI<string>({
    tag: "rebuttal_letter",
    system: "You are an expert insurance claims advocate. Write compelling rebuttals.",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    maxTokens: 1500,
  });

  // Optionally save as PDF
  let pdfUrl: string | null = null;
  if (payload.savePdf && result) {
    try {
      const html = `<div style="font-family: Arial, sans-serif; padding: 40px;">${String(result).replace(/\n/g, "<br>")}</div>`;
      const pdfBuffer = await htmlToPdfBuffer(html);
      const pdfResult = await saveAiPdfToStorage({
        buffer: pdfBuffer,
        claimId,
        type: "rebuttal",
        orgId,
      } as any);
      pdfUrl = (pdfResult as any)?.url || null;
    } catch (e) {
      logger.error("PDF save failed:", e);
    }
  }

  return NextResponse.json({
    success: true,
    rebuttal: result,
    pdfUrl,
    supplementId: payload.supplementId,
  });
}

async function handleRebuttalBuilder(
  claimId: string,
  orgId: string,
  payload: { denialReason: string; denialDetails?: string; tone: string }
) {
  const claim = await prisma.claims.findFirst({
    where: { id: claimId, orgId },
    include: {
      properties: {
        select: { street: true, city: true, state: true, carrier: true, policyNumber: true },
      },
      claim_supplements: { orderBy: { created_at: "desc" }, take: 5 },
    },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  const prompt = `Generate a comprehensive rebuttal package for this insurance claim denial.

CLAIM DETAILS:
Claim #: ${claim.claimNumber}
Property: ${claim.properties?.street}, ${claim.properties?.city}, ${claim.properties?.state}
Carrier: ${claim.carrier || claim.properties?.carrier || "Unknown"}
Damage Type: ${claim.damageType}
Date of Loss: ${claim.dateOfLoss ? new Date(claim.dateOfLoss).toLocaleDateString() : "Unknown"}

DENIAL INFORMATION:
Reason: ${payload.denialReason}
${payload.denialDetails ? `Details: ${payload.denialDetails}` : ""}

TONE: ${payload.tone}

Generate:
1. Professional rebuttal letter addressing the denial
2. Key points to emphasize
3. Recommended supporting documentation
4. Relevant industry standards or codes to cite`;

  const result = await callOpenAI<string>({
    tag: "rebuttal_builder",
    system: "You are an expert insurance claims advocate. Create comprehensive rebuttal packages.",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    maxTokens: 2000,
  });

  return NextResponse.json({
    success: true,
    rebuttalPackage: result,
    claim: {
      claimNumber: claim.claimNumber,
      carrier: claim.carrier,
    },
  });
}

async function handlePredict(claimId: string, orgId: string) {
  const claim = await prisma.claims.findFirst({
    where: { id: claimId, orgId },
    include: { leads: true },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  // Gather prediction data
  const skaiAnalysis = await prisma.claim_analysis.findFirst({
    where: { claim_id: claimId },
  });

  const stormImpactData = await prisma.stormImpact.findFirst({
    where: { claimId },
    orderBy: { createdAt: "desc" },
  });

  const predictionInput: PredictionInput = {
    claimId,
    leadId: claim.leads?.id || undefined,
    orgId,
    stage: claim.status || undefined,
    skaiAnalysis: skaiAnalysis
      ? {
          damageType: (skaiAnalysis.damages as Record<string, unknown> | null)?.type as
            | string
            | undefined,
          urgency: (skaiAnalysis.risk_flags as Record<string, unknown> | null)?.urgency as
            | string
            | undefined,
          materials: skaiAnalysis.materials ? (skaiAnalysis.materials as unknown[]) : undefined,
          flags: skaiAnalysis.risk_flags ? ["comprehensive_damage"] : ["minimal_damage"],
        }
      : undefined,
    stormImpact: stormImpactData
      ? {
          hailSize: stormImpactData.hailSize || undefined,
          windSpeed: stormImpactData.windSpeed || undefined,
          distance: stormImpactData.stormDistance || undefined,
          severityScore: stormImpactData.severityScore || undefined,
        }
      : undefined,
  };

  const prediction = await predictClaimLifecycle(predictionInput);

  return NextResponse.json({
    success: true,
    prediction,
    claimId,
  });
}

async function handleCarrierSummary(claimId: string, format: "json" | "text") {
  const summary = await generateCarrierSummary(claimId);

  if (format === "text") {
    const formattedText = formatPacketForDelivery(summary);
    return new NextResponse(formattedText, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="claim-${claimId}-submission.txt"`,
      },
    });
  }

  return NextResponse.json({ success: true, summary });
}

async function handleAnalyze(claimId: string, analysisType: string) {
  const { triggerManualAnalysis } = await import("@/lib/claims/aiHooks");
  const result = await triggerManualAnalysis(claimId, analysisType as any);

  if (!result) {
    return NextResponse.json(
      { success: false, error: "Analysis failed or no data available" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, analysisType, result });
}
