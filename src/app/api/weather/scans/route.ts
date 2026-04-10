/**
 * GET  /api/weather/scans?claimId=xxx — List saved weather scans for a claim
 *
 * Returns all quick_dol and full_report weather_reports for the claim,
 * organized by peril category with radar station info.
 */
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: {
        id: true,
        dateOfLoss: true,
        properties: { select: { street: true, city: true, state: true, zipCode: true } },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Fetch all scans for this claim
    const scans = await prisma.weather_reports.findMany({
      where: { claimId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        mode: true,
        address: true,
        dol: true,
        lossType: true,
        primaryPeril: true,
        confidence: true,
        candidateDates: true,
        events: true,
        globalSummary: true,
        createdAt: true,
        periodFrom: true,
        periodTo: true,
        users: {
          select: { name: true },
        },
      },
    });

    // Categorize by peril type
    const categorized = {
      hail: scans.filter((s) => {
        const peril = (s.primaryPeril || s.lossType || "").toLowerCase();
        return peril.includes("hail");
      }),
      wind: scans.filter((s) => {
        const peril = (s.primaryPeril || s.lossType || "").toLowerCase();
        return peril.includes("wind") && !peril.includes("hail");
      }),
      hailAndWind: scans.filter((s) => {
        const peril = (s.primaryPeril || s.lossType || "").toLowerCase();
        return peril.includes("hail") && peril.includes("wind");
      }),
      tropical: scans.filter((s) => {
        const peril = (s.primaryPeril || s.lossType || "").toLowerCase();
        return (
          peril.includes("tropical") || peril.includes("hurricane") || peril.includes("typhoon")
        );
      }),
      water: scans.filter((s) => {
        const peril = (s.primaryPeril || s.lossType || "").toLowerCase();
        return peril.includes("water") || peril.includes("flood") || peril.includes("rain");
      }),
      other: scans.filter((s) => {
        const peril = (s.primaryPeril || s.lossType || "").toLowerCase();
        return (
          !peril ||
          (!peril.includes("hail") &&
            !peril.includes("wind") &&
            !peril.includes("tropical") &&
            !peril.includes("hurricane") &&
            !peril.includes("water") &&
            !peril.includes("flood") &&
            !peril.includes("rain"))
        );
      }),
    };

    // Fetch PDF URLs for full_report mode weather reports from GeneratedArtifact
    const fullReports = scans.filter((s) => s.mode === "full_report");
    const weatherReportsWithPdfs: Array<{
      id: string;
      reportId: string;
      address: string;
      dol: Date | null;
      primaryPeril: string | null;
      summary: string | null;
      pdfUrl: string | null;
      createdAt: Date;
    }> = [];

    if (fullReports.length > 0) {
      // Look up GeneratedArtifact records for these weather reports
      // Query by claimId OR by orgId (fallback if claimId wasn't saved correctly)
      const artifacts = await prisma.generatedArtifact.findMany({
        where: {
          claimId,
          type: "weather",
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileUrl: true,
          title: true,
          createdAt: true,
          metadata: true,
        },
      });

      logger.debug(
        `[WEATHER_SCANS] Found ${artifacts.length} weather artifacts for claim ${claimId}`
      );
      if (artifacts.length > 0) {
        logger.debug(`[WEATHER_SCANS] Artifact IDs: ${artifacts.map((a) => a.id).join(", ")}`);
      }

      // Map full reports with their PDF URLs
      for (const report of fullReports) {
        // Find matching artifact by aiReportId in metadata (primary), or fallback to time/title match
        const matchingArtifact = artifacts.find((a) => {
          // Primary: Match by aiReportId stored in metadata
          const meta = a.metadata as { aiReportId?: string } | null;
          if (meta?.aiReportId === report.id) {
            logger.debug(
              `[WEATHER_SCANS] ✅ Found artifact by aiReportId match: ${a.id} -> ${report.id}`
            );
            return true;
          }
          // Fallback: time proximity (within 2 minutes) or address match in title
          const timeMatch =
            Math.abs(new Date(a.createdAt).getTime() - new Date(report.createdAt).getTime()) <
            120000;
          const titleMatch = a.title?.toLowerCase().includes((report.address || "").toLowerCase());
          if (timeMatch || titleMatch) {
            logger.debug(
              `[WEATHER_SCANS] ✅ Found artifact by fallback (time=${timeMatch}, title=${titleMatch}): ${a.id}`
            );
            return true;
          }
          return false;
        });

        if (!matchingArtifact) {
          logger.warn(
            `[WEATHER_SCANS] ⚠️ No artifact found for report ${report.id} (address: ${report.address})`
          );
        }

        weatherReportsWithPdfs.push({
          id: report.id,
          reportId: report.id,
          address: report.address || "",
          dol: report.dol,
          primaryPeril: report.primaryPeril,
          summary:
            typeof report.globalSummary === "object" && report.globalSummary !== null
              ? (report.globalSummary as { overallAssessment?: string }).overallAssessment || null
              : null,
          pdfUrl: matchingArtifact?.fileUrl || null,
          createdAt: report.createdAt,
        });
      }
    }

    return NextResponse.json({
      scans,
      categorized,
      weatherReports: weatherReportsWithPdfs,
      currentDol: claim.dateOfLoss,
      claimAddress: claim.properties
        ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state} ${claim.properties.zipCode}`
        : null,
      claimProperty: claim.properties
        ? {
            street: claim.properties.street || null,
            city: claim.properties.city || null,
            state: claim.properties.state || null,
            zipCode: claim.properties.zipCode || null,
          }
        : null,
      totalScans: scans.length,
    });
  } catch (err) {
    logger.error("[WEATHER_SCANS] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch scans" }, { status: 500 });
  }
});
