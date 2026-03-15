/**
 * Geographic Query Utility — Haversine Distance
 *
 * Provides radius-based queries for finding nearby claims, properties,
 * and storm data without PostGIS. Uses the Haversine formula for
 * great-circle distance calculations.
 *
 * Phase 1.3 of the Claim Simulation + Storm Graph system.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface NearbyClaimResult {
  claimId: string;
  claimNumber: string;
  propertyId: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  damageType: string;
  status: string;
  dateOfLoss: Date;
  catStormEventId: string | null;
}

export interface NearbyPropertyResult {
  propertyId: string;
  profileId: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  roofType: string | null;
  roofAge: number | null;
  hailRiskScore: number | null;
  windRiskScore: number | null;
}

export interface NearbyImpactResult {
  impactId: string;
  stormEventId: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  riskLevel: string;
  damageProba: number;
  hailSizeAtLocation: number | null;
  windSpeedAtLocation: number | null;
  claimId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Haversine Formula
// ─────────────────────────────────────────────────────────────────────────────

const EARTH_RADIUS_MILES = 3959;

/**
 * Calculate the distance in miles between two lat/lng points
 * using the Haversine formula.
 */
export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);

  const sinDlat = Math.sin(dLat / 2);
  const sinDlng = Math.sin(dLng / 2);

  const h =
    sinDlat * sinDlat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinDlng * sinDlng;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

// ─────────────────────────────────────────────────────────────────────────────
// Bounding Box (fast pre-filter before Haversine)
// ─────────────────────────────────────────────────────────────────────────────

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Compute a bounding box around a point for fast SQL pre-filtering.
 * The box is slightly larger than the actual radius to avoid edge-case misses.
 */
export function boundingBox(center: GeoPoint, radiusMiles: number): BoundingBox {
  const latDelta = radiusMiles / 69.0; // ~69 miles per degree of latitude
  const lngDelta = radiusMiles / (69.0 * Math.cos((center.latitude * Math.PI) / 180));

  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLng: center.longitude - lngDelta,
    maxLng: center.longitude + lngDelta,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find claims within a radius of a given point.
 * Uses bounding box pre-filter + Haversine for accuracy.
 */
export async function findNearbyClaims(
  center: GeoPoint,
  radiusMiles: number,
  orgId: string,
  options?: {
    excludeClaimId?: string;
    stormEventId?: string;
    limit?: number;
  }
): Promise<NearbyClaimResult[]> {
  const box = boundingBox(center, radiusMiles * 1.1); // 10% buffer
  const limit = options?.limit ?? 50;

  const stormFilter = options?.stormEventId
    ? `AND c."catStormEventId" = '${options.stormEventId}'`
    : "";
  const excludeFilter = options?.excludeClaimId ? `AND c.id != '${options.excludeClaimId}'` : "";

  const results = await prisma.$queryRawUnsafe<
    Array<{
      claim_id: string;
      claim_number: string;
      property_id: string;
      address: string;
      latitude: number;
      longitude: number;
      distance_miles: number;
      damage_type: string;
      status: string;
      date_of_loss: Date;
      storm_event_id: string | null;
    }>
  >(
    `
    SELECT
      c.id AS claim_id,
      c."claimNumber" AS claim_number,
      c."propertyId" AS property_id,
      COALESCE(pp."fullAddress", p.street || ', ' || p.city || ', ' || p.state || ' ' || p.zip) AS address,
      pp.latitude,
      pp.longitude,
      (${EARTH_RADIUS_MILES} * acos(
        LEAST(1.0, cos(radians($1)) * cos(radians(pp.latitude)) *
        cos(radians(pp.longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(pp.latitude)))
      )) AS distance_miles,
      c."damageType" AS damage_type,
      c.status,
      c."dateOfLoss" AS date_of_loss,
      c."catStormEventId" AS storm_event_id
    FROM claims c
    JOIN properties p ON c."propertyId" = p.id
    JOIN property_profiles pp ON pp."propertyId" = p.id
    WHERE c."orgId" = $3
      AND pp.latitude IS NOT NULL
      AND pp.longitude IS NOT NULL
      AND pp.latitude BETWEEN $4 AND $5
      AND pp.longitude BETWEEN $6 AND $7
      ${stormFilter}
      ${excludeFilter}
    HAVING (${EARTH_RADIUS_MILES} * acos(
      LEAST(1.0, cos(radians($1)) * cos(radians(pp.latitude)) *
      cos(radians(pp.longitude) - radians($2)) +
      sin(radians($1)) * sin(radians(pp.latitude)))
    )) < $8
    ORDER BY distance_miles ASC
    LIMIT $9
    `,
    center.latitude,
    center.longitude,
    orgId,
    box.minLat,
    box.maxLat,
    box.minLng,
    box.maxLng,
    radiusMiles,
    limit
  );

  return results.map((r) => ({
    claimId: r.claim_id,
    claimNumber: r.claim_number,
    propertyId: r.property_id,
    address: r.address,
    latitude: r.latitude,
    longitude: r.longitude,
    distanceMiles: Math.round(r.distance_miles * 100) / 100,
    damageType: r.damage_type,
    status: r.status,
    dateOfLoss: r.date_of_loss,
    catStormEventId: r.storm_event_id,
  }));
}

/**
 * Find property profiles within a radius.
 */
export async function findNearbyProperties(
  center: GeoPoint,
  radiusMiles: number,
  orgId: string,
  limit = 100
): Promise<NearbyPropertyResult[]> {
  const box = boundingBox(center, radiusMiles * 1.1);

  const results = await prisma.$queryRawUnsafe<
    Array<{
      property_id: string;
      profile_id: string;
      address: string;
      latitude: number;
      longitude: number;
      distance_miles: number;
      roof_type: string | null;
      roof_age: number | null;
      hail_risk: number | null;
      wind_risk: number | null;
    }>
  >(
    `
    SELECT
      pp."propertyId" AS property_id,
      pp.id AS profile_id,
      pp."fullAddress" AS address,
      pp.latitude,
      pp.longitude,
      (${EARTH_RADIUS_MILES} * acos(
        LEAST(1.0, cos(radians($1)) * cos(radians(pp.latitude)) *
        cos(radians(pp.longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(pp.latitude)))
      )) AS distance_miles,
      pp."roofType" AS roof_type,
      pp."roofAge" AS roof_age,
      pp."hailRiskScore" AS hail_risk,
      pp."windRiskScore" AS wind_risk
    FROM property_profiles pp
    WHERE pp."orgId" = $3
      AND pp.latitude IS NOT NULL
      AND pp.longitude IS NOT NULL
      AND pp.latitude BETWEEN $4 AND $5
      AND pp.longitude BETWEEN $6 AND $7
    HAVING (${EARTH_RADIUS_MILES} * acos(
      LEAST(1.0, cos(radians($1)) * cos(radians(pp.latitude)) *
      cos(radians(pp.longitude) - radians($2)) +
      sin(radians($1)) * sin(radians(pp.latitude)))
    )) < $8
    ORDER BY distance_miles ASC
    LIMIT $9
    `,
    center.latitude,
    center.longitude,
    orgId,
    box.minLat,
    box.maxLat,
    box.minLng,
    box.maxLng,
    radiusMiles,
    limit
  );

  return results.map((r) => ({
    propertyId: r.property_id,
    profileId: r.profile_id,
    address: r.address,
    latitude: r.latitude,
    longitude: r.longitude,
    distanceMiles: Math.round(r.distance_miles * 100) / 100,
    roofType: r.roof_type,
    roofAge: r.roof_age,
    hailRiskScore: r.hail_risk,
    windRiskScore: r.wind_risk,
  }));
}

/**
 * Find property impacts (from storm events) within a radius.
 */
export async function findNearbyImpacts(
  center: GeoPoint,
  radiusMiles: number,
  orgId: string,
  options?: { stormEventId?: string; limit?: number }
): Promise<NearbyImpactResult[]> {
  const box = boundingBox(center, radiusMiles * 1.1);
  const limit = options?.limit ?? 100;
  const stormFilter = options?.stormEventId
    ? `AND pi."stormEventId" = '${options.stormEventId}'`
    : "";

  const results = await prisma.$queryRawUnsafe<
    Array<{
      impact_id: string;
      storm_event_id: string;
      address: string;
      latitude: number;
      longitude: number;
      distance_miles: number;
      risk_level: string;
      damage_proba: number;
      hail_size: number | null;
      wind_speed: number | null;
      claim_id: string | null;
    }>
  >(
    `
    SELECT
      pi.id AS impact_id,
      pi."stormEventId" AS storm_event_id,
      pi.address,
      pi.lat::float AS latitude,
      pi.lng::float AS longitude,
      (${EARTH_RADIUS_MILES} * acos(
        LEAST(1.0, cos(radians($1)) * cos(radians(pi.lat::float)) *
        cos(radians(pi.lng::float) - radians($2)) +
        sin(radians($1)) * sin(radians(pi.lat::float)))
      )) AS distance_miles,
      pi."riskLevel" AS risk_level,
      pi."damageProba" AS damage_proba,
      pi."hailSizeAtLocation"::float AS hail_size,
      pi."windSpeedAtLocation" AS wind_speed,
      pi."claimId" AS claim_id
    FROM property_impacts pi
    WHERE pi."orgId" = $3
      AND pi.lat::float BETWEEN $4 AND $5
      AND pi.lng::float BETWEEN $6 AND $7
      ${stormFilter}
    HAVING (${EARTH_RADIUS_MILES} * acos(
      LEAST(1.0, cos(radians($1)) * cos(radians(pi.lat::float)) *
      cos(radians(pi.lng::float) - radians($2)) +
      sin(radians($1)) * sin(radians(pi.lat::float)))
    )) < $8
    ORDER BY distance_miles ASC
    LIMIT $9
    `,
    center.latitude,
    center.longitude,
    orgId,
    box.minLat,
    box.maxLat,
    box.minLng,
    box.maxLng,
    radiusMiles,
    limit
  );

  return results.map((r) => ({
    impactId: r.impact_id,
    stormEventId: r.storm_event_id,
    address: r.address,
    latitude: r.latitude,
    longitude: r.longitude,
    distanceMiles: Math.round(r.distance_miles * 100) / 100,
    riskLevel: r.risk_level,
    damageProba: r.damage_proba,
    hailSizeAtLocation: r.hail_size,
    windSpeedAtLocation: r.wind_speed,
    claimId: r.claim_id,
  }));
}

/**
 * Get the geographic center of a claim from its property profile.
 */
export async function getClaimLocation(claimId: string): Promise<GeoPoint | null> {
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: { propertyId: true },
  });

  if (!claim?.propertyId) return null;

  const profile = await prisma.property_profiles.findUnique({
    where: { propertyId: claim.propertyId },
    select: { latitude: true, longitude: true },
  });

  if (!profile?.latitude || !profile?.longitude) return null;

  return { latitude: profile.latitude, longitude: profile.longitude };
}

logger.info("[GEO] Geographic query utility loaded");
