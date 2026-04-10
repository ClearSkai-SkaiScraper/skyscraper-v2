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
 * Geocode an address to lat/lng.
 * Strategy:
 *   1. Mapbox forward geocoding (best for street addresses — needs token)
 *   2. Open-Meteo city-level geocoding (free, uses just city+state)
 *   3. Nominatim / OpenStreetMap (free, handles full addresses)
 */
async function geocodeAddress(
  fullAddress: string,
  cityHint?: string,
  stateHint?: string
): Promise<{ lat: number; lng: number } | null> {
  // ── 1. Try Mapbox (best accuracy for street addresses) ──
  // eslint-disable-next-line no-restricted-syntax
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN;
  if (mapboxToken) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxToken}&limit=1&types=address,place`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const feat = data.features?.[0];
        if (feat?.center) {
          logger.info("[QUICK_DOL] Geocoded via Mapbox", {
            address: fullAddress,
            lat: feat.center[1],
            lng: feat.center[0],
          });
          return { lat: feat.center[1], lng: feat.center[0] };
        }
      }
    } catch {
      logger.warn("[QUICK_DOL] Mapbox geocoding failed, trying fallbacks");
    }
  }

  // ── 2. Try Nominatim / OpenStreetMap (free, handles full addresses) ──
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(fullAddress)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "SkaiScraper/1.0 (weather-dol-scan)" },
    });
    if (res.ok) {
      const results = await res.json();
      if (results?.[0]?.lat && results?.[0]?.lon) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          logger.info("[QUICK_DOL] Geocoded via Nominatim", { address: fullAddress, lat, lng });
          return { lat, lng };
        }
      }
    }
  } catch {
    logger.warn("[QUICK_DOL] Nominatim geocoding failed, trying Open-Meteo");
  }

  // ── 3. Fall back to Open-Meteo city-level geocoding ──
  // Open-Meteo only searches place names, so extract the city/state
  const cityQuery =
    cityHint && stateHint
      ? `${cityHint}, ${stateHint}`
      : cityHint || extractCityFromAddress(fullAddress);

  if (cityQuery) {
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results?.[0]) {
          logger.info("[QUICK_DOL] Geocoded via Open-Meteo (city-level)", {
            query: cityQuery,
            lat: data.results[0].latitude,
            lng: data.results[0].longitude,
          });
          return {
            lat: data.results[0].latitude,
            lng: data.results[0].longitude,
          };
        }
      }
    } catch {
      // All geocoding failed
    }
  }

  logger.warn("[QUICK_DOL] All geocoding methods failed", { fullAddress });
  return null;
}

/**
 * Extract city/state from a comma-separated address string.
 * e.g. "678 N Blanco Ct, Dewey, AZ 86327" → "Dewey, AZ"
 */
function extractCityFromAddress(address: string): string | null {
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 3) {
    // "street, city, state zip" → "city, state"
    const stateZip = parts[2].split(" ").filter(Boolean);
    return `${parts[1]}, ${stateZip[0] || ""}`.trim();
  }
  if (parts.length === 2) {
    // "city, state" already
    return address;
  }
  return null;
}

/**
 * Fetch Visual Crossing data for a date range around the search window.
 * Falls back gracefully if no API key or fetch fails.
 */
async function fetchWeatherForRange(
  lat: number,
  lng: number,
  startDate?: string,
  endDate?: string
): Promise<WeatherCondition[]> {
  // eslint-disable-next-line no-restricted-syntax
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
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!response.ok) {
      logger.error("[QUICK_DOL] Visual Crossing API error:", response.status);
      return [];
    }

    const data = await response.json();
    const days = data.days || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

/**
 * Extract city and state hints from the full address string for geocoding.
 */
function parseCityState(address: string): { city?: string; state?: string } {
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 3) {
    const stateZip = parts[2].split(" ").filter(Boolean);
    return { city: parts[1], state: stateZip[0] || undefined };
  }
  if (parts.length === 2) {
    return { city: parts[0], state: parts[1].split(" ")[0] || undefined };
  }
  return {};
}

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  let step = "init";
  try {
    // Rate limiting check
    step = "rate_limit";
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again.", step },
        { status: 429 }
      );
    }

    step = "parse_body";
    const body = (await req.json()) as WeatherUiQuickDolRequest;

    const address = typeof body.address === "string" ? body.address.trim() : "";
    if (!address) {
      return NextResponse.json({ error: "Address is required.", step }, { status: 400 });
    }

    const startDate =
      typeof body.dateFrom === "string" && body.dateFrom
        ? body.dateFrom
        : typeof body.startDate === "string" && body.startDate
          ? body.startDate
          : undefined;

    const endDate =
      typeof body.dateTo === "string" && body.dateTo
        ? body.dateTo
        : typeof body.endDate === "string" && body.endDate
          ? body.endDate
          : undefined;

    logger.info("[QUICK_DOL] Starting scan", {
      address,
      startDate: startDate || "(default last 90 days)",
      endDate: endDate || "(today)",
      lossType: body.lossType || "auto",
      claimId: body.claimId || null,
    });

    // ── Step 1: Geocode the address ──
    step = "geocode";
    const { city: cityHint, state: stateHint } = parseCityState(address);
    const geo = await geocodeAddress(address, cityHint, stateHint);
    const lat = geo?.lat ?? null;
    const lng = geo?.lng ?? null;

    if (lat !== null && lng !== null) {
      logger.info("[QUICK_DOL] Geocoded successfully", { lat, lng });
    } else {
      logger.warn("[QUICK_DOL] Geocoding failed — proceeding without weather data", { address });
    }

    // ── Step 2: Fetch REAL weather data from Visual Crossing ──
    step = "weather_fetch";
    let weatherData: WeatherCondition[] = [];
    if (lat !== null && lng !== null) {
      weatherData = await fetchWeatherForRange(lat, lng, startDate, endDate);
    }

    // ── Step 3: Run AI DOL analysis ──
    step = "ai_analysis";
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

    step = "process_results";
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

    // ── Step 4: Resolve DB user ID for FK ──
    step = "db_user";
    let dbUserId = userId;
    try {
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
      dbUserId = dbUser.id;
    } catch (userErr) {
      logger.error("[QUICK_DOL] Failed to upsert user, trying findFirst", userErr);
      // Fallback: try to find existing user
      const existing = await prisma.users
        .findFirst({
          where: { clerkUserId: userId },
          select: { id: true },
        })
        .catch(() => null);
      if (existing) {
        dbUserId = existing.id;
      } else {
        // Can't resolve user — still return scan results but skip DB save
        logger.error("[QUICK_DOL] Cannot resolve DB user, returning scan without saving");
        return NextResponse.json(
          { ...response, warning: "Scan completed but could not be saved (user sync issue)." },
          { status: 200 }
        );
      }
    }

    // ── Step 5: Save scan to weather_reports ──
    step = "db_save";
    try {
      const scanId = crypto.randomUUID();
      // Strip weatherData (with nulls) for Prisma JSON compatibility
      const candidatesForDb = candidates.map(({ weatherData: _wd, ...rest }) => rest);
      await prisma.weather_reports.create({
        data: {
          id: scanId,
          claimId: body.claimId || null,
          createdById: dbUserId,
          updatedAt: new Date(),
          mode: "quick_dol",
          address,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          lossType: body.lossType || null,
          dol: candidates[0]?.date ? new Date(candidates[0].date) : null,
          periodFrom: startDate ? new Date(startDate) : null,
          periodTo: endDate ? new Date(endDate) : null,
          primaryPeril: body.lossType || null,
          confidence: candidates[0]?.confidence ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          candidateDates: candidatesForDb as any,
          events: result.candidates || [],
          globalSummary: {
            notes: result.bestGuess || null,
            scanType: "quick_dol",
            perilCategory: body.lossType || "auto",
            dataSource: weatherData.length > 0 ? "visual_crossing" : "ai_knowledge",
            weatherDaysAnalyzed: weatherData.length,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const msg = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[QUICK_DOL] Failed at step="${step}":`, err);
    return NextResponse.json(
      {
        error: `Quick DOL scan failed at ${step}: ${msg}`,
        step,
      },
      { status: 500 }
    );
  }
});
