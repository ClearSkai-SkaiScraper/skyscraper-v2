import "server-only";

import { logger } from "@/lib/logger";

import type { NormalizedLocation } from "../weather/storm-types";

/**
 * Geocode an address string to latitude/longitude using Mapbox Geocoding API
 */
export async function geocodeAddress(address: string): Promise<NormalizedLocation | null> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxToken) {
    logger.warn(`[GEOCODE] Mapbox token not configured - geocoding disabled`);
    return null;
  }

  try {
    const encoded = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${mapboxToken}&types=address,postcode,place,region&limit=1`;

    const res = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    } as RequestInit);

    if (!res.ok) {
      logger.error(`[GEOCODE] HTTP error: ${res.status}`);
      return null;
    }

    const data: any = await res.json();

    if (!data.features || data.features.length === 0) {
      logger.debug(`[GEOCODE] No results for address: ${address}`);
      return null;
    }

    const feature = data.features[0];
    const [lon, lat] = feature.center;

    // Extract address components from Mapbox context
    const components = parseAddressComponents(feature);

    logger.debug(`[GEOCODE] ✅ Geocoded: ${address} -> ${lat}, ${lon}`);

    return {
      address: components.address || address,
      city: components.city || "",
      state: components.state || "",
      zip: components.zip || "",
      county: components.county,
      latitude: lat,
      longitude: lon,
    };
  } catch (error) {
    logger.error(`[GEOCODE] Failed to geocode address:`, error);
    return null;
  }
}

/**
 * Parse Mapbox geocoding response to extract address components
 */
export function parseAddressComponents(feature: any): {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
} {
  const result: any = {};

  // Main place_name is often the full address
  if (feature.place_name) {
    result.address = feature.place_name.split(",")[0];
  }

  // Parse context array for structured components
  if (feature.context && Array.isArray(feature.context)) {
    for (const ctx of feature.context) {
      if (ctx.id.startsWith("postcode")) {
        result.zip = ctx.text;
      } else if (ctx.id.startsWith("place")) {
        result.city = ctx.text;
      } else if (ctx.id.startsWith("region")) {
        result.state = ctx.short_code?.replace("US-", "") || ctx.text;
      } else if (ctx.id.startsWith("district")) {
        result.county = ctx.text;
      }
    }
  }

  return result;
}
