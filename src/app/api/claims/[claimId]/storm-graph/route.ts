/**
 * Storm Graph API — Claim Corroboration
 * GET /api/claims/[claimId]/storm-graph
 *
 * Returns the full Storm Graph analysis for a claim — nearby clusters,
 * corroboration score, damage patterns, geographic density, and timeline.
 */

import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { buildStormGraph } from "@/lib/storm-graph";
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

    const graph = await buildStormGraph(claimId, orgId);

    logger.info("[STORM_GRAPH_API] Graph built", {
      claimId,
      orgId,
      corroboration: graph.corroborationScore,
      clusters: graph.stormClusters.length,
    });

    return NextResponse.json(graph);
  } catch (error) {
    logger.error("[STORM_GRAPH_API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to build storm graph",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
