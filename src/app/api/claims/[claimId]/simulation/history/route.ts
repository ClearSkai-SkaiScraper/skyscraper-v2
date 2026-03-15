/**
 * Simulation History API
 * GET /api/claims/[claimId]/simulation/history
 *
 * Returns the history of all simulation runs for a claim —
 * tracks how the score changes over time as evidence is added.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
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

    const history = await prisma.simulation_history.findMany({
      where: { claimId, orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Compute deltas between runs
    const historyWithDeltas = history.map((entry, index) => {
      const prev = history[index + 1];
      return {
        ...entry,
        scoreDelta: prev ? (entry.approvalProbability ?? 0) - (prev.approvalProbability ?? 0) : 0,
        isImprovement: prev
          ? (entry.approvalProbability ?? 0) > (prev.approvalProbability ?? 0)
          : null,
      };
    });

    logger.info("[SIMULATION_HISTORY] Retrieved", {
      claimId,
      orgId,
      count: history.length,
    });

    return NextResponse.json({
      claimId,
      totalRuns: history.length,
      history: historyWithDeltas,
    });
  } catch (error) {
    logger.error("[SIMULATION_HISTORY] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve simulation history",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
