/**
 * VIN — Job Vendor Attachment API
 * POST /api/vin/job-attach — Attach vendor to a job/claim
 * GET  /api/vin/job-attach — Get vendors attached to a job/claim
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get("claimId");
    const jobId = searchParams.get("jobId");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (claimId) where.claimId = claimId;
    if (jobId) where.jobId = jobId;

    const attachments = await prisma.job_vendors.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        Vendor: {
          select: {
            id: true,
            slug: true,
            name: true,
            logo: true,
            primaryPhone: true,
            primaryEmail: true,
            emergencyPhone: true,
            tradeTypes: true,
            vendorTypes: true,
            category: true,
            website: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      attachments: attachments.map((a) => ({
        id: a.id,
        vendorId: a.vendorId,
        claimId: a.claimId,
        jobId: a.jobId,
        role: a.role,
        notes: a.notes,
        status: a.status,
        brochuresSent: a.brochuresSent,
        clientNotified: a.clientNotified,
        attachedBy: a.attachedBy,
        vendor: a.Vendor,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    logger.error("[VIN] Error fetching job vendors:", error);
    return NextResponse.json({ error: "Failed to fetch job vendors" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { vendorId, claimId, jobId, role, notes } = body;

    if (!vendorId) {
      return NextResponse.json({ error: "vendorId is required" }, { status: 400 });
    }

    const attachment = await prisma.job_vendors.create({
      data: {
        vendorId,
        claimId,
        jobId,
        orgId: ctx.orgId,
        role: role || "material_supplier",
        notes,
        attachedBy: ctx.userId,
        status: "active",
      },
    });

    // Create workflow event
    await prisma.vendor_workflow_events.create({
      data: {
        orgId: ctx.orgId,
        eventType: "vendor_attached",
        entityType: "job_vendor",
        entityId: attachment.id,
        claimId,
        jobId,
        payload: { vendorId, role },
      },
    });

    return NextResponse.json({ success: true, attachment });
  } catch (error) {
    logger.error("[VIN] Error attaching vendor:", error);
    return NextResponse.json({ error: "Failed to attach vendor" }, { status: 500 });
  }
}
