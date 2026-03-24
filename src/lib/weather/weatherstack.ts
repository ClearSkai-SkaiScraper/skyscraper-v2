import "server-only";

import { logger } from "@/lib/logger";

// Visual Crossing is the primary provider (Weatherstack hit usage limit)
// eslint-disable-next-line no-restricted-syntax
const VISUALCROSSING_API_KEY = process.env.VISUALCROSSING_API_KEY;
// eslint-disable-next-line no-restricted-syntax
const WEATHERSTACK_API_KEY = process.env.WEATHERSTACK_API_KEY || process.env.WEATHER_STACK_API_KEY;

if (!VISUALCROSSING_API_KEY && !WEATHERSTACK_API_KEY) {
  logger.warn("[WEATHER] No API keys configured – weather will return null fallback.");
}

export type DashboardWeather = {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  iconUrl: string | null;
  windSpeed: number | null;
  humidity: number | null;
  pressure: number | null;
  uvIndex: number | null;
  visibility: number | null;
  updatedAt: string;
};

/**
 * Fetch current weather from Visual Crossing API (primary provider)
 */
async function fetchFromVisualCrossing(location: string): Promise<DashboardWeather | null> {
  if (!VISUALCROSSING_API_KEY) {
    return null;
  }

  const baseUrl =
    "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline";
  const params = new URLSearchParams({
    key: VISUALCROSSING_API_KEY,
    unitGroup: "us", // Fahrenheit
    contentType: "json",
    include: "current",
  });

  try {
    logger.debug(`[VISUALCROSSING] Fetching weather for: ${location}`);

    const res = await fetch(`${baseUrl}/${encodeURIComponent(location)}?${params.toString()}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    } as RequestInit);

    if (!res.ok) {
      const errorText = await res.text();
      logger.error("[VISUALCROSSING] HTTP error", { status: res.status, errorText });
      return null;
    }

    const json: any = await res.json();

    if (!json.currentConditions) {
      logger.error("[VISUALCROSSING] Unexpected response structure", { json });
      return null;
    }

    const cur = json.currentConditions;

    const weatherData: DashboardWeather = {
      location: json.resolvedAddress || location,
      temperature: Math.round(cur.temp),
      feelsLike: Math.round(cur.feelslike),
      condition: cur.conditions || "Unknown",
      iconUrl: null, // Visual Crossing uses icon names, not URLs
      windSpeed: cur.windspeed ?? null,
      humidity: cur.humidity ?? null,
      pressure: cur.pressure ?? null,
      uvIndex: cur.uvindex ?? null,
      visibility: cur.visibility ?? null,
      updatedAt: new Date().toISOString(),
    };

    logger.info(
      `[VISUALCROSSING] Success: ${weatherData.location} - ${weatherData.temperature}°F - ${weatherData.condition}`
    );

    return weatherData;
  } catch (err) {
    logger.error("[VISUALCROSSING] Fetch failed:", err);
    return null;
  }
}

/**
 * Fetch current weather from Weatherstack API (fallback provider)
 */
async function fetchFromWeatherstack(location: string): Promise<DashboardWeather | null> {
  if (!WEATHERSTACK_API_KEY) {
    return null;
  }

  const baseUrl = "http://api.weatherstack.com/current";
  const params = new URLSearchParams({
    access_key: WEATHERSTACK_API_KEY,
    query: location,
    units: "f", // Fahrenheit
  });

  try {
    logger.debug(`[WEATHERSTACK] Fetching weather for: ${location}`);

    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    } as RequestInit);

    if (!res.ok) {
      const errorText = await res.text();
      logger.error("[WEATHERSTACK] HTTP error", { status: res.status, errorText });
      return null;
    }

    const json: any = await res.json();

    if (json.error) {
      logger.error("[WEATHERSTACK] API error", { error: json.error });
      return null;
    }

    if (!json.location || !json.current) {
      logger.error("[WEATHERSTACK] Unexpected response structure", { json });
      return null;
    }

    const loc = json.location;
    const cur = json.current;

    const weatherData: DashboardWeather = {
      location: `${loc.name}${loc.region ? `, ${loc.region}` : ""}`.trim(),
      temperature: cur.temperature,
      feelsLike: cur.feelslike,
      condition: Array.isArray(cur.weather_descriptions)
        ? cur.weather_descriptions[0]
        : cur.weather_descriptions || "Unknown",
      iconUrl: Array.isArray(cur.weather_icons) ? cur.weather_icons[0] : cur.weather_icons || null,
      windSpeed: cur.wind_speed ?? null,
      humidity: cur.humidity ?? null,
      pressure: cur.pressure ?? null,
      uvIndex: cur.uv_index ?? null,
      visibility: cur.visibility ?? null,
      updatedAt: loc.localtime || new Date().toISOString(),
    };

    logger.info(
      `[WEATHERSTACK] Success: ${weatherData.location} - ${weatherData.temperature}°F - ${weatherData.condition}`
    );

    return weatherData;
  } catch (err) {
    logger.error("[WEATHERSTACK] Fetch failed:", err);
    return null;
  }
}

/**
 * Fetch current weather data with automatic fallback
 * Primary: Visual Crossing | Fallback: Weatherstack
 *
 * @param location - City name, ZIP code, or coordinates (e.g., "Prescott, AZ", "85301", "34.54,-112.47")
 * @returns Weather data or null if unavailable
 */
export async function getDashboardWeather(location: string): Promise<DashboardWeather | null> {
  // Try Visual Crossing first (primary provider)
  const vcResult = await fetchFromVisualCrossing(location);
  if (vcResult) {
    return vcResult;
  }

  // Fall back to Weatherstack
  logger.debug("[WEATHER] Visual Crossing failed, trying Weatherstack fallback...");
  const wsResult = await fetchFromWeatherstack(location);
  if (wsResult) {
    return wsResult;
  }

  logger.warn("[WEATHER] All providers failed for location:", location);
  return null;
}
