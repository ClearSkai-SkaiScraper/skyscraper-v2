/**
 * GET /api/weather/radar?lat=XX&lng=XX&date=YYYY-MM-DD
 *
 * Returns radar image URLs for a given location and date.
 * Uses IEM NEXRAD archive (free) + NWS RIDGE.
 */
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { getRadarForEvent } from "@/lib/weather/radarService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const date = searchParams.get("date") || "";

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date in YYYY-MM-DD format is required" }, { status: 400 });
    }

    const result = await getRadarForEvent(lat, lng, date);

    return NextResponse.json({
      stationId: result.stationId,
      images: result.images,
      weatherData: result.weatherData || [],
      date,
      location: { lat, lng },
    });
  } catch (err) {
    logger.error("[RADAR_API] Error:", err);
    return NextResponse.json({ error: "Failed to fetch radar images" }, { status: 500 });
  }
});
