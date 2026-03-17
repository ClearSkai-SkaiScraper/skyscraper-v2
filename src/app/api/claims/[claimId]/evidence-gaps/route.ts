/**
 * Evidence Gap API — Standalone endpoint
 *
 * GET /api/claims/[claimId]/evidence-gaps
 *
 * Returns missing evidence opportunities and their estimated
 * impact on the simulation score.
 */

import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { analyzeEvidenceGaps } from "@/lib/simulation/evidence-gap-detector";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withAuth(
  async (_req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    const { claimId } = await routeParams.params;

    try {
      await getOrgClaimOrThrow(orgId, claimId);
      const gaps = await analyzeEvidenceGaps(claimId, orgId);
      return NextResponse.json(gaps);
    } catch (err) {
      if (err instanceof OrgScopeError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      logger.error("[EVIDENCE_GAPS_API] Failed:", err);
      return NextResponse.json({ error: "Failed to detect evidence gaps" }, { status: 500 });
    }
  }
);
