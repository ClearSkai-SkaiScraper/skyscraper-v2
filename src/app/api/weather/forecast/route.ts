/**
 * GET /api/weather/forecast
 *
 * Fetches a 7-day weather forecast from Visual Crossing Timeline API.
 * Resolves the org's service area location from contractor profile or properties.
 * Falls back to "Prescott, AZ" (platform primary market).
 *
 * Query params:
 *   ?location=Prescott,AZ  — optional override
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

// eslint-disable-next-line no-restricted-syntax
const VISUALCROSSING_API_KEY =
  // eslint-disable-next-line no-restricted-syntax
  process.env.VISUALCROSSING_API_KEY || process.env.VISUAL_CROSSING_API_KEY;

export interface ForecastDay {
  date: string; // ISO date string (YYYY-MM-DD)
  tempMax: number;
  tempMin: number;
  temp: number;
  feelsLikeMax: number;
  feelsLikeMin: number;
  humidity: number;
  precip: number; // inches
  precipProb: number; // 0-100
  snow: number;
  windSpeed: number;
  windGust: number;
  windDir: number; // degrees
  pressure: number;
  uvIndex: number;
  visibility: number;
  conditions: string;
  description: string;
  icon: string;
  sunrise: string;
  sunset: string;
  moonPhase: number;
}

export interface CurrentConditions {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGust: number;
  windDir: number;
  pressure: number;
  uvIndex: number;
  visibility: number;
  conditions: string;
  icon: string;
  precip: number;
}

export interface ForecastResponse {
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
  current: CurrentConditions | null;
  days: ForecastDay[];
  fetchedAt: string;
  source: "visual_crossing";
}

async function resolveOrgLocation(userId: string, orgId: string): Promise<string> {
  try {
    // 1. Try the user's Trades Network profile (tradesCompanyMember) — city/state
    const tradesMember = await prisma.tradesCompanyMember.findUnique({
      where: { userId },
      select: { city: true, state: true },
    });

    if (tradesMember?.city && tradesMember?.state) {
      return `${tradesMember.city}, ${tradesMember.state}`;
    }

    // 2. Fallback: most recent property with city/state for this org
    const topProperty = await prisma.properties.findFirst({
      where: {
        orgId,
        city: { not: { equals: "" } },
        state: { not: { equals: "" } },
      },
      orderBy: { createdAt: "desc" },
      select: { city: true, state: true },
    });

    if (topProperty?.city && topProperty?.state) {
      return `${topProperty.city}, ${topProperty.state}`;
    }
  } catch (err) {
    logger.warn("[FORECAST] Failed to resolve org location", { userId, orgId, err });
  }

  return "Phoenix, AZ"; // Platform default — state capital
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await safeOrgContext();

    if (ctx.status === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow location override via query param
    const { searchParams } = new URL(request.url);
    let location = searchParams.get("location") || "";

    if (!location && ctx.orgId && ctx.userId) {
      location = await resolveOrgLocation(ctx.userId, ctx.orgId);
    }

    if (!location) {
      location = "Phoenix, AZ";
    }

    if (!VISUALCROSSING_API_KEY) {
      logger.warn("[FORECAST] No Visual Crossing API key configured");
      return NextResponse.json({
        location,
        latitude: 0,
        longitude: 0,
        timezone: "America/Phoenix",
        current: null,
        days: [],
        fetchedAt: new Date().toISOString(),
        source: "visual_crossing",
        error: "API key not configured",
      });
    }

    // Fetch 7-day forecast from Visual Crossing Timeline API
    const baseUrl =
      "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline";
    const params = new URLSearchParams({
      key: VISUALCROSSING_API_KEY,
      unitGroup: "us", // Fahrenheit + mph
      contentType: "json",
      include: "days,current,hours",
    });

    const apiUrl = `${baseUrl}/${encodeURIComponent(location)}/next7days?${params.toString()}`;

    const res = await fetch(apiUrl, {
      next: { revalidate: 900 }, // Cache 15 min
    } as RequestInit);

    if (!res.ok) {
      const errorText = await res.text();
      logger.error("[FORECAST] Visual Crossing API error", {
        status: res.status,
        errorText,
        location,
      });
      return NextResponse.json({ error: "Failed to fetch forecast", location }, { status: 502 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();

    // Map current conditions
    const cur = json.currentConditions;
    const current: CurrentConditions | null = cur
      ? {
          temp: Math.round(cur.temp),
          feelsLike: Math.round(cur.feelslike),
          humidity: Math.round(cur.humidity ?? 0),
          windSpeed: Math.round(cur.windspeed ?? 0),
          windGust: Math.round(cur.windgust ?? 0),
          windDir: cur.winddir ?? 0,
          pressure: cur.pressure ?? 0,
          uvIndex: cur.uvindex ?? 0,
          visibility: cur.visibility ?? 0,
          conditions: cur.conditions || "Unknown",
          icon: cur.icon || "cloudy",
          precip: cur.precip ?? 0,
        }
      : null;

    // Map forecast days
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const days: ForecastDay[] = (json.days || []).map((d: any) => ({
      date: d.datetime,
      tempMax: Math.round(d.tempmax),
      tempMin: Math.round(d.tempmin),
      temp: Math.round(d.temp),
      feelsLikeMax: Math.round(d.feelslikemax ?? d.tempmax),
      feelsLikeMin: Math.round(d.feelslikemin ?? d.tempmin),
      humidity: Math.round(d.humidity ?? 0),
      precip: d.precip ?? 0,
      precipProb: Math.round(d.precipprob ?? 0),
      snow: d.snow ?? 0,
      windSpeed: Math.round(d.windspeed ?? 0),
      windGust: Math.round(d.windgust ?? 0),
      windDir: d.winddir ?? 0,
      pressure: d.pressure ?? 0,
      uvIndex: d.uvindex ?? 0,
      visibility: d.visibility ?? 0,
      conditions: d.conditions || "Unknown",
      description: d.description || "",
      icon: d.icon || "cloudy",
      sunrise: d.sunrise || "",
      sunset: d.sunset || "",
      moonPhase: d.moonphase ?? 0,
    }));

    const response: ForecastResponse = {
      location: json.resolvedAddress || location,
      latitude: json.latitude ?? 0,
      longitude: json.longitude ?? 0,
      timezone: json.timezone || "America/Phoenix",
      current,
      days,
      fetchedAt: new Date().toISOString(),
      source: "visual_crossing",
    };

    return NextResponse.json(response);
  } catch (err) {
    logger.error("[FORECAST] Unexpected error", { err });
    return NextResponse.json({ error: "Failed to fetch forecast" }, { status: 500 });
  }
}
