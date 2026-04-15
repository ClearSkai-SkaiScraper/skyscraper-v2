export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

/**
 * POST /api/portal/complaints
 * Client submits a complaint about a pro/employee/company.
 * Stored as activity_event in the target company's org so their admin sees it.
 *
 * Body: { targetOrgId?, targetProId?, subject, description }
 */
export async function POST(req: NextRequest) {
  try {
    const orgCtx = await safeOrgContext();
    if (!orgCtx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetOrgId, targetProId, subject, description } = body;

    if (!subject || !description) {
      return NextResponse.json({ error: "Subject and description are required" }, { status: 400 });
    }

    // Store in the target org so their admin sees it
    const orgId = targetOrgId || orgCtx.orgId || "unknown";

    const complaint = await prisma.activity_events.create({
      data: {
        org_id: orgId,
        userId: orgCtx.userId || "anonymous-client",
        event_type: "CLIENT_COMPLAINT_FILED",
        event_data: {
          subject,
          description,
          targetProId: targetProId || null,
          targetOrgId: targetOrgId || null,
          filedBy: orgCtx.userId || "anonymous",
          filedByType: "client",
          status: "open",
          filedAt: new Date().toISOString(),
        },
      },
    });

    logger.info("[PORTAL_COMPLAINT_FILED]", {
      complaintId: complaint.id,
      targetOrgId: orgId,
      targetProId,
      subject,
    });

    return NextResponse.json(
      {
        ok: true,
        complaintId: complaint.id,
        message: "Your complaint has been submitted. The company admin will be notified.",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("[PORTAL_COMPLAINT] Error", error);
    return NextResponse.json({ error: "Failed to submit complaint" }, { status: 500 });
  }
}
