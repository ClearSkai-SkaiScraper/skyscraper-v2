export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

/**
 * POST /api/complaints
 * Submit a complaint about a user, employee, or company.
 * The complaint is stored as an activity_event so admins can view it.
 *
 * Body: { targetUserId, targetType, subject, description, priority? }
 */
export async function POST(req: NextRequest) {
  try {
    const orgCtx = await safeOrgContext();
    if (!orgCtx.ok || !orgCtx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetUserId, targetType, subject, description, priority } = body;

    if (!subject || !description) {
      return NextResponse.json({ error: "Subject and description are required" }, { status: 400 });
    }

    const complaint = await prisma.activity_events.create({
      data: {
        org_id: orgCtx.orgId,
        userId: orgCtx.userId || "system",
        event_type: "COMPLAINT_FILED",
        event_data: {
          subject,
          description,
          priority: priority || "medium",
          targetUserId: targetUserId || null,
          targetType: targetType || "general",
          status: "open",
          filedAt: new Date().toISOString(),
        },
      },
    });

    logger.info("[COMPLAINT_FILED]", {
      orgId: orgCtx.orgId,
      complaintId: complaint.id,
      targetUserId,
      targetType,
      subject,
    });

    return NextResponse.json(
      {
        ok: true,
        complaintId: complaint.id,
        message: "Complaint submitted successfully. An admin will review it shortly.",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("[COMPLAINT] Error", error);
    return NextResponse.json({ error: "Failed to submit complaint" }, { status: 500 });
  }
}

/**
 * GET /api/complaints
 * List complaints for admins.
 */
export async function GET() {
  try {
    const orgCtx = await safeOrgContext();
    if (!orgCtx.ok || !orgCtx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const complaints = await prisma.activity_events.findMany({
      where: {
        org_id: orgCtx.orgId,
        event_type: "COMPLAINT_FILED",
      },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    return NextResponse.json({
      complaints: complaints.map((c) => ({
        id: c.id,
        ...((c.event_data as Record<string, unknown>) || {}),
        createdAt: c.created_at,
        userId: c.userId,
      })),
    });
  } catch (error) {
    logger.error("[COMPLAINTS_LIST] Error", error);
    return NextResponse.json({ error: "Failed to list complaints" }, { status: 500 });
  }
}
