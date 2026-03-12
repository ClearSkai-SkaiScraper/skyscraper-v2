/**
 * POST /api/carrier/export
 *
 * Generate carrier-formatted export packages (Xactimate, Symbility, etc.)
 * Wires up the Carrier Exports page (/ai/exports).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { claimId, carrier, format } = body;

    if (!claimId || !carrier || !format) {
      return NextResponse.json(
        { error: "claimId, carrier, and format are required" },
        { status: 400 }
      );
    }

    // Verify claim belongs to this org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId: ctx.orgId },
      select: {
        id: true,
        claimNumber: true,
        title: true,
        damageType: true,
        dateOfLoss: true,
        insured_name: true,
        policy_number: true,
        carrier: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Build a carrier-formatted export summary
    const exportData = {
      claimNumber: claim.claimNumber,
      insuredName: claim.insured_name || "N/A",
      policyNumber: claim.policy_number || "N/A",
      dateOfLoss: claim.dateOfLoss?.toISOString() || "N/A",
      damageType: claim.damageType || "N/A",
      carrier: carrier,
      format: format,
      exportedAt: new Date().toISOString(),
    };

    logger.info("[CARRIER_EXPORT] Export generated", {
      orgId: ctx.orgId,
      claimId,
      carrier,
      format,
    });

    return NextResponse.json({
      success: true,
      exportUrl: null, // TODO: Generate actual file URL when PDF export is wired
      exportData,
      message: `${carrier} export in ${format} format generated for claim ${claim.claimNumber}`,
    });
  } catch (error) {
    logger.error("[CARRIER_EXPORT] Error:", error);
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}
