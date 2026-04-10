"use server";

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type RouteStop = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: "property" | "inspection" | "job";
  scheduledAt?: Date;
  priority?: string;
};

/**
 * Get all scheduled stops for route optimization
 */

// Deterministic position from address string (until real geocoding API is added)
function addressToCoords(address: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < address.length; i++) {
    h = (Math.imul(31, h) + address.charCodeAt(i)) | 0;
  }
  return {
    lat: 33.4484 + ((Math.abs(h) % 1000) / 1000) * 0.3 - 0.15,
    lng: -112.074 + ((Math.abs(h >> 10) % 1000) / 1000) * 0.3 - 0.15,
  };
}

export const getScheduledStops = cache(async (): Promise<RouteStop[]> => {
  const user = await currentUser();
  if (!user) return [];

  const orgId = (user.publicMetadata?.orgId as string) || user.id;

  try {
    // Get upcoming inspections
    const inspections = await prisma.inspections.findMany({
      where: {
        orgId,
        scheduledAt: { gte: new Date() },
        status: { in: ["scheduled", "in_progress"] },
      },
      include: {
        properties: {
          select: {
            name: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 20,
    });

    // Get active jobs
    const jobs = await prisma.jobs.findMany({
      where: {
        orgId,
        status: { in: ["pending", "in_progress"] },
      },
      include: {
        properties: {
          select: {
            name: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
      take: 20,
    });

    const stops: RouteStop[] = [
      ...inspections.map((insp) => {
        const address = `${insp.properties.street}, ${insp.properties.city}, ${insp.properties.state} ${insp.properties.zipCode}`;
        const coords = addressToCoords(address);
        return {
          id: insp.id,
          name: insp.properties.name,
          address,
          lat: coords.lat,
          lng: coords.lng,
          type: "inspection" as const,
          scheduledAt: insp.scheduledAt,
        };
      }),
      ...jobs.map((job) => {
        const address = `${job.properties.street}, ${job.properties.city}, ${job.properties.state} ${job.properties.zipCode}`;
        const coords = addressToCoords(address);
        return {
          id: job.id,
          name: job.properties.name,
          address,
          lat: coords.lat,
          lng: coords.lng,
          type: "job" as const,
          priority: job.priority,
        };
      }),
    ];

    return stops;
  } catch (error) {
    logger.error("Error fetching scheduled stops:", error);
    return [];
  }
});

/**
 * Calculate optimal route using greedy nearest neighbor algorithm
 * In production, replace with Mapbox Directions API or OSRM
 */
export async function optimizeRoute(stopIds: string[]): Promise<{
  order: string[];
  totalDistance: number;
  estimatedTime: number;
}> {
  const allStops = await getScheduledStops();
  const stops = allStops.filter((s) => stopIds.includes(s.id));

  if (stops.length === 0) {
    return { order: [], totalDistance: 0, estimatedTime: 0 };
  }

  // Greedy nearest neighbor TSP heuristic
  const visited = new Set<string>();
  const order: string[] = [stops[0].id];
  visited.add(stops[0].id);
  let current = stops[0];
  let totalDistance = 0;

  while (visited.size < stops.length) {
    let nearest: RouteStop | null = null;
    let minDist = Infinity;

    for (const stop of stops) {
      if (visited.has(stop.id)) continue;

      const dist = haversineDistance(current, stop);
      if (dist < minDist) {
        minDist = dist;
        nearest = stop;
      }
    }

    if (nearest) {
      order.push(nearest.id);
      visited.add(nearest.id);
      totalDistance += minDist;
      current = nearest;
    } else {
      break;
    }
  }

  // Estimate time: assume 30 mph average + 15 min per stop
  const estimatedTime = (totalDistance / 30) * 60 + stops.length * 15; // minutes

  return {
    order,
    totalDistance: Math.round(totalDistance * 10) / 10, // miles
    estimatedTime: Math.round(estimatedTime),
  };
}

function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const a1 =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1 - a1));

  return R * c;
}
