/**
 * FREE WEATHER STACK - Iowa State Mesonet
 * Fetches hail and wind storm reports (100% free, no API key)
 */

import { logger } from "@/lib/logger";
import type { WeatherEvent } from "@/types/weather";

const MESONET_API_BASE =
  process.env.MESONET_API_BASE || "https://mesonet.agron.iastate.edu/geojson";

export interface MesonetFeature {
  type: "Feature";
  properties: {
    event: "HAIL" | "WIND" | "TORNADO";
    magnitude?: number; // Hail size (inches) or wind speed (mph)
    city?: string;
    county?: string;
    state?: string;
    source?: string;
    valid: string; // ISO timestamp
  };
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
}

interface MesonetResponse {
  type: "FeatureCollection";
  features: MesonetFeature[];
}

/**
 * Fetch storm reports from Iowa State Mesonet
 */
export async function fetchMesonetReports(opts: {
  bbox: string; // "minLon,minLat,maxLon,maxLat"
  startIso: string;
  endIso: string;
}): Promise<MesonetFeature[]> {
  // Mesonet uses YYYY-MM-DD format (not full ISO)
  const startDate = opts.startIso.split("T")[0];
  const endDate = opts.endIso.split("T")[0];

  const url = `${MESONET_API_BASE}/lsr.geojson?sts=${startDate}T00:00Z&ets=${endDate}T23:59Z&wfos=ALL`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SkaiScraper/1.0" },
      next: { revalidate: 600 }, // Cache for 10min
    });

    if (!res.ok) {
      logger.warn(`Mesonet fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const text = await res.text();
    if (!text || text.trim().length === 0) {
      logger.warn("Mesonet returned empty response");
      return [];
    }

    let data: MesonetResponse;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("Mesonet JSON parse error:", parseError, "Response:", text.substring(0, 200));
      return [];
    }

    // Filter to bounding box manually (Mesonet doesn't support bbox param)
    const [minLon, minLat, maxLon, maxLat] = opts.bbox.split(",").map(Number);

    return (data.features || []).filter((f) => {
      const [lon, lat] = f.geometry.coordinates;
      return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
    });
  } catch (error) {
    logger.error("Mesonet fetch error:", error);
    return [];
  }
}

/**
 * Normalize Mesonet reports into WeatherEvent format
 */
export function mesonetToEvents(reports: MesonetFeature[]): WeatherEvent[] {
  return reports.map((report) => {
    const props = report.properties;

    const type: WeatherEvent["type"] =
      props.event === "HAIL"
        ? "hail_report"
        : props.event === "WIND"
          ? "wind_report"
          : "svr_warning"; // Default fallback

    return {
      id: `mesonet:${props.valid}:${report.geometry.coordinates.join(",")}`,
      source: "mesonet" as const,
      type,
      time_utc: props.valid,
      magnitude: props.magnitude,
      geometry: report.geometry,
      raw_ref: `${props.city || "Unknown"}, ${props.county || ""} ${props.state || ""}`.trim(),
      quality_score: 0.85, // Good confidence (official reports)
      metadata: {
        city: props.city,
        county: props.county,
        state: props.state,
        source: props.source,
      },
    };
  });
}
