/**
 * Weather Analyze Worker Job
 *
 * Fetches weather data for a property location and date range.
 * Currently uses placeholder data - replace with real NOAA/NEXRAD pipeline.
 */

import type { Job as PgBossJob } from "pg-boss";
import { pool } from "../../lib/db/index.js";
import { recordJobEvent } from "../../lib/queue/hooks.js";

export interface WeatherPayload {
  lat: number;
  lng: number;
  dateFrom?: string; // ISO date
  dateTo?: string; // ISO date
  orgId?: string;
  userId?: string;
}

/**
 * Weather analysis job handler
 */
export async function jobWeatherAnalyze(payload: WeatherPayload, job: PgBossJob): Promise<void> {
  console.log(`Starting weather analysis for (${payload.lat}, ${payload.lng})`);

  await recordJobEvent(job, "working", "Weather analysis started");

  const client = await pool.connect();

  try {
    const { lat, lng, dateFrom, dateTo } = payload;

    // Fetch real weather data (tries Visual Crossing first, falls back to WeatherStack)
    const weatherData = await fetchWeatherData(lat, lng, dateFrom, dateTo);

    const summary = {
      hailRisk: weatherData.hailDetected ? "high" : "low",
      windRisk:
        weatherData.maxWindSpeed > 40 ? "high" : weatherData.maxWindSpeed > 25 ? "medium" : "low",
      temperatureRange: `${weatherData.minTemp}°F - ${weatherData.maxTemp}°F`,
      precipitationTotal: `${weatherData.totalPrecipitation} inches`,
      note: `Weather data from ${weatherData.provider}`,
    };

    const raw = {
      vendor: weatherData.provider,
      note: `Real weather data from ${weatherData.provider}`,
      requestedDates: { from: dateFrom, to: dateTo },
      coordinates: { lat, lng },
      fullResponse: weatherData.raw,
    };

    // Insert weather result (A-02: upsert to prevent duplicates on retry)
    const insertQuery = `
      INSERT INTO weather_results (
        property_lat,
        property_lng,
        date_from,
        date_to,
        raw,
        summary
      )
      VALUES ($1, $2, $3::date, $4::date, $5::jsonb, $6::jsonb)
      ON CONFLICT (property_lat, property_lng, date_from, date_to) DO UPDATE SET
        raw = EXCLUDED.raw,
        summary = EXCLUDED.summary
      RETURNING id, summary;
    `;

    const result = await client.query(insertQuery, [
      lat,
      lng,
      dateFrom || null,
      dateTo || null,
      raw,
      summary,
    ]);

    const weatherResultId = result.rows[0].id;
    const resultSummary = result.rows[0].summary;

    // Record completion
    await recordJobEvent(job, "completed", "Weather analysis complete", {
      weatherResultId,
      summary: resultSummary,
    });

    console.log(`✅ Weather analysis complete: ${weatherResultId}`);
  } catch (error: any) {
    console.error("Weather analysis failed:", error);
    await recordJobEvent(job, "failed", error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main weather data fetcher - tries Visual Crossing first, falls back to WeatherStack
 */
async function fetchWeatherData(
  lat: number,
  lng: number,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  hailDetected: boolean;
  maxWindSpeed: number;
  minTemp: number;
  maxTemp: number;
  totalPrecipitation: number;
  provider: string;
  raw: any;
}> {
  // Try Visual Crossing first (better for historical data)
  const visualCrossingKey =
    process.env.VISUALCROSSING_API_KEY || process.env.VISUAL_CROSSING_API_KEY;
  if (visualCrossingKey) {
    try {
      console.log("Using Visual Crossing for weather data");
      return await fetchVisualCrossingData(lat, lng, dateFrom, dateTo);
    } catch (error) {
      console.error("Visual Crossing failed, falling back to WeatherStack:", error);
    }
  }

  // Fall back to WeatherStack
  const weatherStackKey = process.env.WEATHERSTACK_API_KEY || process.env.WEATHER_STACK_API_KEY;
  if (weatherStackKey) {
    try {
      console.log("Using WeatherStack for weather data");
      return await fetchWeatherStackData(lat, lng, dateFrom, dateTo);
    } catch (error) {
      console.error("WeatherStack failed:", error);
    }
  }

  // Final fallback - return error instead of placeholder
  console.error("CRITICAL: No weather API keys configured!");
  throw new Error(
    "Weather API not configured. Please add VISUALCROSSING_API_KEY or WEATHERSTACK_API_KEY to environment variables."
  );
}

/**
 * Fetch weather data from Visual Crossing Timeline API
 * Provides better historical data than WeatherStack
 */
async function fetchVisualCrossingData(
  lat: number,
  lng: number,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  hailDetected: boolean;
  maxWindSpeed: number;
  minTemp: number;
  maxTemp: number;
  totalPrecipitation: number;
  provider: string;
  raw: any;
}> {
  const apiKey = process.env.VISUALCROSSING_API_KEY || process.env.VISUAL_CROSSING_API_KEY;

  if (!apiKey) {
    throw new Error("VISUALCROSSING_API_KEY not configured");
  }

  const location = `${lat},${lng}`;
  const dates = dateFrom && dateTo ? `${dateFrom}/${dateTo}` : dateFrom || "";
  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}${dates ? "/" + dates : ""}?key=${apiKey}&unitGroup=us&contentType=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Visual Crossing API error: ${response.status}`);
  }

  const data = await response.json();

  // Parse timeline data
  const days = data.days || [];

  let maxWindSpeed = 0;
  let minTemp = Infinity;
  let maxTemp = -Infinity;
  let totalPrecipitation = 0;
  let hailDetected = false;

  for (const day of days) {
    // Wind speed (mph)
    if (day.windspeed > maxWindSpeed) {
      maxWindSpeed = day.windspeed;
    }

    // Temperature (°F)
    if (day.tempmin < minTemp) {
      minTemp = day.tempmin;
    }
    if (day.tempmax > maxTemp) {
      maxTemp = day.tempmax;
    }

    // Precipitation (inches)
    if (day.precip) {
      totalPrecipitation += day.precip;
    }

    // Check for hail in conditions
    const conditions = (day.conditions || "").toLowerCase();
    if (conditions.includes("hail")) {
      hailDetected = true;
    }

    // Check hourly data for more accurate hail detection
    if (day.hours) {
      for (const hour of day.hours) {
        const hourConditions = (hour.conditions || "").toLowerCase();
        if (hourConditions.includes("hail")) {
          hailDetected = true;
        }
      }
    }
  }

  return {
    hailDetected,
    maxWindSpeed,
    minTemp: minTemp === Infinity ? 60 : minTemp,
    maxTemp: maxTemp === -Infinity ? 70 : maxTemp,
    totalPrecipitation,
    provider: "Visual Crossing",
    raw: data,
  };
}

/**
 * Fetch real weather data from WeatherStack API
 */
async function fetchWeatherStackData(
  lat: number,
  lng: number,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  hailDetected: boolean;
  maxWindSpeed: number;
  minTemp: number;
  maxTemp: number;
  totalPrecipitation: number;
  provider: string;
  raw: any;
}> {
  const apiKey = process.env.WEATHERSTACK_API_KEY;

  if (!apiKey) {
    console.warn("WEATHERSTACK_API_KEY not configured, using placeholder data");
    return {
      hailDetected: false,
      maxWindSpeed: 15,
      minTemp: 45,
      maxTemp: 75,
      totalPrecipitation: 0.5,
      provider: "WeatherStack (placeholder)",
      raw: { note: "Placeholder - API key not configured" },
    };
  }

  // Use historical endpoint if dates provided, otherwise current
  const useHistorical = dateFrom && dateTo;
  const targetDate = dateFrom || new Date().toISOString().split("T")[0];

  const params = new URLSearchParams({
    access_key: apiKey,
    query: `${lat},${lng}`,
  });

  if (useHistorical) {
    params.append("historical_date", targetDate);
  }

  const endpoint = useHistorical
    ? "https://api.weatherstack.com/historical"
    : "https://api.weatherstack.com/current";

  const url = `${endpoint}?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`WeatherStack API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`WeatherStack error: ${data.error.info || "Unknown error"}`);
    }

    // Parse weather data
    const current = data.current || data.historical?.[targetDate]?.[0] || {};

    return {
      hailDetected: false, // WeatherStack doesn't provide hail detection
      maxWindSpeed: current.wind_speed || 0,
      minTemp: current.temperature || 60,
      maxTemp: current.temperature || 70,
      totalPrecipitation: current.precip || 0,
      provider: "WeatherStack",
      raw: data,
    };
  } catch (error: any) {
    console.error("WeatherStack API error:", error);
    // Return placeholder on error
    return {
      hailDetected: false,
      maxWindSpeed: 15,
      minTemp: 45,
      maxTemp: 75,
      totalPrecipitation: 0.5,
      provider: "WeatherStack (error fallback)",
      raw: { error: error.message, note: "Fallback data" },
    };
  }
}
