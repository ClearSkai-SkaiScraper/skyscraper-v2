export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/dashboard/weather-kpis
 * Weather intelligence KPIs for the dashboard
 */

import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    // Get date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Count active storms (recent storm_events)
    const activeStorms = await prisma.storm_events.count({
      where: {
        orgId,
        status: { in: ["DETECTED", "ACTIVE", "MONITORING"] },
        stormEndTime: { gte: new Date() },
      },
    });

    // 2. Get storm alerts
    const stormAlerts = await prisma.storm_events.findMany({
      where: {
        orgId,
        status: { in: ["DETECTED", "ACTIVE"] },
        stormStartTime: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        eventType: true,
        severity: true,
        impactSummary: true,
        affectedCities: true,
        stormEndTime: true,
      },
      orderBy: { detectedAt: "desc" },
      take: 5,
    });

    // 3. Recent weather events by type
    const recentStormEvents = await prisma.storm_events.findMany({
      where: {
        orgId,
        stormStartTime: { gte: thirtyDaysAgo },
      },
      select: {
        eventType: true,
        hailSizeMax: true,
        windSpeedMax: true,
        tornadoRating: true,
      },
    });

    let recentHailEvents = 0;
    let recentWindEvents = 0;
    let recentTornadoes = 0;

    for (const event of recentStormEvents) {
      if (event.hailSizeMax && Number(event.hailSizeMax) > 0) recentHailEvents++;
      if (event.windSpeedMax && event.windSpeedMax > 50) recentWindEvents++;
      if (event.tornadoRating) recentTornadoes++;
    }

    // 4. Claims with weather verification
    const recentClaims = await prisma.claims.count({
      where: {
        orgId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Claims with storm_evidence records
    const claimsWithEvidence = await prisma.storm_evidence.count({
      where: {
        orgId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Claims with weather_reports
    const claimsWithWeatherReports = await prisma.weather_reports.groupBy({
      by: ["claimId"],
      where: {
        claimId: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const claimsWithWeatherVerified = Math.max(claimsWithEvidence, claimsWithWeatherReports.length);

    // 5. DOL confidence breakdown from storm_evidence
    const dolConfidence = await prisma.storm_evidence.groupBy({
      by: ["evidenceGrade"],
      where: { orgId },
      _count: true,
    });

    let dolConfidenceHigh = 0;
    let dolConfidenceMedium = 0;
    let dolConfidenceLow = 0;

    for (const group of dolConfidence) {
      const count = group._count;
      if (group.evidenceGrade === "A" || group.evidenceGrade === "B") {
        dolConfidenceHigh += count;
      } else if (group.evidenceGrade === "C") {
        dolConfidenceMedium += count;
      } else {
        dolConfidenceLow += count;
      }
    }

    // Claims needing DOL review (low confidence or no evidence)
    const claimsNeedingDOLReview = dolConfidenceLow;

    // 6. Average correlation score
    const evidenceWithScores = await prisma.storm_evidence.aggregate({
      where: {
        orgId,
        overallScore: { gt: 0 },
      },
      _avg: {
        overallScore: true,
        correlationScore: true,
      },
    });

    const averageCorrelationScore =
      evidenceWithScores._avg.correlationScore ?? evidenceWithScores._avg.overallScore ?? 0;

    // 7. Affected ZIP codes from active storms
    const affectedZipCodes: string[] = [];
    let highRiskProperties = 0;

    for (const storm of stormAlerts) {
      if (storm.affectedCities && Array.isArray(storm.affectedCities)) {
        // Extract ZIP codes if stored in affectedCities
      }
    }

    // Count high-risk properties from recent storms
    const propertyImpacts = await prisma.property_impacts.aggregate({
      where: {
        orgId,
        createdAt: { gte: thirtyDaysAgo },
        riskLevel: "HIGH",
      },
      _count: true,
    });

    highRiskProperties = propertyImpacts._count ?? 0;

    // Format storm alerts for response
    const formattedAlerts = stormAlerts.map((alert) => ({
      id: alert.id,
      type: alert.eventType,
      severity: mapSeverity(alert.severity),
      headline: alert.impactSummary,
      affectedArea: formatAffectedArea(alert.affectedCities),
      expires: alert.stormEndTime?.toISOString() ?? "",
    }));

    return NextResponse.json({
      ok: true,
      kpis: {
        activeStorms,
        stormAlerts: formattedAlerts,
        recentHailEvents,
        recentWindEvents,
        recentTornadoes,
        claimsWithWeatherVerified,
        totalRecentClaims: recentClaims,
        averageCorrelationScore,
        claimsNeedingDOLReview,
        dolConfidenceHigh,
        dolConfidenceMedium,
        dolConfidenceLow,
        affectedZipCodes,
        highRiskProperties,
      },
    });
  } catch (error) {
    logger.error("[WEATHER_KPIS] Failed to fetch KPIs:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch weather KPIs" }, { status: 500 });
  }
}

function mapSeverity(severity: number): "warning" | "watch" | "advisory" {
  if (severity >= 4) return "warning";
  if (severity >= 2) return "watch";
  return "advisory";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatAffectedArea(cities: any): string {
  if (!cities) return "Unknown area";
  if (Array.isArray(cities)) {
    return cities.slice(0, 3).join(", ") + (cities.length > 3 ? "..." : "");
  }
  return String(cities);
}
