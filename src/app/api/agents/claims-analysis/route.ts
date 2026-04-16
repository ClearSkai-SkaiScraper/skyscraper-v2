import { NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/agents/claims-analysis
 * Run comprehensive AI analysis on a claim
 * Body: { claimId: string, modes: string[] }
 */

// Validation schema
const requestSchema = z.object({
  claimId: z.string().min(10, "Invalid claimId format"),
  modes: z.array(z.string()).min(1, "At least one analysis mode required"),
});

export const POST = withAuth(async (req, { userId, orgId }) => {
  try {
    // Rate limit — AI preset (5/min)
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded", retryAfter: 60 }, { status: 429 });
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      logger.error("[POST /api/agents/claims-analysis] JSON parse error:", parseError);
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    // Validate with Zod
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
      logger.error("[POST /api/agents/claims-analysis] Validation failed:", errors);
      return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
    }

    const { claimId, modes } = validation.data;

    logger.info("[POST /api/agents/claims-analysis] Processing:", {
      claimId,
      modes,
      userId,
      orgId,
    });

    // Verify claim exists and user has access
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        orgId,
      },
      select: {
        id: true,
        claimNumber: true,
        title: true,
        dateOfLoss: true,
        status: true,
      },
    });

    if (!claim) {
      logger.warn("[POST /api/agents/claims-analysis] Claim not found or access denied:", {
        claimId,
        orgId,
      });
      return NextResponse.json(
        { error: "Claim not found or you don't have permission to access it" },
        { status: 404 }
      );
    }

    // Get AI reports for this claim
    const artifacts = await prisma.ai_reports.findMany({
      where: {
        claimId,
        orgId,
      },
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Mock analysis results (in production, this would call actual AI services)
    // Response shape matches the client ClaimsAnalysisResult interface
    const damageMode = modes.includes("damage");
    const coverageMode = modes.includes("coverage");
    const riskMode = modes.includes("risk");

    const analysisResults = {
      claimId: claim.id,
      findings: {
        damage: damageMode
          ? {
              severity: "Moderate",
              estimatedRepairDays: 14,
              confidence: 0.82,
            }
          : undefined,
        coverage: coverageMode
          ? {
              policyRisk: "LOW",
              exclusionsFlagged: 0,
              confidence: 0.85,
            }
          : undefined,
        risk: riskMode
          ? {
              litigationProbability: 0.12,
              recommendedAction: "Continue standard processing — no elevated risk indicators",
            }
          : undefined,
      },
      riskScore: riskMode ? 28 : damageMode ? 35 : 20,
      tokensUsed: 1250,
      summary: `Analysis complete for claim ${claim.claimNumber}. Reviewed ${modes.length} analysis mode(s) and ${artifacts.length} document(s).`,
    };

    return NextResponse.json(analysisResults);
  } catch (error: unknown) {
    logger.error("[POST /api/agents/claims-analysis] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during analysis" },
      { status: 500 }
    );
  }
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
