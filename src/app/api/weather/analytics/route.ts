export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { safeOrgContext } from "@/lib/safeOrgContext";

/**
 * GET /api/weather/analytics
 *
 * Aggregates weather data the user has already generated:
 *  - weather_reports (DOL pulls, claims weather, full verification)
 *  - weather_events (hail, wind, tornado, etc.)
 *  - Correlates with claims for impact analysis
 *
 * Returns analytics breakdown by peril type, region, monthly trend, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = ctx.userId as string;
    const orgId = ctx.orgId;

    // ── Billing guard ──
    // ── Billing guard (soft) — allow viewing analytics even without subscription ──
    // Weather analytics shows data the user already generated; gating it
    // behind billing creates a poor UX. AI generation endpoints still enforce billing.
    if (orgId) {
      try {
        await requireActiveSubscription(orgId);
      } catch (error) {
        if (error instanceof SubscriptionRequiredError) {
          // Log but don't block — user can see their existing data
          // eslint-disable-next-line no-console
          console.info("[Weather Analytics] No active subscription, allowing read-only access");
        } else {
          throw error;
        }
      }
    }

    // ── Rate limit ──
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: "Too many requests. Please try again later.",
          retryAfter: rl.reset,
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    // ── Weather Reports Summary ──
    // B-03: Scope by org — show reports linked to org's claims OR created by this user
    let reports: Array<{
      id: string;
      address: string;
      mode: string;
      primaryPeril: string | null;
      overallAssessment: string | null;
      confidence: number | null;
      dol: Date | null;
      periodFrom: Date | null;
      periodTo: Date | null;
      createdAt: Date;
      claimId: string | null;
      leadId: string | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      candidateDates: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      events: any;
    }> = [];
    try {
      reports = await prisma.weather_reports.findMany({
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
          leadId: true,
          candidateDates: true,
          events: true,
        },
      });
    } catch (e) {
      logger.warn("[Weather Analytics] weather_reports query failed (non-fatal):", e);
    }

    // ── Weather Events Summary ──
    // B-03: Scope weather_events by org's property IDs to prevent cross-tenant data leakage
    let orgPropertyIds: string[] = [];
    if (orgId) {
      try {
        const orgClaims = await prisma.claims.findMany({
          where: { orgId },
          select: { propertyId: true },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orgPropertyIds = orgClaims.map((c: any) => c.propertyId).filter(Boolean) as string[];
      } catch {
        // Non-fatal
      }
    }
    const eventFilter =
      orgPropertyIds.length > 0
        ? { propertyId: { in: orgPropertyIds } }
        : { propertyId: "__none__" }; // No properties = no events (safe default)
    let totalEvents = 0;
    let hailEvents = 0;
    let windEvents = 0;
    let tornadoEvents = 0;
    let floodEvents = 0;
    try {
      [totalEvents, hailEvents, windEvents, tornadoEvents, floodEvents] = await Promise.all([
        prisma.weather_events.count({ where: eventFilter }),
        prisma.weather_events.count({ where: { ...eventFilter, type: { in: ["hail", "HAIL"] } } }),
        prisma.weather_events.count({
          where: { ...eventFilter, type: { in: ["wind", "WIND", "thunderstorm_wind"] } },
        }),
        prisma.weather_events.count({
          where: { ...eventFilter, type: { in: ["tornado", "TORNADO"] } },
        }),
        prisma.weather_events.count({
          where: { ...eventFilter, type: { in: ["flood", "FLOOD", "flash_flood"] } },
        }),
      ]);
    } catch {
      // Events table may be empty
    }

    // ── Peril Breakdown from reports ──
    const perilCounts: Record<string, number> = {};
    const assessmentCounts: Record<string, number> = {};
    const monthlyTrend: Record<string, number> = {};
    const regionCounts: Record<string, number> = {};
    const confidenceScores: number[] = [];

    for (const r of reports) {
      // Peril breakdown
      const peril = r.primaryPeril || "unknown";
      perilCounts[peril] = (perilCounts[peril] || 0) + 1;

      // Assessment breakdown
      const assessment = r.overallAssessment || "unknown";
      assessmentCounts[assessment] = (assessmentCounts[assessment] || 0) + 1;

      // Monthly trend
      if (r.createdAt) {
        const month = new Date(r.createdAt).toISOString().slice(0, 7); // YYYY-MM
        monthlyTrend[month] = (monthlyTrend[month] || 0) + 1;
      }

      // Region from address
      if (r.address) {
        // Extract state or city from address
        const parts = r.address.split(",").map((p: string) => p.trim());
        const region = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
        if (region) {
          regionCounts[region] = (regionCounts[region] || 0) + 1;
        }
      }

      // Confidence tracking
      if (r.confidence != null) {
        confidenceScores.push(Number(r.confidence));
      }
    }

    const avgConfidence =
      confidenceScores.length > 0
        ? Math.round(
            (confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length) * 100
          ) / 100
        : null;

    // Sort monthly trend by date
    const sortedMonthly = Object.entries(monthlyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    // Top regions (sorted by count)
    const topRegions = Object.entries(regionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([region, count]) => ({ region, count }));

    // ── Claims with weather data ──
    let claimsWithWeather = 0;
    if (orgId) {
      try {
        const claimIdsWithWeather = reports
          .filter((r) => r.claimId)
          .map((r) => r.claimId as string);
        claimsWithWeather = new Set(claimIdsWithWeather).size;
      } catch {
        // Non-critical
      }
    }

    // Recent reports for the feed
    const recentReports = reports.slice(0, 10).map((r) => ({
      id: r.id,
      address: r.address,
      mode: r.mode,
      peril: r.primaryPeril,
      assessment: r.overallAssessment,
      confidence: r.confidence,
      date: r.dol || r.createdAt,
      claimId: r.claimId,
    }));

    return NextResponse.json({
      summary: {
        totalReports: reports.length,
        claimsWithWeather,
        avgConfidence,
        totalEvents,
      },
      events: {
        total: totalEvents,
        hail: hailEvents,
        wind: windEvents,
        tornado: tornadoEvents,
        flood: floodEvents,
      },
      perils: perilCounts,
      assessments: assessmentCounts,
      monthlyTrend: sortedMonthly,
      topRegions,
      recentReports,
    });
  } catch (err) {
    logger.error("[Weather Analytics] Fatal error:", err?.message || err);
    // Return empty-state data instead of 500 so the page still renders
    return NextResponse.json({
      summary: { totalReports: 0, claimsWithWeather: 0, avgConfidence: null, totalEvents: 0 },
      events: { total: 0, hail: 0, wind: 0, tornado: 0, flood: 0 },
      perils: {},
      assessments: {},
      monthlyTrend: [],
      topRegions: [],
      recentReports: [],
    });
  }
}
