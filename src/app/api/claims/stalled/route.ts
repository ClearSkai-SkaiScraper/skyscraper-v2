/**
 * Stalled Claims Detection API
 * GET /api/claims/stalled
 *
 * Returns claims that haven't been updated in a configurable number of days.
 * Used by the dashboard "At Risk Claims" widget to surface claims that
 * need attention before they fall through the cracks.
 *
 * Staleness tiers:
 *   - CRITICAL (red): 14+ days idle
 *   - WARNING (amber): 7-13 days idle
 *   - WATCH (yellow): 5-6 days idle
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

// How many days of inactivity at each tier
const CRITICAL_DAYS = 14;
const WARNING_DAYS = 7;
const WATCH_DAYS = 5;

// Statuses that should be excluded (already closed/completed)
const EXCLUDED_STATUSES = [
  "closed",
  "completed",
  "denied",
  "archived",
  "cancelled",
  "canceled",
  "withdrawn",
];

export async function GET(request: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { orgId } = ctx;

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);

    // Calculate cutoff dates
    const now = new Date();
    const watchCutoff = new Date(now.getTime() - WATCH_DAYS * 24 * 60 * 60 * 1000);

    // Find claims that haven't been updated since the watch cutoff
    const stalledClaims = await prisma.claims.findMany({
      where: {
        orgId,
        updatedAt: { lt: watchCutoff },
        archivedAt: null,
        NOT: {
          status: { in: EXCLUDED_STATUSES },
        },
      },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        updatedAt: true,
        createdAt: true,
        assignedTo: true,
        estimatedValue: true,
        insured_name: true,
        last_contacted_at: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: { updatedAt: "asc" }, // Most stale first
      take: limit,
    });

    // Classify each claim into staleness tiers
    const classified = stalledClaims.map((claim) => {
      const daysSinceUpdate = Math.floor(
        (now.getTime() - new Date(claim.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      let tier: "critical" | "warning" | "watch";
      if (daysSinceUpdate >= CRITICAL_DAYS) {
        tier = "critical";
      } else if (daysSinceUpdate >= WARNING_DAYS) {
        tier = "warning";
      } else {
        tier = "watch";
      }

      const prop = claim.properties;
      const propertyAddress = prop
        ? `${prop.street || ""}, ${prop.city || ""}, ${prop.state || ""}`.replace(/^, |, $/g, "")
        : null;

      return {
        id: claim.id,
        claimNumber: claim.claimNumber,
        status: claim.status,
        propertyAddress,
        homeownerName: claim.insured_name,
        assignedTo: claim.assignedTo,
        claimAmount: claim.estimatedValue,
        updatedAt: claim.updatedAt,
        createdAt: claim.createdAt,
        lastAdjusterContact: claim.last_contacted_at,
        daysSinceUpdate,
        tier,
      };
    });

    const summary = {
      total: classified.length,
      critical: classified.filter((c) => c.tier === "critical").length,
      warning: classified.filter((c) => c.tier === "warning").length,
      watch: classified.filter((c) => c.tier === "watch").length,
      totalAtRiskValue: classified.reduce((sum, c) => sum + ((c.claimAmount as number) || 0), 0),
    };

    logger.info("[STALLED_CLAIMS] Fetched stalled claims", {
      orgId,
      ...summary,
    });

    return NextResponse.json({
      claims: classified,
      summary,
    });
  } catch (error) {
    logger.error("[STALLED_CLAIMS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch stalled claims" }, { status: 500 });
  }
}
