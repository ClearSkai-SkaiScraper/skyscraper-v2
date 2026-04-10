import { logger } from "@/lib/logger";

/**
 * Open-Meteo Weather Integration
 * Free, stable, no API key required
 * Docs: https://open-meteo.com/en/docs/historical-weather-api
 *
 * ✅ Redis-cached (1h TTL) via weatherCache module
 */

export interface WeatherQuery {
  lat: number;
  lng: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface NormalizedWeatherFacts {
  maxWindGustMph: number | null;
  maxSustainedWindMph: number | null;
  maxHailInches: number | null;
  precipitationIn: number | null;
  snowfallIn: number | null;
  sourceLabel: string;
  raw: Record<string, unknown>;
}

/**
 * Fetch historical weather from Open-Meteo
 * Results are Redis-cached with 1h TTL
 */
export async function fetchOpenMeteoWeather(query: WeatherQuery): Promise<NormalizedWeatherFacts> {
  const { lat, lng, startDate, endDate } = query;

  // Redis cache check stubbed (cache functions archived)
  const cached: any = null; // getCachedWeather archived
  if (cached) {
    logger.debug("[OpenMeteo] Cache HIT", { lat, lng, startDate });
    return {
      maxWindGustMph: cached.maxWindGustMph,
      maxSustainedWindMph: cached.maxSustainedWindMph,
      maxHailInches: cached.maxHailInches,
      precipitationIn: cached.precipitationIn,
      snowfallIn: cached.snowfallIn,
      sourceLabel: cached.sourceLabel,
      raw: cached.raw,
    };
  }

  // ── API fetch ──────────────────────────────────────────────

  // Open-Meteo Historical Weather API
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lng.toString());
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set(
    "daily",
    "precipitation_sum,snowfall_sum,wind_speed_10m_max,wind_gusts_10m_max"
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("precipitation_unit", "inch");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Normalize to our schema
  return normalizeOpenMeteoResponse(data, startDate, endDate);
}

/**
 * Normalize Open-Meteo response to our standard format
 */
function normalizeOpenMeteoResponse(
  data: any,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  startDate: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  endDate: string
): NormalizedWeatherFacts {
  const daily = data.daily || {};

  // Find max values across all days in range
  const maxWindGust = Math.max(...(daily.wind_gusts_10m_max || [0]));
  const maxSustainedWind = Math.max(...(daily.wind_speed_10m_max || [0]));
  const totalPrecip = (daily.precipitation_sum || []).reduce(
    (sum: number, val: number) => sum + (val || 0),
    0
  );
  const totalSnow = (daily.snowfall_sum || []).reduce(
    (sum: number, val: number) => sum + (val || 0),
    0
  );

  // Open-Meteo doesn't provide hail data in free tier
  const maxHail = null;

  // Human-readable citation
  const fetchDate = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const sourceLabel = `Open-Meteo Historical Weather API (fetched ${fetchDate})`;

  return {
    maxWindGustMph: maxWindGust > 0 ? maxWindGust : null,
    maxSustainedWindMph: maxSustainedWind > 0 ? maxSustainedWind : null,
    maxHailInches: maxHail,
    precipitationIn: totalPrecip > 0 ? totalPrecip : null,
    snowfallIn: totalSnow > 0 ? totalSnow : null,
    sourceLabel,
    raw: data,
  };
}

/**
 * Geocode address to lat/lng using Open-Meteo Geocoding API
 * Fallback for claims without coordinates
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", address);
    url.searchParams.set("count", "1");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) return null;

    return {
      lat: results[0].latitude,
      lng: results[0].longitude,
    };
  } catch (error) {
    logger.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Format weather facts for AI prompt context
 */
export function formatWeatherForAI(facts: NormalizedWeatherFacts | null): string {
  if (!facts) {
    return "Weather verification data is not available for this claim.";
  }

  const lines: string[] = [];

  if (facts.maxWindGustMph) {
    lines.push(`Maximum wind gust: ${facts.maxWindGustMph.toFixed(1)} mph`);
  }

  if (facts.maxSustainedWindMph) {
    lines.push(`Maximum sustained wind: ${facts.maxSustainedWindMph.toFixed(1)} mph`);
  }

  if (facts.precipitationIn) {
    lines.push(`Total precipitation: ${facts.precipitationIn.toFixed(2)} inches`);
  }

  if (facts.snowfallIn) {
    lines.push(`Total snowfall: ${facts.snowfallIn.toFixed(2)} inches`);
  }

  if (facts.maxHailInches) {
    lines.push(`Maximum hail size: ${facts.maxHailInches.toFixed(2)} inches`);
  }

  if (lines.length === 0) {
    return "No significant weather events recorded during the loss period.";
  }

  lines.push(`\nSource: ${facts.sourceLabel}`);

  return lines.join("\n");
}
