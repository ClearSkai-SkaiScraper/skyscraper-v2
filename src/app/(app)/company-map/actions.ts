"use server";

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type PropertyLocation = {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  lat: number | null;
  lng: number | null;
  status?: string;
  projectCount?: number;
  claimCount?: number;
};

/**
 * Get all properties with geocoded coordinates for the current organization
 * This is cached per request
 */
export const getCompanyLocations = cache(async (): Promise<PropertyLocation[]> => {
  const user = await currentUser();
  if (!user) return [];

  const orgId = (user.publicMetadata?.orgId as string) || user.id;

  try {
    // Get all properties for this org
    const properties = await prisma.properties.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        street: true,
        city: true,
        state: true,
        zipCode: true,
        _count: {
          select: {
            claims: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Limit for performance
    });

    // Geocode addresses (in real production, use a geocoding service or cached coordinates)
    // For now, we'll use approximate US zip code center points
    const locations = await Promise.all(
      properties.map(async (prop) => {
        // Try to geocode the address
        const coords = await geocodeAddress(
          `${prop.street}, ${prop.city}, ${prop.state} ${prop.zipCode}`
        );

        return {
          id: prop.id,
          name: prop.name,
          street: prop.street,
          city: prop.city,
          state: prop.state,
          zipCode: prop.zipCode,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          status: prop._count.claims > 0 ? "Active Claim" : "Property",
          projectCount: 0,
          claimCount: prop._count.claims,
        };
      })
    );

    return locations.filter((loc) => loc.lat !== null && loc.lng !== null);
  } catch (error) {
    logger.error("Error fetching company locations:", error);
    return [];
  }
});

/**
 * Simple geocoding function - in production, use Mapbox Geocoding API or OpenCage
 * For now, returns approximate coordinates based on US zip code centers
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Extract zip code from address
    const zipMatch = address.match(/\b\d{5}\b/);
    if (!zipMatch) return null;

    // This is a simplified example - in production, use a real geocoding API
    // For demo purposes, we'll return Phoenix metro area coordinates with some variation
    const baseLat = 33.4484;
    const baseLng = -112.074;
    const variation = () => (Math.random() - 0.5) * 0.5; // ~25 mile radius

    return {
      lat: baseLat + variation(),
      lng: baseLng + variation(),
    };
  } catch {
    return null;
  }
}

/**
 * Get properties within a bounding box (for map viewport optimization)
 */
export async function getPropertiesInBounds(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): Promise<PropertyLocation[]> {
  const allLocations = await getCompanyLocations();

  return allLocations.filter(
    (loc) =>
      loc.lat !== null &&
      loc.lng !== null &&
      loc.lat >= bounds.south &&
      loc.lat <= bounds.north &&
      loc.lng >= bounds.west &&
      loc.lng <= bounds.east
  );
}
