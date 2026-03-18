export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/weather/report/[reportId] — soft-delete / archive a weather report
// ─────────────────────────────────────────────────────────────────────────────

export const DELETE = withAuth(
  async (
    req: NextRequest,
    { userId, orgId }: { userId: string; orgId: string },
    routeParams: { params: Promise<{ reportId: string }> }
  ) => {
    const { reportId } = await routeParams.params;

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    try {
      // Verify the weather report belongs to this org
      const report = await prisma.weather_reports.findFirst({
        where: {
          id: reportId,
          claims: { orgId },
        },
        select: { id: true, claimId: true, address: true },
      });

      if (!report) {
        // Also check for standalone reports (no claim) created by this user in this org
        const standaloneReport = await prisma.weather_reports.findFirst({
          where: {
            id: reportId,
            createdById: userId,
            claimId: null,
          },
          select: { id: true, claimId: true, address: true },
        });

        if (!standaloneReport) {
          return NextResponse.json(
            { error: "Weather report not found or access denied" },
            { status: 404 }
          );
        }
      }

      // Delete linked generated artifacts (PDFs)
      const deletedArtifacts = await prisma.generatedArtifact.deleteMany({
        where: {
          orgId,
          type: "weather",
          metadata: {
            path: ["aiReportId"],
            equals: reportId,
          },
        },
      });

      // Delete the weather report itself
      await prisma.weather_reports.delete({
        where: { id: reportId },
      });

      logger.info("[WEATHER_REPORT_DELETE]", {
        reportId,
        orgId,
        userId,
        address: report?.address || "standalone",
        deletedArtifacts: deletedArtifacts.count,
      });

      return NextResponse.json({
        success: true,
        reportId,
        deletedArtifacts: deletedArtifacts.count,
      });
    } catch (error) {
      logger.error("[WEATHER_REPORT_DELETE] Failed:", { error, reportId, orgId });
      return NextResponse.json({ error: "Failed to delete weather report" }, { status: 500 });
    }
  }
);
