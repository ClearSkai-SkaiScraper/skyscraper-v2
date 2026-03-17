/**
 * ClaimIQ Readiness API
 * GET /api/claims/[claimId]/claimiq/readiness
 *
 * Returns the complete readiness assessment for a claim —
 * which sections are auto-filled, which are partial, and what's missing.
 * Used by the ClaimIQ Dashboard to show pros exactly where their claim stands.
 */

import { NextRequest, NextResponse } from "next/server";

import { assessClaimReadiness, predictScoreImpacts } from "@/lib/claimiq/assembly-engine";
import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";

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

    const readiness = await assessClaimReadiness(claimId, orgId);
    const scoreImpacts = predictScoreImpacts(readiness);

    return NextResponse.json({ ...readiness, scoreImpacts });
  } catch (error) {
    logger.error("[CLAIMIQ_READINESS] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to assess claim readiness",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
