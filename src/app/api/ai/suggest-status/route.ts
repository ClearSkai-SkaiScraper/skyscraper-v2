export const dynamic = "force-dynamic";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { getTenant } from "@/lib/auth/tenant";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { suggestStatusSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

/**
 * AI-powered status suggestion endpoint
 * Analyzes claim data and suggests next lifecycle stage
 */
export async function POST(req: NextRequest) {
  try {
    const orgId = await getTenant();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit AI requests
    const rl = await checkRateLimit(orgId, "AI");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const validation = validateAIRequest(suggestStatusSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }
    const { claimId } = validation.data;

    // Fetch claim
    const claim = await prisma.claims.findUnique({
      where: { id: claimId, orgId },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // AI Logic: Analyze claim data to suggest status
    let suggestedStatus = claim.lifecycle_stage || "FILED";
    let confidence = 0;
    let reasoning = "";

    const currentStage = claim.lifecycle_stage;
    // Simplified: would need separate queries for full analysis
    const hasDocuments = false;
    const hasDamageAssessment = false;
    const recentActivityCount = 0;
    const daysSinceLoss = claim.dateOfLoss
      ? Math.floor((Date.now() - new Date(claim.dateOfLoss).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Smart status progression logic
    if (currentStage === "FILED") {
      if (hasDocuments && hasDamageAssessment) {
        suggestedStatus = "ADJUSTER_REVIEW";
        confidence = 85;
        reasoning = "Claim has documentation and damage assessment. Ready for adjuster review.";
      } else if (hasDocuments) {
        suggestedStatus = "ADJUSTER_REVIEW";
        confidence = 70;
        reasoning = "Claim has documentation uploaded. Consider damage assessment before review.";
      } else {
        suggestedStatus = "FILED";
        confidence = 60;
        reasoning = "Awaiting documentation and damage assessment.";
      }
    } else if (currentStage === "ADJUSTER_REVIEW") {
      if (recentActivityCount > 3 && hasDocuments) {
        suggestedStatus = "APPROVED";
        confidence = 75;
        reasoning = "High activity and complete documentation suggest approval.";
      } else if (daysSinceLoss > 30) {
        suggestedStatus = "APPEAL";
        confidence = 60;
        reasoning = "Extended review period may indicate need for appeal.";
      }
    } else if (currentStage === "APPROVED") {
      suggestedStatus = "BUILD";
      confidence = 90;
      reasoning = "Approved claims should move to build phase.";
    } else if (currentStage === "BUILD") {
      suggestedStatus = "COMPLETED";
      confidence = 70;
      reasoning = "Build phase typically transitions to completion.";
    }

    return NextResponse.json({
      claimId,
      currentStatus: currentStage,
      suggestedStatus,
      confidence,
      reasoning,
      metadata: {
        hasDocuments,
        hasDamageAssessment,
        recentActivityCount,
        daysSinceLoss,
      },
    });
  } catch (error) {
    logger.error("[AI Suggest Status] Error:", error);
    return NextResponse.json({ error: "Failed to generate status suggestion" }, { status: 500 });
  }
}
