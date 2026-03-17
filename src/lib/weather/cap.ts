/**
 * FREE WEATHER STACK - NWS CAP Alerts
 * Fetches severe weather warnings from weather.gov (100% free, no API key)
 */

import { logger } from "@/lib/logger";
import type { WeatherEvent } from "@/types/weather";

const CAP_API_BASE = process.env.CAP_API_BASE || "https://api.weather.gov/alerts";

export interface CAPAlert {
  id: string;
  properties: {
    sent: string;
    event: string; // "Severe Thunderstorm Warning", "Tornado Warning", etc.
    headline?: string;
    description?: string;
    instruction?: string;
    areaDesc?: string;
    polygon?: string; // "lat,lon lat,lon lat,lon ..."
    geocode?: {
      FIPS?: string[];
      UGC?: string[];
    };
  };
}

interface CAPResponse {
  features: CAPAlert[];
}

/**
 * Fetch CAP alerts for a geographic bounding box and time window
 */
export async function fetchCAPAlerts(opts: {
  bbox: string; // "minLon,minLat,maxLon,maxLat"
  startIso: string;
  endIso: string;
}): Promise<CAPAlert[]> {
  const url = `${CAP_API_BASE}?point=${opts.bbox}&start=${opts.startIso}&end=${opts.endIso}&status=actual`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SkaiScraper/1.0" },
      next: { revalidate: 300 }, // Cache for 5min
    });

    if (!res.ok) {
      logger.warn(`CAP fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const text = await res.text();
    if (!text || text.trim().length === 0) {
      logger.warn("CAP returned empty response");
      return [];
    }

    try {
      const data: CAPResponse = JSON.parse(text);
      return data.features || [];
    } catch (parseError) {
      console.error("CAP JSON parse error:", parseError, "Response:", text.substring(0, 200));
      return [];
    }
  } catch (error) {
    logger.error("CAP fetch error:", error);
    return [];
  }
}

/**
 * Normalize CAP alerts into WeatherEvent format
 */
export function capToEvents(alerts: CAPAlert[]): WeatherEvent[] {
  return alerts
    .map((alert) => {
      const props = alert.properties;

      // Determine event type from CAP event name
      let type: WeatherEvent["type"] = "svr_warning";
      if (props.event.includes("Tornado")) type = "tor_warning";
      else if (props.event.includes("Flash Flood")) type = "ff_warning";
      else if (props.event.includes("Marine")) type = "smw_warning";

      // Parse polygon coordinates (CAP format: "lat,lon lat,lon ...")
      const coords = (props.polygon ?? "")
        .trim()
        .split(" ")
        .map((p) => {
          const [lat, lon] = p.split(",").map(Number);
          return [Number(lon), Number(lat)] as [number, number]; // GeoJSON order: [lon, lat]
        })
        .filter((xy) => xy.length === 2 && !isNaN(xy[0]) && !isNaN(xy[1]));

      const geometry: GeoJSON.Geometry =
        coords.length > 2
          ? { type: "Polygon", coordinates: [coords] }
          : coords.length === 1
            ? { type: "Point", coordinates: coords[0] }
            : { type: "Point", coordinates: [0, 0] }; // Fallback (should filter out later)

      return {
        id: alert.id,
        source: "cap" as const,
        type,
        time_utc: props.sent,
        geometry,
        raw_ref: alert.id,
        quality_score: 0.9, // High confidence (official NWS data)
        metadata: {
          event: props.event,
          headline: props.headline,
          description: props.description,
          instruction: props.instruction,
          areaDesc: props.areaDesc,
        },
      };
    })
    .filter((e) => {
      // Filter out invalid geometries
      if (e.geometry.type === "Point") {
        const [lon, lat] = e.geometry.coordinates as [number, number];
        return lon !== 0 || lat !== 0;
      }
      return true;
    });
}
