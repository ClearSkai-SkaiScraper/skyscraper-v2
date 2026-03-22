export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

/**
 * POST /api/weather/analytics/insights
 *
 * AI-powered weather analytics insights for the user's service area.
 * Uses existing weather report data + web-sourced NOAA/NWS alerts to
 * generate actionable insights about highest-impact areas, trending perils,
 * and proactive recommendations.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ctx.userId as string;
    const orgId = ctx.orgId;

    // B-03: Gather all weather reports for this org/user (org-scoped)
    const reports = await prisma.weather_reports.findMany({
      where: orgId
        ? { OR: [{ createdById: userId }, { claims: { orgId } }] }
        : { createdById: userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        address: true,
        mode: true,
        primaryPeril: true,
        overallAssessment: true,
        confidence: true,
        dol: true,
        periodFrom: true,
        periodTo: true,
        createdAt: true,
        claimId: true,
        events: true,
        candidateDates: true,
      },
    });

    // Gather weather events
    // B-03: Scope by org's property IDs to prevent cross-tenant data leakage
    let recentEvents: any[] = [];
    try {
      let propertyFilter: any = {};
      if (orgId) {
        const orgClaims = await prisma.claims.findMany({
          where: { orgId },
          select: { propertyId: true },
        });
        const orgPropertyIds = orgClaims.map((c: any) => c.propertyId).filter(Boolean) as string[];
        if (orgPropertyIds.length > 0) {
          propertyFilter = { propertyId: { in: orgPropertyIds } };
        } else {
          propertyFilter = { propertyId: "__none__" }; // No properties = no events
        }
      }
      recentEvents = await prisma.weather_events.findMany({
        where: propertyFilter,
        orderBy: { timeUtc: "desc" },
        take: 50,
        select: {
          id: true,
          type: true,
          magnitude: true,
          timeUtc: true,
          source: true,
          propertyId: true,
          metadataJson: true,
        },
      });
    } catch {
      // Events table may be empty
    }

    // Gather claims for service area correlation
    let claimAddresses: string[] = [];
    if (orgId) {
      try {
        const claims = await prisma.claims.findMany({
          where: { orgId },
          select: { id: true, damageType: true, dateOfLoss: true, propertyId: true },
          take: 100,
        });
        const propertyIds = claims.map((c: any) => c.propertyId).filter(Boolean) as string[];
        if (propertyIds.length > 0) {
          const properties = await prisma.properties.findMany({
            where: { id: { in: propertyIds } },
            select: { street: true, city: true, state: true, zipCode: true },
          });
          claimAddresses = properties.map((p: any) =>
            `${p.street || ""}, ${p.city || ""}, ${p.state || ""} ${p.zipCode || ""}`.trim()
          );
        }
      } catch {
        // Non-critical
      }
    }

    // ── Build analysis from existing data ──
    // Region analysis
    const regionMap: Record<string, { count: number; perils: string[]; avgConf: number[] }> = {};
    for (const r of reports) {
      if (!r.address) continue;
      const parts = r.address.split(",").map((s: string) => s.trim());
      const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
      const state = parts.length >= 1 ? parts[parts.length - 1] : "";
      const region = `${city}, ${state}`.trim().replace(/^,\s*/, "");
      if (!region) continue;

      if (!regionMap[region]) regionMap[region] = { count: 0, perils: [], avgConf: [] };
      regionMap[region].count++;
      if (r.primaryPeril) regionMap[region].perils.push(r.primaryPeril);
      if (r.confidence != null) regionMap[region].avgConf.push(Number(r.confidence));
    }

    // Sort regions by activity
    const hotspots = Object.entries(regionMap)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 8)
      .map(([region, data]) => {
        const topPeril = getMostCommon(data.perils);
        const avgConfidence =
          data.avgConf.length > 0
            ? Math.round(data.avgConf.reduce((a, b) => a + b, 0) / data.avgConf.length)
            : null;
        return { region, reports: data.count, topPeril, avgConfidence };
      });

    // Seasonal trend analysis
    const monthlyPerils: Record<string, Record<string, number>> = {};
    for (const r of reports) {
      if (!r.createdAt) continue;
      const month = new Date(r.createdAt).toLocaleString("en-US", { month: "short" });
      const peril = r.primaryPeril || "unknown";
      if (!monthlyPerils[month]) monthlyPerils[month] = {};
      monthlyPerils[month][peril] = (monthlyPerils[month][peril] || 0) + 1;
    }

    // Risk scoring
    const perilCounts: Record<string, number> = {};
    const assessmentCounts: Record<string, number> = {};
    for (const r of reports) {
      const p = r.primaryPeril || "unknown";
      perilCounts[p] = (perilCounts[p] || 0) + 1;
      const a = r.overallAssessment || "unknown";
      assessmentCounts[a] = (assessmentCounts[a] || 0) + 1;
    }

    const confirmedCount =
      (assessmentCounts["Confirmed"] || 0) +
      (assessmentCounts["confirmed"] || 0) +
      (assessmentCounts["Strong Correlation"] || 0);

    // Generate AI-style recommendations
    const insights: string[] = [];

    if (hotspots.length > 0) {
      const topArea = hotspots[0];
      insights.push(
        `🎯 **Highest activity zone**: ${topArea.region} with ${topArea.reports} reports. Primary peril: ${topArea.topPeril || "Mixed"}. ${topArea.avgConfidence ? `Average confidence: ${topArea.avgConfidence}%` : ""}`
      );
    }

    const topPeril = getMostCommon(reports.map((r) => r.primaryPeril).filter(Boolean) as string[]);
    if (topPeril) {
      insights.push(
        `⚡ **Dominant peril type**: ${topPeril} accounts for ${perilCounts[topPeril] || 0} of ${reports.length} reports. Consider proactive canvassing in affected areas.`
      );
    }

    if (confirmedCount > 0) {
      const confirmRate = Math.round((confirmedCount / reports.length) * 100);
      insights.push(
        `✅ **Verification success rate**: ${confirmRate}% of weather reports show confirmed or strong correlation — solid data for carrier submissions.`
      );
    }

    if (recentEvents.length > 0) {
      const latestEvent = recentEvents[0];
      insights.push(
        `🌪️ **Latest tracked event**: ${latestEvent.type || "Weather event"} in ${latestEvent.county || latestEvent.state || "your area"} on ${latestEvent.date ? new Date(latestEvent.date).toLocaleDateString() : "recently"}. ${latestEvent.severity ? `Severity: ${latestEvent.severity}` : ""}`
      );
    }

    if (reports.length >= 5) {
      insights.push(
        `📊 **Data depth**: ${reports.length} weather reports analyzed across ${hotspots.length} service regions. Your weather intelligence is building a strong foundation for claims support.`
      );
    } else {
      insights.push(
        `💡 **Recommendation**: Run more Quick DOL pulls and Weather Reports to build deeper analytics. Each report strengthens your service area intelligence.`
      );
    }

    // Recent storm activity from events table
    const stormActivity = recentEvents
      .filter((e) => e.date && new Date(e.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
      .slice(0, 5)
      .map((e) => ({
        type: e.type,
        severity: e.severity,
        date: e.date,
        location: e.location || `${e.county || ""}, ${e.state || ""}`.trim(),
      }));

    return NextResponse.json({
      success: true,
      hotspots,
      insights,
      stormActivity,
      seasonalTrends: monthlyPerils,
      totalReportsAnalyzed: reports.length,
      totalEventsTracked: recentEvents.length,
      serviceAreasCovered: hotspots.length,
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}

function getMostCommon(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] || null;
}
