/**
 * Evidence Gap API — Standalone endpoint
 *
 * GET /api/claims/[claimId]/evidence-gaps
 *
 * Returns missing evidence opportunities and their estimated
 * impact on the simulation score.
 */

import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { analyzeEvidenceGaps } from "@/lib/simulation/evidence-gap-detector";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const ctx = await safeOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { claimId } = await params;

  try {
    const gaps = await analyzeEvidenceGaps(claimId, ctx.orgId);
    return NextResponse.json(gaps);
  } catch (err) {
    logger.error("[EVIDENCE_GAPS_API] Failed:", err);
    return NextResponse.json({ error: "Failed to detect evidence gaps" }, { status: 500 });
  }
}
