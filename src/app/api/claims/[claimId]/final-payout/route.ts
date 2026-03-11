/**
 * Final Payout API - GET/PATCH
 * GET: Retrieve final payout status, depreciation items, supplements, financials
 * PATCH: Update payout status, line items, or certifications
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { requireAuth } from "@/lib/auth/requireAuth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Status stages for final payout
const PAYOUT_STAGES = [
  "work_in_progress",
  "work_completed",
  "docs_uploaded",
  "invoice_generated",
  "submitted",
  "under_review",
  "approved",
  "paid",
] as const;

type PayoutStatus = (typeof PAYOUT_STAGES)[number];

/**
 * GET /api/claims/[claimId]/final-payout
 * Returns all data needed for the Final Payout page
 */
export async function GET(request: NextRequest, { params }: { params: { claimId: string } }) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { orgId, userId } = auth;

    const { claimId } = params;

    // Get claim with all related data
    const claim = await prisma.claims.findUnique({
      where: { id: claimId, orgId },
      include: {
        properties: true,
        depreciation_items: true,
        depreciation_invoices: true,
        supplements: {
          where: { status: { not: "deleted" } },
          orderBy: { created_at: "desc" },
        },
        reports: {
          where: { type: { in: ["FINAL_PAYOUT_PACKET", "DEPRECIATION"] } },
          orderBy: { createdAt: "desc" },
        },
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Get depreciation tracker for status
    const tracker = await prisma.depreciation_trackers.findUnique({
      where: { claim_id: claimId },
    });

    // Calculate financials
    const rcvTotal = claim.estimatedValue || 0;
    const approvedValue = claim.approvedValue || rcvTotal;
    const deductible = claim.deductible || 1000;

    // Calculate depreciation from items
    const depreciationItems = claim.depreciation_items.map((item) => ({
      id: item.id,
      description: item.label,
      rcv: item.rcv,
      acv: item.acv,
      depreciation: item.rcv - item.acv,
      age: item.age,
      expectedLife: item.expectedLife,
      completed: true, // Track via job status
      recoverable: true,
    }));

    const totalDepreciation = depreciationItems.reduce(
      (sum, item) => sum + (item.rcv - item.acv),
      0
    );
    const acvPaid = approvedValue - totalDepreciation;

    // Calculate supplements
    const approvedSupplements = claim.supplements
      .filter((s) => s.status === "approved")
      .reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    // Determine payout status from tracker or job status
    let payoutStatus: PayoutStatus = "work_in_progress";
    if (tracker?.status) {
      const statusMap: Record<string, PayoutStatus> = {
        PENDING: "work_in_progress",
        REQUESTED: "submitted",
        APPROVED: "approved",
        ISSUED: "approved",
        RECEIVED: "paid",
        CLOSED: "paid",
        DELAYED: "under_review",
        DENIED: "under_review",
      };
      payoutStatus = statusMap[tracker.status] || "work_in_progress";
    }

    // Check if we have a job completion
    const job = claim.jobs[0];
    if (job?.actualEnd) {
      payoutStatus = payoutStatus === "work_in_progress" ? "work_completed" : payoutStatus;
    }

    // Check for generated packets via reports
    const finalPackets = claim.reports;
    if (finalPackets.length > 0 && ["docs_uploaded", "work_completed"].includes(payoutStatus)) {
      payoutStatus = "invoice_generated";
    }

    // Build response
    const response = {
      claim: {
        id: claim.id,
        claimNumber: claim.claimNumber,
        title: claim.title,
        status: claim.status,
        carrier: claim.carrier,
        policyNumber: claim.policy_number,
        dateOfLoss: claim.dateOfLoss?.toISOString(),
        insured_name: claim.insured_name,
        homeownerEmail: claim.homeowner_email,
        adjusterName: claim.adjusterName,
        adjusterEmail: claim.adjusterEmail,
        adjusterPhone: claim.adjusterPhone,
        damageType: claim.damageType,
        propertyAddress: claim.properties?.street,
        propertyCity: claim.properties?.city,
        propertyState: claim.properties?.state,
        deductible,
        acvPaid,
      },
      payoutStatus,
      tracker: tracker
        ? {
            id: tracker.id,
            status: tracker.status,
            totalDepreciation: Number(tracker.total_depreciation),
            requestedAmount: tracker.requested_amount ? Number(tracker.requested_amount) : null,
            approvedAmount: tracker.approved_amount ? Number(tracker.approved_amount) : null,
            receivedAmount: tracker.received_amount ? Number(tracker.received_amount) : null,
            requestedAt: tracker.requested_at?.toISOString(),
            approvedAt: tracker.approved_at?.toISOString(),
            receivedAt: tracker.received_at?.toISOString(),
            timeline: tracker.timeline,
            notes: tracker.notes,
          }
        : null,
      financials: {
        rcvTotal,
        approvedValue,
        deductible,
        acvPaid,
        totalDepreciation,
        approvedSupplements,
        totalDue: totalDepreciation + approvedSupplements,
      },
      lineItems: depreciationItems,
      supplements: claim.supplements.map((s) => ({
        id: s.id,
        description: s.notes || `Supplement ${s.id.slice(0, 8)}`,
        amount: Number(s.total) || 0,
        status: s.status,
        category: s.loss_type,
        createdAt: s.created_at?.toISOString(),
      })),
      documents: finalPackets.map((d) => ({
        id: d.id,
        name: d.title,
        url: d.pdfUrl,
        type: d.type,
        createdAt: d.createdAt?.toISOString(),
      })),
      completionPhotos: await (async () => {
        const photos = await prisma.completion_photos.findMany({
          where: { claim_id: claimId, org_id: orgId },
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            url: true,
            category: true,
            file_name: true,
            created_at: true,
          },
        });
        return photos.map((p) => ({
          id: p.id,
          url: p.url,
          type: "completion",
          category: p.category,
          fileName: p.file_name,
          createdAt: p.created_at?.toISOString() ?? null,
        }));
      })()
      job: job
        ? {
            id: job.id,
            status: job.status,
            startDate: job.actualStart?.toISOString(),
            completionDate: job.actualEnd?.toISOString(),
          }
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("[GET /api/claims/[claimId]/final-payout] Error:", error);
    return NextResponse.json({ error: "Failed to fetch final payout data" }, { status: 500 });
  }
}

/**
 * PATCH /api/claims/[claimId]/final-payout
 * Update payout status or line items
 */
export async function PATCH(request: NextRequest, { params }: { params: { claimId: string } }) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { orgId, userId } = auth;

    const { claimId } = params;
    const body = await request.json();
    const { status, lineItems, certificationSigned, notes } = body;

    // Verify claim exists and belongs to org
    const claim = await prisma.claims.findUnique({
      where: { id: claimId, orgId },
      select: { id: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Update or create depreciation tracker
    const trackerData: any = {
      updated_at: new Date(),
    };

    if (status) {
      const statusMap: Record<PayoutStatus, string> = {
        work_in_progress: "PENDING",
        work_completed: "PENDING",
        docs_uploaded: "PENDING",
        invoice_generated: "PENDING",
        submitted: "REQUESTED",
        under_review: "DELAYED",
        approved: "APPROVED",
        paid: "RECEIVED",
      };
      trackerData.status = statusMap[status as PayoutStatus] || "PENDING";

      if (status === "submitted") {
        trackerData.requested_at = new Date();
      } else if (status === "approved") {
        trackerData.approved_at = new Date();
      } else if (status === "paid") {
        trackerData.received_at = new Date();
      }
    }

    if (notes) {
      trackerData.notes = notes;
    }

    const tracker = await prisma.depreciation_trackers.upsert({
      where: { claim_id: claimId },
      create: {
        id: `dep_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
        claim_id: claimId,
        org_id: orgId,
        total_depreciation: 0,
        status: "PENDING",
        created_at: new Date(),
        updated_at: new Date(),
        ...trackerData,
      },
      update: trackerData,
    });

    // Update line items if provided
    if (lineItems && Array.isArray(lineItems)) {
      for (const item of lineItems) {
        if (item.id) {
          await prisma.depreciation_items.update({
            where: { id: item.id },
            data: {
              label: item.description,
              rcv: item.rcv,
              acv: item.acv,
              updatedAt: new Date(),
            },
          });
        }
      }
    }

    // Add timeline event
    const timelineEvent = {
      type: "status_change",
      status: trackerData.status,
      timestamp: new Date().toISOString(),
      userId,
      notes: notes || `Status updated to ${status}`,
    };

    const currentTimeline = (tracker.timeline as any[]) || [];
    await prisma.depreciation_trackers.update({
      where: { claim_id: claimId },
      data: {
        timeline: [...currentTimeline, timelineEvent],
      },
    });

    return NextResponse.json({
      success: true,
      tracker: {
        id: tracker.id,
        status: tracker.status,
      },
    });
  } catch (error) {
    logger.error("[PATCH /api/claims/[claimId]/final-payout] Error:", error);
    return NextResponse.json({ error: "Failed to update final payout" }, { status: 500 });
  }
}
