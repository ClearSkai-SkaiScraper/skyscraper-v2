export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function GET(request: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") || 20), 50);

    const events = await prisma.storm_events.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { detectedAt: "desc" },
      take: limit,
      select: {
        id: true,
        eventType: true,
        severity: true,
        stormStartTime: true,
        affectedCities: true,
        hailSizeAvg: true,
        windSpeedMax: true,
        estimatedPropertiesImpacted: true,
        centerLat: true,
        centerLng: true,
      },
    });

    const stormEvents = events.map((e) => ({
      id: e.id,
      date: e.stormStartTime,
      type: (e.eventType || "mixed").toLowerCase(),
      severity: e.severity >= 8 ? "severe" : e.severity >= 5 ? "moderate" : "light",
      location:
        Array.isArray(e.affectedCities) && e.affectedCities.length > 0
          ? String(e.affectedCities[0])
          : "Service Area",
      hailSize: e.hailSizeAvg ? Number(e.hailSizeAvg) : null,
      windSpeed: e.windSpeedMax || null,
      impactedProperties: e.estimatedPropertiesImpacted || 0,
      latitude: Number(e.centerLat),
      longitude: Number(e.centerLng),
    }));

    return NextResponse.json({ events: stormEvents });
  } catch (error) {
    logger.error("[STORM_EVENTS_API] Failed to fetch storm events", error);
    return NextResponse.json({ error: "Failed to fetch storm events" }, { status: 500 });
  }
}
