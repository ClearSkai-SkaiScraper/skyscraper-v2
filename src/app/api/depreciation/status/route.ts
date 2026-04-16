/**
 * GET /api/depreciation/status?claimId=xxx — Fetch depreciation summary for a claim
 * POST /api/depreciation/status — Update depreciation status (mark_requested, etc.)
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const claimId = req.nextUrl.searchParams.get("claimId");
    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: { id: true },
    });
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const tracker = await prisma.depreciation_trackers.findUnique({
      where: { claim_id: claimId },
    });

    if (!tracker) {
      return NextResponse.json({ exists: false });
    }

    const payments = await prisma.claim_payments.findMany({
      where: { claim_id: claimId },
      orderBy: { paid_at: "desc" },
    });

    const summary = {
      totalDepreciation: Number(tracker.total_depreciation),
      requestedAmount: Number(tracker.requested_amount || 0),
      approvedAmount: Number(tracker.approved_amount || 0),
      issuedAmount: Number(tracker.issued_amount || 0),
      receivedAmount: Number(tracker.received_amount || 0),
      outstandingAmount: Number(tracker.total_depreciation) - Number(tracker.received_amount || 0),
      status: tracker.status,
      lastUpdatedAt: tracker.updated_at?.toISOString(),
      daysInCurrentStatus: Math.floor(
        (Date.now() - new Date(tracker.updated_at || tracker.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      timeline: tracker.timeline as Array<{ event: string; timestamp: string; amount?: number }>,
    };

    return NextResponse.json({
      exists: true,
      summary,
      payments: payments.map((p) => ({
        id: p.id,
        type: p.type,
        amount: p.amount_cents / 100,
        status: "paid",
        receivedAt: p.paid_at?.toISOString(),
        checkNumber: p.check_number,
      })),
    });
  } catch (error) {
    logger.error("[DEPRECIATION_STATUS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const { action, claimId, requestedAmount, sentTo } = body;

    if (!claimId || !action) {
      return NextResponse.json({ error: "claimId and action required" }, { status: 400 });
    }

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: { id: true },
    });
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const now = new Date();

    if (action === "mark_requested") {
      const tracker = await prisma.depreciation_trackers.upsert({
        where: { claim_id: claimId },
        create: {
          id: crypto.randomUUID(),
          claim_id: claimId,
          org_id: orgId,
          total_depreciation: requestedAmount || 0,
          requested_amount: requestedAmount || 0,
          status: "REQUESTED",
          requested_at: now,
          timeline: [
            {
              event: "Depreciation requested",
              timestamp: now.toISOString(),
              amount: requestedAmount,
            },
          ],
          created_at: now,
          updated_at: now,
        },
        update: {
          requested_amount: requestedAmount || undefined,
          status: "REQUESTED",
          requested_at: now,
          updated_at: now,
        },
      });

      return NextResponse.json({ success: true, tracker });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    logger.error("[DEPRECIATION_STATUS_POST]", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
});
