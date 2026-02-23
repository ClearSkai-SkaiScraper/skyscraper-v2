export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getRecentReportEvents } from "@/lib/metrics";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Map Clerk orgId to internal orgId
    const org = await prisma.org.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Fetch report
    const report = await prisma.ai_reports.findFirst({
      where: {
        id: params.id,
        orgId: org.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Fetch events for this report
    let events: any[] = [];
    try {
      const allEvents = await getRecentReportEvents(org.id, 100);
      events = allEvents.filter((e) => e.reportId === params.id);
    } catch (err) {
      logger.error("Events fetch error:", err);
      // Continue without events if report_events table doesn't exist yet
    }

    return NextResponse.json({
      report,
      events,
    });
  } catch (error) {
    logger.error("Report detail error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch report",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Map Clerk orgId to internal orgId
    const org = await prisma.org.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Verify report belongs to org
    const report = await prisma.ai_reports.findFirst({
      where: {
        id: params.id,
        orgId: org.id,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await prisma.ai_reports.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Report delete error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete report",
      },
      { status: 500 }
    );
  }
}
