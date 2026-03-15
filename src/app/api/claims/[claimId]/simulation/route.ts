/**
 * Claim Simulation API
 * GET /api/claims/[claimId]/simulation
 *
 * Runs the full claim simulation and returns an outcome prediction —
 * approval probability, per-category scores, positive/negative factors,
 * recommendations, and storm graph bonus.
 *
 * POST /api/claims/[claimId]/simulation
 * Same as GET but forces a fresh simulation (bypasses cache).
 */

import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { runClaimSimulation } from "@/lib/simulation/claim-simulation-engine";
import { analyzeEvidenceGaps } from "@/lib/simulation/evidence-gap-detector";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: NextRequest, { params }: { params: { claimId: string } }) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = ctx;
    const { claimId } = params;

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }

    // Run simulation + evidence gap analysis in parallel
    const [simulation, evidenceGaps] = await Promise.all([
      runClaimSimulation(claimId, orgId),
      analyzeEvidenceGaps(claimId, orgId),
    ]);

    logger.info("[SIMULATION_API] Simulation complete", {
      claimId,
      orgId,
      approvalProbability: simulation.approvalProbability,
      outcome: simulation.predictedOutcome,
    });

    return NextResponse.json({
      simulation,
      evidenceGaps,
    });
  } catch (error) {
    logger.error("[SIMULATION_API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to run claim simulation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest, { params }: { params: { claimId: string } }) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = ctx;
    const { claimId } = params;

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }

    // Force fresh simulation (no cache)
    const [simulation, evidenceGaps] = await Promise.all([
      runClaimSimulation(claimId, orgId),
      analyzeEvidenceGaps(claimId, orgId),
    ]);

    logger.info("[SIMULATION_API] Fresh simulation forced", {
      claimId,
      orgId,
      approvalProbability: simulation.approvalProbability,
    });

    return NextResponse.json({
      simulation,
      evidenceGaps,
      refreshed: true,
    });
  } catch (error) {
    logger.error("[SIMULATION_API] POST Error:", error);
    return NextResponse.json(
      {
        error: "Failed to run claim simulation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
