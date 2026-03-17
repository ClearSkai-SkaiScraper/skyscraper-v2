export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * AI Weather Run API
 *
 * Fetches historical weather data for a specific date and location:
 * 1. Validates date and location
 * 2. Charges tokens (0.5 token)
 * 3. Calls weather provider (WeatherStack or similar)
 * 4. Normalizes data to standard format
 * 5. Saves to weather_reports table
 * 6. Returns structured weather data
 *
 * Used for date of loss verification and claim substantiation.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionOrgUser } from "@/lib/auth";
import { runJob } from "@/lib/jobs/runJob";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { emitEvent } from "@/lib/telemetry";

// =============================================================================
// CONFIGURATION
// =============================================================================

// =============================================================================
// REQUEST SCHEMA
// =============================================================================

const WeatherRequestSchema = z.object({
  proposalId: z.string().uuid("Invalid proposal ID").optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
});

type WeatherRequest = z.infer<typeof WeatherRequestSchema>;

// =============================================================================
// NORMALIZED WEATHER SCHEMA
// =============================================================================

interface NormalizedWeatherData {
  date: string; // YYYY-MM-DD
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  temperature: {
    max_f: number;
    min_f: number;
    avg_f: number;
  };
  precipitation: {
    total_in: number;
    type?: "rain" | "snow" | "mixed" | "none";
  };
  wind: {
    max_mph: number;
    avg_mph: number;
    direction?: string;
  };
  conditions: string[]; // ["Partly Cloudy", "Windy", etc.]
  hail?: {
    reported: boolean;
    size_in?: number;
  };
  severe_weather?: string[]; // ["Thunderstorm", "Tornado Warning", etc.]
  provider: string; // "weatherstack", "openweather", etc.
  raw_data: any; // Original API response
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(req: Request) {
  const startedAtMs = Date.now();
  let orgIdForTelemetry: string | null = null;
  let userIdForTelemetry: string | null = null;
  try {
    // Authenticate and get org context
    const { orgId, userId } = await getSessionOrgUser();

    orgIdForTelemetry = orgId;
    userIdForTelemetry = userId;

    // Rate limit weather API requests
    const rl = await checkRateLimit(userId, "WEATHER");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // Parse and validate request body
    const body = await req.json().catch(() => ({}));
    const parsed = WeatherRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten(),
          timestamp: new Date().toISOString(),
        },
        { status: 422 }
      );
    }

    const { proposalId, date, location } = parsed.data;

    // Validate date is not in future
    const requestDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestDate > today) {
      return NextResponse.json(
        {
          error: "Cannot fetch weather for future dates",
          timestamp: new Date().toISOString(),
        },
        { status: 422 }
      );
    }

    // Check if weather provider is configured
    const weatherApiKey = process.env.WEATHERSTACK_API_KEY;
    if (!weatherApiKey) {
      logger.error("WEATHERSTACK_API_KEY not configured");
      return NextResponse.json(
        {
          error: "Weather service not configured. Contact administrator.",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    const normalized = await runJob({
      orgId,
      queue: "api",
      jobName: "ai.weather_run",
      meta: {
        proposalId,
        date,
        location: location.address || `${location.lat},${location.lng}`,
      },
      fn: async () => {
        // Fetch weather data from provider
        const weatherData = await fetchWeatherData(date, location, weatherApiKey);

        // Normalize to standard format
        const normalized = normalizeWeatherData(weatherData, date, location);

        // Save to database — non-critical logging, don't crash if tables missing
        try {
          if (proposalId) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO proposal_events (proposal_id, event_type, message, metadata)
               VALUES ($1, $2, $3, $4::jsonb)`,
              proposalId,
              "weather_fetched",
              `Weather data fetched for ${date}`,
              JSON.stringify({
                date,
                location,
                weather: normalized,
                userId,
              })
            );
          }
        } catch {
          /* proposal_events table may not exist — non-fatal */
        }

        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO activity_events (org_id, userId, event_type, event_data)
             VALUES ($1, $2, $3, $4::jsonb)`,
            orgId,
            userId,
            "weather_report_generated",
            JSON.stringify({
              proposalId,
              date,
              location: location.address || `${location.lat},${location.lng}`,
            })
          );
        } catch {
          /* activity_events table may not exist — non-fatal */
        }

        return normalized;
      },
    });

    logger.debug(`Weather report generated: ${date} - ${location.address || "no address"}`);

    await emitEvent({
      orgId,
      clerkUserId: userId,
      kind: "ai.weather_run",
      refType: "proposal",
      refId: proposalId,
      title: "Weather report generated",
      meta: {
        date,
        location: location.address || `${location.lat},${location.lng}`,

        durationMs: Date.now() - startedAtMs,
        success: true,
      },
    });

    // Return normalized weather data
    return NextResponse.json({
      success: true,
      date,
      location,
      weather: normalized,
      tokensCharged: 0,
    });
  } catch (error) {
    logger.error("AI Weather Run failed:", error);

    if (orgIdForTelemetry && userIdForTelemetry) {
      await emitEvent({
        orgId: orgIdForTelemetry,
        clerkUserId: userIdForTelemetry,
        kind: "ai.weather_run",
        refType: "weather",
        refId: undefined,
        title: "Weather report failed",
        meta: {
          durationMs: Date.now() - startedAtMs,
          success: false,
          error: String(error?.message || error),
        },
      });
    }

    // Handle auth errors
    if (error.message?.includes("Unauthorized") || error.message?.includes("organization")) {
      return NextResponse.json(
        {
          error: "Internal server error",
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// WEATHER PROVIDER FUNCTIONS
// =============================================================================

/**
 * Fetch historical weather data from WeatherStack API
 */
async function fetchWeatherData(
  date: string,
  location: { lat: number; lng: number; address?: string },
  apiKey: string
): Promise<any> {
  const params = new URLSearchParams({
    access_key: apiKey,
    query: `${location.lat},${location.lng}`,
    historical_date: date,
    hourly: "0", // Daily data only
    units: "f", // Fahrenheit
  });

  const url = `https://api.weatherstack.com/historical?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "PreLossVision/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`WeatherStack API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`WeatherStack error: ${data.error.info || "Unknown error"}`);
  }

  return data;
}

/**
 * Normalize weather data to standard format
 */
function normalizeWeatherData(
  rawData: any,
  date: string,
  location: { lat: number; lng: number; address?: string }
): NormalizedWeatherData {
  const historical = rawData.historical?.[date] || {};

  return {
    date,
    location: {
      lat: location.lat,
      lng: location.lng,
      address: location.address,
    },
    temperature: {
      max_f: historical.maxtemp || 0,
      min_f: historical.mintemp || 0,
      avg_f: historical.avgtemp || 0,
    },
    precipitation: {
      total_in: (historical.totalprecip || 0) * 0.0393701, // mm to inches
      type: determinePrecipitationType(historical),
    },
    wind: {
      max_mph: (historical.maxwind || 0) * 0.621371, // km/h to mph
      avg_mph: (historical.avgwind || 0) * 0.621371,
      direction: historical.wind_dir,
    },
    conditions: parseConditions(historical.weather_descriptions || []),
    hail: {
      reported: false, // WeatherStack doesn't provide hail data
    },
    provider: "weatherstack",
    raw_data: rawData,
  };
}

/**
 * Determine precipitation type from weather data
 */
function determinePrecipitationType(data: any): "rain" | "snow" | "mixed" | "none" {
  const precip = data.totalprecip || 0;
  if (precip === 0) return "none";

  const temp = data.avgtemp || 32;
  if (temp <= 32) return "snow";
  if (temp > 32 && temp <= 35) return "mixed";
  return "rain";
}

/**
 * Parse weather condition descriptions
 */
function parseConditions(descriptions: string[]): string[] {
  if (!descriptions || descriptions.length === 0) return ["Unknown"];
  return descriptions.map((d) => d.trim()).filter(Boolean);
}

// =============================================================================
// EXPORT TYPES FOR CLIENT
// =============================================================================

export type { NormalizedWeatherData };

export interface WeatherRunResponse {
  success: true;
  date: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  weather: NormalizedWeatherData;
  tokensCharged: number;
}
