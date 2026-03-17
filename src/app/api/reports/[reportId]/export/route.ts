export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// EXPORT API ROUTE - /api/reports/[reportId]/export
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  fetchReportBranding,
  fetchReportClaimData,
  fetchReportCodes,
  fetchReportLineItems,
  fetchReportPhotos,
  fetchReportSupplements,
  fetchReportWeather,
} from "@/modules/reports/core/DataProviders";
import { exportReport } from "@/modules/reports/export/orchestrator";
import type { ExportFormat, ReportContext, SectionKey } from "@/modules/reports/types";

export const POST = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const { reportId } = await routeParams.params;

    // Look up the report to get its claimId
    const report = await prisma.reports.findFirst({
      where: { id: reportId, orgId },
      select: { claimId: true },
    });

    if (!report?.claimId) {
      return NextResponse.json(
        { error: "Report not found or has no linked claim" },
        { status: 404 }
      );
    }

    const claimId = report.claimId;

    // Parse request body
    const body = await req.json();
    const { format, sections } = body as {
      format: ExportFormat;
      sections: SectionKey[];
    };

    if (!format || !sections || !Array.isArray(sections)) {
      return NextResponse.json(
        { error: "Invalid request: format and sections required" },
        { status: 400 }
      );
    }

    // Build report context with REAL DB queries
    const [branding, metadata, weather, photos, lineItems, codes, supplements] = await Promise.all([
      fetchReportBranding(orgId),
      fetchReportClaimData(reportId, claimId, userId),
      fetchReportWeather(claimId),
      fetchReportPhotos(claimId, orgId),
      fetchReportLineItems(claimId),
      fetchReportCodes(orgId),
      fetchReportSupplements(claimId),
    ]);

    const context: ReportContext = {
      reportId,
      orgId,
      userId,
      branding,
      metadata,
      weather,
      photos,
      lineItems,
      codes,
      supplements,
      executiveSummary: `This report documents storm damage to the property at ${metadata.propertyAddress}. All findings are based on field inspection and weather verification data.`,
      adjusterNotes: "",
    };

    // Export the report
    const result = await exportReport({
      reportId,
      userId,
      format,
      sections,
      context,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Export failed" }, { status: 500 });
    }

    // Return file as blob
    if (result.buffer) {
      const contentTypes: Record<string, string> = {
        pdf: "application/pdf",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        zip: "application/zip",
      };

      return new NextResponse(new Uint8Array(result.buffer), {
        headers: {
          "Content-Type": contentTypes[format] || "application/octet-stream",
          "Content-Disposition": `attachment; filename="contractor-packet-${reportId}.${format}"`,
        },
      });
    }

    return NextResponse.json({ error: "No file generated" }, { status: 500 });
  } catch (error) {
    logger.error("[Export API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
