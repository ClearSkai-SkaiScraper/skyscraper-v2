/**
 * Unified Claim Location Resolver
 *
 * SINGLE SOURCE OF TRUTH for resolving geographic location for any weather flow.
 * All weather subsystems should use this instead of ad-hoc geocoding.
 *
 * Fallback order:
 * 1. property_profiles.latitude/longitude (most accurate, pre-geocoded)
 * 2. claims lat/lng if stored
 * 3. weather_reports cached lat/lng
 * 4. Geocode from property_profiles.fullAddress
 * 5. Geocode from properties table fields
 * 6. Geocode from claim-level address fields
 *
 * Used by:
 * - Quick DOL scan
 * - Radar lookup
 * - Full Weather & Loss Justification PDF
 * - Storm evidence creation
 * - Weather attachments
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  source:
    | "property_profile"
    | "properties"
    | "claim"
    | "weather_report"
    | "geocoded_profile"
    | "geocoded_property"
    | "geocoded_claim";
}

export interface LocationResolutionError {
  code: "CLAIM_NOT_FOUND" | "NO_ADDRESS" | "GEOCODE_FAILED" | "NO_COORDINATES";
  message: string;
  claimId: string;
  attemptedAddress?: string;
}

export type LocationResult =
  | { ok: true; location: ResolvedLocation }
  | { ok: false; error: LocationResolutionError };

/**
 * Resolve location for a claim with robust fallback chain.
 * Returns coordinates + address info or a detailed error.
 */
export async function resolveClaimLocation(claimId: string): Promise<LocationResult> {
  logger.info("[LOCATION_RESOLVER] Resolving location", { claimId });

  // 1. Fetch claim with all possible location sources
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      propertyId: true,
      // Claim-level address fields (some schemas have these)
      properties: {
        select: {
          id: true,
          street: true,
          city: true,
          state: true,
          zipCode: true,
        },
      },
    },
  });

  if (!claim) {
    return {
      ok: false,
      error: {
        code: "CLAIM_NOT_FOUND",
        message: "Claim not found",
        claimId,
      },
    };
  }

  // 2. Check property_profiles for pre-geocoded lat/lng
  if (claim.propertyId) {
    const profile = await prisma.property_profiles.findUnique({
      where: { propertyId: claim.propertyId },
      select: {
        latitude: true,
        longitude: true,
        fullAddress: true,
        streetAddress: true,
        city: true,
        state: true,
        zipCode: true,
      },
    });

    if (profile?.latitude && profile?.longitude) {
      logger.info("[LOCATION_RESOLVER] ✅ Using property_profile coordinates", {
        claimId,
        lat: profile.latitude,
        lng: profile.longitude,
      });

      return {
        ok: true,
        location: {
          latitude: profile.latitude,
          longitude: profile.longitude,
          fullAddress: profile.fullAddress || buildAddressString(profile),
          street: profile.streetAddress || "",
          city: profile.city || "",
          state: profile.state || "",
          zip: profile.zipCode || "",
          source: "property_profile",
        },
      };
    }

    // Property profile exists but no coords - try geocoding its address
    if (profile?.fullAddress || profile?.streetAddress) {
      const addressToGeocode = profile.fullAddress || buildAddressString(profile);
      const coords = await geocodeWithFallback(addressToGeocode);

      if (coords) {
        // Optionally update property_profiles with geocoded coords
        try {
          await prisma.property_profiles.update({
            where: { propertyId: claim.propertyId },
            data: { latitude: coords.lat, longitude: coords.lng },
          });
          logger.info("[LOCATION_RESOLVER] Updated property_profile with geocoded coords", {
            claimId,
          });
        } catch {
          // Non-fatal - continue
        }

        return {
          ok: true,
          location: {
            latitude: coords.lat,
            longitude: coords.lng,
            fullAddress: addressToGeocode,
            street: profile.streetAddress || "",
            city: profile.city || "",
            state: profile.state || "",
            zip: profile.zipCode || "",
            source: "geocoded_profile",
          },
        };
      }
    }
  }

  // 3. Try properties table
  if (claim.properties) {
    const prop = claim.properties;
    const addressString = buildAddressString(prop);

    if (addressString) {
      const coords = await geocodeWithFallback(addressString);

      if (coords) {
        return {
          ok: true,
          location: {
            latitude: coords.lat,
            longitude: coords.lng,
            fullAddress: addressString,
            street: prop.street || "",
            city: prop.city || "",
            state: prop.state || "",
            zip: prop.zipCode || "",
            source: "geocoded_property",
          },
        };
      }

      // Geocoding failed but we have an address
      return {
        ok: false,
        error: {
          code: "GEOCODE_FAILED",
          message: `Geocoder returned no match for: "${addressString}"`,
          claimId,
          attemptedAddress: addressString,
        },
      };
    }
  }

  // 4. Check if there's a cached weather_report with lat/lng
  const cachedReport = await prisma.weather_reports.findFirst({
    where: { claimId },
    select: { lat: true, lng: true, address: true },
    orderBy: { createdAt: "desc" },
  });

  if (cachedReport?.lat && cachedReport?.lng) {
    logger.info("[LOCATION_RESOLVER] ✅ Using cached weather_report coordinates", {
      claimId,
      lat: cachedReport.lat,
      lng: cachedReport.lng,
    });

    return {
      ok: true,
      location: {
        latitude: cachedReport.lat,
        longitude: cachedReport.lng,
        fullAddress: cachedReport.address || "",
        street: "",
        city: "",
        state: "",
        zip: "",
        source: "weather_report",
      },
    };
  }

  // 5. No usable location found
  return {
    ok: false,
    error: {
      code: "NO_ADDRESS",
      message: "Claim has no usable property address or coordinates",
      claimId,
    },
  };
}

/**
 * Build address string from components
 */
function buildAddressString(parts: {
  street?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  zip?: string | null;
}): string {
  const street = parts.street || parts.streetAddress || "";
  const city = parts.city || "";
  const state = parts.state || "";
  const zip = parts.zipCode || parts.zip || "";

  const components = [street, city, state, zip].filter(Boolean);

  return components.join(", ").trim();
}

/**
 * Normalize address before geocoding
 */
function normalizeAddress(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, " ") // collapse multiple spaces
    .replace(/,+/g, ",") // collapse multiple commas
    .replace(/,\s*,/g, ",") // remove empty comma segments
    .replace(/^\s*,\s*/, "") // remove leading comma
    .replace(/\s*,\s*$/, ""); // remove trailing comma
}

/**
 * Geocode with multiple provider fallback
 */
async function geocodeWithFallback(
  rawAddress: string
): Promise<{ lat: number; lng: number } | null> {
  const address = normalizeAddress(rawAddress);

  if (!address || address.length < 5) {
    logger.warn("[LOCATION_RESOLVER] Address too short to geocode", { address });
    return null;
  }

  logger.debug("[LOCATION_RESOLVER] Geocoding address", { address });

  // Try Mapbox first (more accurate, requires token)
  const mapboxResult = await geocodeMapbox(address);
  if (mapboxResult) {
    logger.debug("[LOCATION_RESOLVER] ✅ Mapbox geocode success", { address });
    return mapboxResult;
  }

  // Fall back to Open-Meteo (free, no token)
  const openMeteoResult = await geocodeOpenMeteo(address);
  if (openMeteoResult) {
    logger.debug("[LOCATION_RESOLVER] ✅ Open-Meteo geocode success", { address });
    return openMeteoResult;
  }

  logger.warn("[LOCATION_RESOLVER] All geocoders failed", { address });
  return null;
}

/**
 * Geocode using Mapbox
 */
async function geocodeMapbox(address: string): Promise<{ lat: number; lng: number } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    return null;
  }

  try {
    const encoded = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&types=address,postcode,place&limit=1`;

    const res = await fetch(url, { next: { revalidate: 3600 } } as RequestInit);
    if (!res.ok) return null;

    const data = await res.json();
    const feature = data.features?.[0];

    if (!feature?.center) return null;

    const [lng, lat] = feature.center;
    return { lat, lng };
  } catch (err) {
    logger.error("[LOCATION_RESOLVER] Mapbox geocode error", { error: err });
    return null;
  }
}

/**
 * Geocode using Open-Meteo (free, no API key)
 */
async function geocodeOpenMeteo(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=1&language=en&format=json`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const result = data.results?.[0];

    if (!result?.latitude || !result?.longitude) return null;

    return { lat: result.latitude, lng: result.longitude };
  } catch (err) {
    logger.error("[LOCATION_RESOLVER] Open-Meteo geocode error", { error: err });
    return null;
  }
}

/**
 * Quick helper to get just lat/lng (for simpler use cases)
 */
export async function getClaimCoordinates(
  claimId: string
): Promise<{ lat: number; lng: number } | null> {
  const result = await resolveClaimLocation(claimId);
  if (!result.ok) return null;
  return { lat: result.location.latitude, lng: result.location.longitude };
}

/**
 * Format error for API responses
 */
export function formatLocationError(error: LocationResolutionError): string {
  switch (error.code) {
    case "CLAIM_NOT_FOUND":
      return "Claim not found";
    case "NO_ADDRESS":
      return "Claim has no usable property address";
    case "GEOCODE_FAILED":
      return `Geocoder returned no match for: "${error.attemptedAddress}"`;
    case "NO_COORDINATES":
      return "No coordinates or address available for this claim";
    default:
      return "Unable to resolve claim location";
  }
}
