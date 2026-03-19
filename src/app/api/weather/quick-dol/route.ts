export const dynamic = "force-dynamic";
export const revalidate = 0;

// src/app/api/weather/quick-dol/route.ts
import { NextRequest, NextResponse } from "next/server";

import { QuickDolInput, runQuickDol } from "@/lib/ai/weather";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { type WeatherCondition } from "@/lib/weather/radarService";

type WeatherUiQuickDolRequest = {
  address?: string;
  lossType?: "unspecified" | "hail" | "wind" | "water";
  dateFrom?: string;
  dateTo?: string;
  orgId?: string;
  claimId?: string;
  /** Legacy / alternate key for dateFrom */
  startDate?: string;
  /** Legacy / alternate key for dateTo */
  endDate?: string;
};

function normalizeConfidence(score: unknown): number {
  const n = typeof score === "number" ? score : 0;
  if (!Number.isFinite(n)) return 0;
  // Some callers produce 0-100, others 0-1
  if (n > 1) return Math.max(0, Math.min(1, n / 100));
  return Math.max(0, Math.min(1, n));
}

function mapLossTypeToPeril(
  lossType: WeatherUiQuickDolRequest["lossType"]
): QuickDolInput["peril"] {
  if (!lossType || lossType === "unspecified") return undefined;
  if (lossType === "water") return "rain";
  return lossType;
}

/**
 * Geocode an address to lat/lng via Open-Meteo (free, no key needed)
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=en&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results?.[0]) {
      return { lat: data.results[0].latitude, lng: data.results[0].longitude };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch Visual Crossing data for a date range (up to 90 days) around the search window.
 * Falls back gracefully if no API key or fetch fails.
 */
async function fetchWeatherForRange(
  lat: number,
  lng: number,
  startDate?: string,
  endDate?: string
): Promise<WeatherCondition[]> {
  const apiKey = process.env.VISUALCROSSING_API_KEY || process.env.VISUAL_CROSSING_API_KEY;
  if (!apiKey) {
    logger.warn("[QUICK_DOL] No Visual Crossing API key — scan will rely on AI knowledge only");
    return [];
  }

  try {
    // Default range: last 90 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Clamp to max 90 days for API limits
    const maxRange = 90 * 24 * 60 * 60 * 1000;
    const actualStart =
      end.getTime() - start.getTime() > maxRange ? new Date(end.getTime() - maxRange) : start;

    const dateRange = `${actualStart.toISOString().split("T")[0]}/${end.toISOString().split("T")[0]}`;
    const location = `${lat},${lng}`;
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}/${dateRange}?key=${apiKey}&unitGroup=us&include=days&contentType=json`;

    logger.info("[QUICK_DOL] Fetching Visual Crossing weather data", { dateRange, location });
    const response = await fetch(url);

    if (!response.ok) {
      logger.error("[QUICK_DOL] Visual Crossing API error:", response.status);
      return [];
    }

    const data = await response.json();
    const days = data.days || [];

    const conditions: WeatherCondition[] = days.map((day: any) => ({
      datetime: day.datetime,
      tempmax: day.tempmax,
      tempmin: day.tempmin,
      precip: day.precip || 0,
      precipprob: day.precipprob || 0,
      windspeed: day.windspeed || 0,
      windgust: day.windgust,
      conditions: day.conditions || "",
      icon: day.icon || "",
      description: day.description || "",
    }));

    logger.info("[QUICK_DOL] Got real weather data", { daysCount: conditions.length });
    return conditions;
  } catch (err) {
    logger.error("[QUICK_DOL] Weather data fetch failed:", err);
    return [];
  }
}

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    // Rate limiting check
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = (await req.json()) as WeatherUiQuickDolRequest;

    const address = typeof body.address === "string" ? body.address.trim() : "";
    if (!address) {
      return NextResponse.json({ error: "Address is required." }, { status: 400 });
    }

    const startDate =
      typeof body.dateFrom === "string"
        ? body.dateFrom
        : typeof body.startDate === "string"
          ? body.startDate
          : undefined;

    const endDate =
      typeof body.dateTo === "string"
        ? body.dateTo
        : typeof body.endDate === "string"
          ? body.endDate
          : undefined;

    // ── Step 1: Geocode the address ──
    const geo = await geocodeAddress(address);
    const lat = geo?.lat ?? null;
    const lng = geo?.lng ?? null;

    // ── Step 2: Fetch REAL weather data from Visual Crossing ──
    let weatherData: WeatherCondition[] = [];
    if (lat !== null && lng !== null) {
      weatherData = await fetchWeatherForRange(lat, lng, startDate, endDate);
    } else {
      logger.warn("[QUICK_DOL] Geocoding failed for address, proceeding without weather data", {
        address,
      });
    }

    const input: QuickDolInput = {
      address,
      startDate,
      endDate,
      peril: mapLossTypeToPeril(body.lossType),
      // Pass real weather observations so AI can ground its analysis
      weatherObservations:
        weatherData.length > 0
          ? weatherData.map((d) => ({
              date: d.datetime,
              highF: d.tempmax,
              lowF: d.tempmin,
              precipIn: d.precip,
              precipProb: d.precipprob,
              windMph: d.windspeed,
              gustMph: d.windgust ?? null,
              conditions: d.conditions,
              description: d.description ?? null,
            }))
          : undefined,
    };

    const result = await runQuickDol(input);

    const candidates = (result.candidates || []).map((c) => ({
      date: c.date,
      confidence: normalizeConfidence(c.score),
      reasoning: c.reason || undefined,
      perilType: body.lossType || "unknown",
      // Attach real weather data for this specific candidate date
      weatherData: weatherData.find((w) => w.datetime === c.date) || null,
    }));

    const response = {
      candidates,
      notes: result.bestGuess ? `Best guess: ${result.bestGuess}` : undefined,
      scanId: null as string | null,
      dataSource: weatherData.length > 0 ? "visual_crossing" : "ai_knowledge",
      weatherDaysAnalyzed: weatherData.length,
    };

    // ── Resolve DB user ID for FK (weather_reports.createdById → users.id) ──
    // Auto-create the DB user row if it doesn't exist yet (Clerk → DB sync)
    const dbUser = await prisma.users.upsert({
      where: { clerkUserId: userId },
      create: {
        id: userId,
        clerkUserId: userId,
        email: `pending-${userId}@sync.local`,
        orgId,
        role: "USER",
        lastSeenAt: new Date(),
      },
      update: {
        lastSeenAt: new Date(),
      },
      select: { id: true },
    });

    // ── Save scan to weather_reports for recall + history ──
    try {
      const scanId = crypto.randomUUID();
      // Strip weatherData (with nulls) for Prisma JSON compatibility
      const candidatesForDb = candidates.map(({ weatherData: _wd, ...rest }) => rest);
      await prisma.weather_reports.create({
        data: {
          id: scanId,
          claimId: body.claimId || null,
          createdById: dbUser.id,
          updatedAt: new Date(),
          mode: "quick_dol",
          address,
          lossType: body.lossType || null,
          dol: candidates[0]?.date ? new Date(candidates[0].date) : null,
          periodFrom: startDate ? new Date(startDate) : null,
          periodTo: endDate ? new Date(endDate) : null,
          primaryPeril: body.lossType || null,
          confidence: candidates[0]?.confidence ?? null,
          candidateDates: candidatesForDb as any,
          events: result.candidates || [],
          globalSummary: {
            notes: result.bestGuess || null,
            scanType: "quick_dol",
            perilCategory: body.lossType || "auto",
            dataSource: weatherData.length > 0 ? "visual_crossing" : "ai_knowledge",
            weatherDaysAnalyzed: weatherData.length,
          },
          providerRaw: result as any,
        },
      });
      response.scanId = scanId;
      logger.info("[weather/quick-dol] Saved scan", { scanId, claimId: body.claimId, orgId });
    } catch (dbErr) {
      logger.error("[weather/quick-dol] Failed to save scan:", dbErr);
      return NextResponse.json(
        { ...response, warning: "Scan completed but failed to save to database." },
        { status: 200 }
      );
    }

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    logger.error("Error in /api/weather/quick-dol:", err);
    return NextResponse.json({ error: "Failed to run Quick DOL." }, { status: 500 });
  }
});
