/**
 * Carrier Playbook API — GET + POST
 *
 * GET  → Retrieve all carrier playbooks for the org
 * POST → Rebuild all playbooks (triggers full recompute)
 */

import { buildCarrierPlaybooks } from "@/lib/carrier/playbook-engine";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const ctx = await safeOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = ctx;

  try {
    const playbooks = await prisma.carrier_playbooks.findMany({
      where: { orgId },
      orderBy: { totalClaims: "desc" },
    });

    return NextResponse.json({
      playbooks: playbooks.map((p) => ({
        carrierName: p.carrierName,
        totalClaims: p.totalClaims,
        approvedCount: p.approvedCount,
        partialCount: p.partialCount,
        deniedCount: p.deniedCount,
        approvalRate: p.approvalRate,
        avgDaysToResolve: p.avgDaysToResolve,
        avgSupplementRounds: p.avgSupplementRounds,
        supplementWinRate: p.supplementWinRate,
        commonDenialReasons: p.commonDenialReasons,
        keyEvidenceNeeded: p.keyEvidenceNeeded,
        carrierBehaviorNotes: p.carrierBehaviorNotes,
        preferredStrategy: p.preferredStrategy,
        typicalResponse: p.typicalResponse,
        computedAt: p.computedAt,
      })),
      totalCarriers: playbooks.length,
    });
  } catch (err) {
    logger.error("[CARRIER_PLAYBOOK_API] GET failed:", err);
    return NextResponse.json({ error: "Failed to fetch playbooks" }, { status: 500 });
  }
}

export async function POST() {
  const ctx = await safeOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orgId } = ctx;

  try {
    const result = await buildCarrierPlaybooks(orgId);
    return NextResponse.json(result);
  } catch (err) {
    logger.error("[CARRIER_PLAYBOOK_API] POST failed:", err);
    return NextResponse.json({ error: "Failed to build playbooks" }, { status: 500 });
  }
}
