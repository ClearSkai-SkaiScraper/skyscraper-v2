export const dynamic = "force-dynamic";
/**
 * AI Orchestration API Endpoint
 *
 * GET /api/ai/orchestrate/[claimId]
 *
 * Returns comprehensive AI intelligence for a claim:
 * - Next recommended actions
 * - Approval likelihood and risk scores
 * - Explanation for recommendations
 * - Similar claims analysis
 * - Negotiation suggestions (if carrier set)
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { createAiConfig, withAiBilling } from "@/lib/ai/withAiBilling";

import { orchestrateClaim } from "@/lib/ai/orchestrator/orchestrateClaim";
import prisma from "@/lib/prisma";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { orchestrateQuerySchema, validateAIRequest } from "@/lib/validation/aiSchemas";

async function GET_INNER(
  request: NextRequest,
  ctx: {
    userId: string;
    orgId: string | null;
    feature: string;
    planType: string;
    betaMode: boolean;
  }
) {
  try {
    const { userId, orgId } = ctx;

    const identifier = getRateLimitIdentifier(userId, request);
    const allowed = await rateLimiters.ai.check(5, identifier);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const claimId = request.nextUrl.pathname.split("/").pop() || "";

    if (!orgId) {
      return NextResponse.json({ error: "Organization required" }, { status: 400 });
    }

    // Verify claim exists and belongs to org
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        orgId: orgId,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Get request type from query params
    const searchParams = request.nextUrl.searchParams;

    // ── Zod validation for query params ──
    const validation = validateAIRequest(orchestrateQuerySchema, {
      type: searchParams.get("type") || undefined,
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 422 }
      );
    }

    const requestType = validation.data.type;

    // Run orchestrator
    const result = await orchestrateClaim({
      claimId,
      orgId,
      requestType: requestType,
    });

    // Transform to match UI expectations
    const brainState = await prisma.claimBrainState.findFirst({
      where: { claimId },
      orderBy: { createdAt: "desc" },
    });

    const response = {
      state: brainState?.currentState || claim.status || null,
      nextActions: result.nextActions.map((action) => ({
        id: action.id || action.actionType,
        label: action.label,
        description: action.description,
        priority: action.priority,
      })),
      explanation: result.explanation.reasoning,
      intelligence: result.intelligence,
      similarClaims: result.similarClaims,
      negotiationSuggestions: result.negotiationSuggestions,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("AI orchestration error:", error);
    return NextResponse.json({ error: "Failed to orchestrate AI intelligence" }, { status: 500 });
  }
}

export const GET = withAiBilling(
  createAiConfig("ai_orchestrate", { costPerRequest: 30, planRequired: "pro" }),
  GET_INNER
);
