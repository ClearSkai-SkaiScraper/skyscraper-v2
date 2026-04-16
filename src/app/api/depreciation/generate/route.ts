/**
 * POST /api/depreciation/generate — Generate a depreciation package for a claim
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const limited = await checkRateLimit(`ai:depreciation:${orgId}`, "AI");
    if (!limited.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { claimId } = await req.json();
    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      include: {
        properties: true,
        depreciation_items: true,
        depreciation_invoices: { orderBy: { generated_at: "desc" }, take: 1 },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Calculate totals from line items
    const items = claim.depreciation_items || [];
    const totalRCV = items.reduce((sum, i) => sum + i.rcv, 0);
    const totalACV = items.reduce((sum, i) => sum + i.acv, 0);
    const totalDepreciationOwed = totalRCV - totalACV;

    // Build the package
    const now = new Date();
    const pkg = await prisma.depreciation_packages.create({
      data: {
        id: crypto.randomUUID(),
        claim_id: claimId,
        org_id: orgId,
        invoice: {
          items: items.map((i) => ({
            label: i.label,
            rcv: i.rcv,
            acv: i.acv,
            depreciation: i.rcv - i.acv,
          })),
          totalRCV,
          totalACV,
          totalDepreciation: totalDepreciationOwed,
        },
        contractor_statement: {
          generated: true,
          claimId,
          generatedAt: now.toISOString(),
        },
        homeowner_acceptance: {
          status: "pending",
          generatedAt: now.toISOString(),
        },
        total_depreciation_owed: totalDepreciationOwed,
        payments_received: 0,
        final_invoice_total: totalDepreciationOwed,
        status: "PENDING",
        generated_by: userId,
        created_at: now,
        updated_at: now,
      },
    });

    // Upsert tracker
    await prisma.depreciation_trackers.upsert({
      where: { claim_id: claimId },
      create: {
        id: crypto.randomUUID(),
        claim_id: claimId,
        org_id: orgId,
        total_depreciation: totalDepreciationOwed,
        status: "PENDING",
        timeline: [{ event: "Package generated", timestamp: now.toISOString() }],
        created_at: now,
        updated_at: now,
      },
      update: {
        total_depreciation: totalDepreciationOwed,
        updated_at: now,
      },
    });

    logger.info("[DEPRECIATION_GENERATE]", { orgId, claimId, packageId: pkg.id });

    return NextResponse.json({
      id: pkg.id,
      totalDepreciationOwed,
      totalRCV,
      totalACV,
      itemCount: items.length,
      status: "PENDING",
    });
  } catch (error) {
    logger.error("[DEPRECIATION_GENERATE]", error);
    return NextResponse.json({ error: "Failed to generate package" }, { status: 500 });
  }
});
