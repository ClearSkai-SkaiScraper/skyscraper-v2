/**
 * Simulation History API
 * GET /api/claims/[claimId]/simulation/history
 *
 * Returns the history of all simulation runs for a claim —
 * tracks how the score changes over time as evidence is added.
 */

import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withAuth(
  async (
    _request: NextRequest,
    { orgId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;

      if (!claimId) {
        return NextResponse.json({ error: "claimId is required" }, { status: 400 });
      }

      await getOrgClaimOrThrow(orgId, claimId);

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
);
