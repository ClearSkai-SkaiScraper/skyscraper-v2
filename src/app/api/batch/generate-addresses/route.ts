export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";

/**
 * POST /api/batch/generate-addresses
 *
 * Generate address list from polygon + home count
 *
 * In production, this would:
 * 1. Use geocoding API to find addresses within polygon
 * 2. Query property database for known addresses
 * 3. Use census data to estimate properties
 *
 * For MVP, we generate realistic mock addresses
 */
export const POST = withOrgScope(async (req, { userId, orgId }) => {
  try {
    const body = await req.json();
    const { polygon, estimatedHomes = 100 } = body;

    if (!polygon) {
      return NextResponse.json({ error: "Polygon data required" }, { status: 400 });
    }

    // Extract center point from polygon for city/zip
    const coordinates = polygon.coordinates || [];
    const centerLat =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coordinates.reduce((sum: number, p: any) => sum + (p[1] || 0), 0) / coordinates.length;
    const centerLng =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coordinates.reduce((sum: number, p: any) => sum + (p[0] || 0), 0) / coordinates.length;

    // Determine city/state/zip from coordinates (mock logic)
    const { city, state, zip } = getCityStateFromCoords(centerLat, centerLng);

    // Generate realistic address list
    const addresses = generateMockAddresses(estimatedHomes, city, state, zip);

    return NextResponse.json({
      ok: true,
      addresses,
      metadata: {
        estimatedHomes,
        generatedCount: addresses.length,
        polygon: {
          points: coordinates.length,
          center: { lat: centerLat, lng: centerLng },
        },
      },
    });
  } catch (error) {
    logger.error("[GenerateAddresses] Error:", error);
    return NextResponse.json({ error: "Failed to generate addresses" }, { status: 500 });
  }
});

// Helper: Get city/state from coordinates (simplified)
function getCityStateFromCoords(lat: number, lng: number) {
  // Phoenix area
  if (lat > 33 && lat < 34 && lng > -113 && lng < -111) {
    return { city: "Phoenix", state: "AZ", zip: "85001" };
  }
  // Default
  return { city: "Phoenix", state: "AZ", zip: "85001" };
}

// Helper: Generate realistic mock addresses
function generateMockAddresses(
  count: number,
  city: string,
  state: string,
  baseZip: string
): string[] {
  const streetNames = [
    "Main",
    "Oak",
    "Maple",
    "Cedar",
    "Elm",
    "Pine",
    "Washington",
    "Lincoln",
    "Roosevelt",
    "Jefferson",
    "Madison",
    "Monroe",
    "Adams",
    "Sunset",
    "Sunrise",
    "Mountain View",
    "Desert Sky",
    "Canyon",
  ];

  const streetTypes = ["St", "Ave", "Dr", "Ln", "Ct", "Way", "Blvd", "Pl"];
  const directions = ["N", "S", "E", "W", "NE", "NW", "SE", "SW"];

  const addresses: string[] = [];

  for (let i = 0; i < count; i++) {
    const streetNumber = Math.floor(Math.random() * 9000) + 1000;
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    const streetType = streetTypes[Math.floor(Math.random() * streetTypes.length)];

    // Vary zip codes slightly
    const zipVariation = Math.floor(Math.random() * 99);
    const zip = String(Number(baseZip) + zipVariation).padStart(5, "0");

    addresses.push(
      `${streetNumber} ${direction} ${streetName} ${streetType}, ${city}, ${state} ${zip}`
    );
  }

  return addresses;
}
