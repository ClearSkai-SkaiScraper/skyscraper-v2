export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

const Schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMiles: z.number().min(1).max(25).default(8),
});

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { latitude, longitude, radiusMiles } = parsed.data;

    const impacts = await prisma.property_impacts.findMany({
      where: { orgId: ctx.orgId },
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
        lat: true,
        lng: true,
        priorityScore: true,
        hailSizeAtLocation: true,
        windSpeedAtLocation: true,
        claimId: true,
      },
      orderBy: { priorityScore: "desc" },
      take: 300,
    });

    const addresses = impacts
      .map((p) => {
        const plat = Number(p.lat);
        const plng = Number(p.lng);
        const distance = haversineMiles(latitude, longitude, plat, plng);
        return {
          id: p.id,
          address: p.address,
          city: p.city,
          state: p.state,
          score: p.priorityScore,
          distanceFromStorm: distance,
          estimatedHailSize: p.hailSizeAtLocation ? Number(p.hailSizeAtLocation) : null,
          estimatedWindSpeed: p.windSpeedAtLocation || null,
          existingClaim: !!p.claimId,
          existingLead: false,
        };
      })
      .filter((a) => Number.isFinite(a.distanceFromStorm) && a.distanceFromStorm <= radiusMiles)
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);

    return NextResponse.json({ addresses });
  } catch (error) {
    logger.error("[PREQUAL_BATCH] Failed to score addresses", error);
    return NextResponse.json({ error: "Failed to score addresses" }, { status: 500 });
  }
}
