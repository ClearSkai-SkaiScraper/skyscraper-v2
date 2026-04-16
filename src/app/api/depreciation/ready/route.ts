/**
 * GET /api/depreciation/ready?jobId=xxx — Check depreciation readiness for a job/claim
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    // jobId could be a claim or project — check both
    const claim = await prisma.claims.findFirst({
      where: { id: jobId, orgId },
      select: {
        id: true,
        carrier: true,
        status: true,
        propertyId: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const tracker = await prisma.depreciation_trackers.findUnique({
      where: { claim_id: claim.id },
    });

    const missing: string[] = [];
    if (!claim.carrier) missing.push("Insurance carrier not set");

    // Check if there are line items
    const itemCount = await prisma.depreciation_items.count({
      where: { claimId: claim.id },
    });
    if (itemCount === 0) missing.push("No depreciation line items");

    // Check for invoice
    const invoiceCount = await prisma.depreciation_invoices.count({
      where: { claim_id: claim.id },
    });
    if (invoiceCount === 0) missing.push("No contractor invoice");

    const status = tracker?.status || (missing.length === 0 ? "ready" : "not_ready");

    return NextResponse.json({
      status,
      ready: missing.length === 0,
      missing,
      carrier: claim.carrier,
      filedAt: tracker?.requested_at?.toISOString(),
      nudgeInDays:
        tracker?.status === "REQUESTED" && tracker.requested_at
          ? Math.max(0, 14 - Math.floor((Date.now() - tracker.requested_at.getTime()) / 86400000))
          : undefined,
    });
  } catch (error) {
    logger.error("[DEPRECIATION_READY]", error);
    return NextResponse.json({ error: "Failed to check readiness" }, { status: 500 });
  }
});
