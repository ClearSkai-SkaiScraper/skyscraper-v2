export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { getRecentReportEvents } from "@/lib/metrics";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, { orgId }, routeParams) => {
  try {
    const { reportId } = await routeParams.params;

    // Fetch report
    const report = await prisma.ai_reports.findFirst({
      where: { id: reportId, orgId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Fetch events for this report
    let events: any[] = [];
    try {
      const allEvents = await getRecentReportEvents(orgId, 100);
      events = allEvents.filter((e) => e.reportId === reportId);
    } catch (err) {
      logger.error("Events fetch error:", err);
    }

    return NextResponse.json({ report, events });
  } catch (error) {
    logger.error("Report detail error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch report" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (req: NextRequest, { orgId }, routeParams) => {
  try {
    const { reportId } = await routeParams.params;

    // Verify report belongs to org
    const report = await prisma.ai_reports.findFirst({
      where: { id: reportId, orgId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await prisma.ai_reports.delete({
      where: { id: reportId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Report delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete report" },
      { status: 500 }
    );
  }
});
