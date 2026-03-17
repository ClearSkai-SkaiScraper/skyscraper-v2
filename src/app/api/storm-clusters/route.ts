/**
 * Storm Clusters API
 *
 * GET /api/storm-clusters — List all storm clusters for the org
 *
 * Returns stored storm clusters with member claims and corroboration scores.
 */

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const ctx = await safeOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const clusters = await prisma.storm_clusters.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { corroborationScore: "desc" },
      take: 50,
    });

    // Enrich with storm event info
    const stormEventIds = [
      ...new Set(clusters.map((c) => c.stormEventId).filter(Boolean)),
    ] as string[];

    const stormEvents =
      stormEventIds.length > 0
        ? await prisma.storm_events.findMany({
            where: { id: { in: stormEventIds } },
            select: {
              id: true,
              eventType: true,
              impactSummary: true,
              stormStartTime: true,
              severity: true,
              hailSizeMax: true,
              windSpeedMax: true,
            },
          })
        : [];

    const stormMap = new Map(stormEvents.map((s) => [s.id, s]));

    const enriched = clusters.map((c) => ({
      id: c.id,
      stormEventId: c.stormEventId,
      stormEvent: c.stormEventId ? (stormMap.get(c.stormEventId) ?? null) : null,
      claimsInCluster: c.claimsInCluster,
      corroborationScore: c.corroborationScore,
      corroborationLevel: c.corroborationLevel,
      centerLat: c.centerLat,
      centerLng: c.centerLng,
      radiusMiles: c.radiusMiles,
      totalProperties: c.totalProperties,
      verifiedDamage: c.verifiedDamage,
      hailDamageCount: c.hailDamageCount,
      windDamageCount: c.windDamageCount,
      heatmapData: c.heatmapData,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({
      clusters: enriched,
      total: enriched.length,
    });
  } catch (err) {
    logger.error("[STORM_CLUSTERS_API] Failed:", err);
    return NextResponse.json({ error: "Failed to fetch storm clusters" }, { status: 500 });
  }
}
