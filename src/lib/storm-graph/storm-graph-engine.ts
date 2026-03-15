/**
 * Storm Graph Engine — Cross-Claim Intelligence
 *
 * Phase 3.1 of the Claim Simulation + Storm Graph system.
 *
 * The Storm Graph answers the most powerful question in restoration:
 * "What other damage has this storm caused nearby?"
 *
 * It creates a network of connected claims, properties, and storm events
 * to prove that damage is real, widespread, and consistent with weather data.
 *
 * Key capabilities:
 *   1. Storm Cluster Detection — Group nearby claims by storm event
 *   2. Damage Corroboration   — Find verified damage near a claim
 *   3. Geographic Heat Map    — Visualize damage density
 *   4. Timeline Narrative     — Build a story of storm progression
 *   5. Address Pre-Qualification — Predict damage likelihood at any address
 */

import {
  findNearbyClaims,
  findNearbyImpacts,
  getClaimLocation,
  haversineDistance,
} from "@/lib/geo";
import type { GeoPoint, NearbyClaimResult, NearbyImpactResult } from "@/lib/geo/queries";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StormCluster {
  clusterId: string;
  stormEventId: string | null;
  stormType: string;
  stormDate: string;
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  totalClaims: number;
  verifiedClaims: number;
  totalProperties: number;
  impactedProperties: number;
  avgDamageSeverity: number;
  avgHailSize: number | null;
  maxWindSpeed: number | null;
  confidenceLevel: "high" | "medium" | "low";
  members: ClusterMember[];
}

export interface ClusterMember {
  claimId: string;
  claimNumber: string;
  address: string;
  distanceMiles: number;
  damageType: string;
  status: string;
  verificationLevel: "confirmed" | "likely" | "unverified";
  detectionCount: number;
}

export interface CorroborationResult {
  claimId: string;
  orgId: string;
  corroborationScore: number; // 0-100
  nearbyVerifiedDamage: number;
  nearbyDenied: number;
  stormClusters: StormCluster[];
  damagePattern: DamagePattern;
  geographicDensity: GeographicDensity;
  timeline: StormTimelineEntry[];
  preQualScore: number; // 0-100, how likely damage at this location
  computedAt: string;
}

export interface DamagePattern {
  dominantDamageType: string;
  consistencyScore: number; // 0-100
  averageDetectionConfidence: number;
  commonDetectionTypes: string[];
  outlierClaims: string[];
}

export interface GeographicDensity {
  radiusMile1: number; // claims within 1 mile
  radiusMile3: number;
  radiusMile5: number;
  radiusMile10: number;
  hotspotCenter: GeoPoint | null;
  hotspotRadiusMiles: number;
}

export interface StormTimelineEntry {
  timestamp: string;
  type: "storm_detected" | "first_impact" | "claim_filed" | "claim_verified" | "cluster_formed";
  description: string;
  claimId?: string;
  stormEventId?: string;
  location?: GeoPoint;
}

export interface AddressPreQualification {
  address: string;
  latitude: number;
  longitude: number;
  preQualScore: number; // 0-100
  damagelikelihood: "very_high" | "high" | "moderate" | "low" | "unknown";
  nearbyVerifiedClaims: number;
  nearbyStormEvents: number;
  estimatedHailSize: number | null;
  estimatedWindSpeed: number | null;
  riskFactors: string[];
  recommendation: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CLUSTER_RADIUS_MILES = 10;
const CORROBORATION_RADIUS_MILES = 5;
const MAX_TIMELINE_ENTRIES = 50;
const PREQUAL_RADIUS_MILES = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Main Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the full Storm Graph for a claim — clusters, corroboration, density, timeline.
 */
export async function buildStormGraph(
  claimId: string,
  orgId: string
): Promise<CorroborationResult> {
  const startTime = Date.now();

  // Step 1: Get claim location
  const location = await getClaimLocation(claimId);
  if (!location) {
    logger.warn("[STORM_GRAPH] No location for claim", { claimId });
    return emptyCorroboration(claimId, orgId);
  }

  // Step 2: Gather all nearby data in parallel
  const [nearbyClaims, nearbyImpacts, stormEvents, claimDetections] = await Promise.all([
    findNearbyClaims(location, CLUSTER_RADIUS_MILES, orgId),
    findNearbyImpacts(location, CLUSTER_RADIUS_MILES, orgId),
    findNearbyStormEvents(location, CLUSTER_RADIUS_MILES, orgId),
    prisma.claim_detections.findMany({
      where: { claimId },
      select: { className: true, confidence: true, modelGroup: true },
    }),
  ]);

  // Step 3: Build storm clusters
  const clusters = buildClusters(nearbyClaims, nearbyImpacts, stormEvents, orgId);

  // Step 4: Compute corroboration
  const nearbyVerified = nearbyClaims.filter(
    (c) => c.claimId !== claimId && ["APPROVED", "SUBMITTED", "IN_REVIEW"].includes(c.status || "")
  );
  const nearbyDenied = nearbyClaims.filter((c) => c.claimId !== claimId && c.status === "DENIED");

  // Step 5: Damage pattern analysis
  const damagePattern = analyzeDamagePattern(nearbyClaims, claimDetections, claimId);

  // Step 6: Geographic density
  const geographicDensity = computeDensity(nearbyClaims, location, claimId);

  // Step 7: Build timeline
  const timeline = buildTimeline(nearbyClaims, stormEvents, nearbyImpacts, claimId);

  // Step 8: Pre-qualification score for this location
  const preQualScore = computePreQualScore(
    nearbyVerified.length,
    nearbyDenied.length,
    stormEvents.length,
    nearbyImpacts.length,
    geographicDensity
  );

  // Step 9: Overall corroboration score
  const corroborationScore = computeCorroborationScore(
    nearbyVerified.length,
    nearbyDenied.length,
    clusters.length,
    damagePattern.consistencyScore,
    stormEvents.length,
    preQualScore
  );

  const elapsed = Date.now() - startTime;
  logger.info("[STORM_GRAPH] Built storm graph", {
    claimId,
    orgId,
    clusters: clusters.length,
    nearbyClaims: nearbyClaims.length,
    corroborationScore,
    elapsed: `${elapsed}ms`,
  });

  return {
    claimId,
    orgId,
    corroborationScore,
    nearbyVerifiedDamage: nearbyVerified.length,
    nearbyDenied: nearbyDenied.length,
    stormClusters: clusters,
    damagePattern,
    geographicDensity,
    timeline,
    preQualScore,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Pre-qualify an address for storm damage without an existing claim.
 */
export async function preQualifyAddress(
  latitude: number,
  longitude: number,
  address: string,
  orgId: string
): Promise<AddressPreQualification> {
  const point: GeoPoint = { latitude, longitude };

  const [nearbyClaims, nearbyImpacts, stormEvents] = await Promise.all([
    findNearbyClaims(point, PREQUAL_RADIUS_MILES, orgId),
    findNearbyImpacts(point, PREQUAL_RADIUS_MILES, orgId),
    findNearbyStormEvents(point, PREQUAL_RADIUS_MILES, orgId),
  ]);

  const verifiedClaims = nearbyClaims.filter((c) =>
    ["APPROVED", "SUBMITTED", "IN_REVIEW"].includes(c.status || "")
  );

  // Estimate weather conditions from nearby data
  const avgHail =
    stormEvents.length > 0
      ? stormEvents.reduce((sum, s) => sum + (s.hailSizeAvg || 0), 0) / stormEvents.length
      : null;
  const maxWind =
    stormEvents.length > 0 ? Math.max(...stormEvents.map((s) => s.windSpeedMax || 0)) : null;

  const density = computeDensity(nearbyClaims, point, "");
  const preQualScore = computePreQualScore(
    verifiedClaims.length,
    nearbyClaims.filter((c) => c.status === "DENIED").length,
    stormEvents.length,
    nearbyImpacts.length,
    density
  );

  const riskFactors: string[] = [];
  if (verifiedClaims.length >= 5)
    riskFactors.push(
      `${verifiedClaims.length} verified claims within ${PREQUAL_RADIUS_MILES} miles`
    );
  if (stormEvents.length >= 2)
    riskFactors.push(`${stormEvents.length} storm events detected in area`);
  if (avgHail && avgHail >= 1.0)
    riskFactors.push(`Average hail size ${avgHail.toFixed(2)}" — above damage threshold`);
  if (maxWind && maxWind >= 60) riskFactors.push(`Wind gusts up to ${maxWind} mph recorded`);
  if (nearbyImpacts.length >= 10)
    riskFactors.push(`${nearbyImpacts.length} properties identified as impacted`);
  if (density.radiusMile1 >= 3)
    riskFactors.push(`High damage density — ${density.radiusMile1} claims within 1 mile`);

  const damageLikelihood: AddressPreQualification["damagelikelihood"] =
    preQualScore >= 80
      ? "very_high"
      : preQualScore >= 60
        ? "high"
        : preQualScore >= 40
          ? "moderate"
          : preQualScore >= 20
            ? "low"
            : "unknown";

  const recommendation =
    preQualScore >= 70
      ? "High probability of storm damage. Recommend immediate inspection and documentation."
      : preQualScore >= 50
        ? "Moderate probability of storm damage. Area shows pattern of verified damage. Inspection recommended."
        : preQualScore >= 30
          ? "Some storm activity in area. Consider outreach to property owner for assessment."
          : "Low storm activity detected. Monitor for future events.";

  logger.info("[STORM_GRAPH_PREQUAL] Address pre-qualified", {
    address,
    preQualScore,
    verifiedClaims: verifiedClaims.length,
    stormEvents: stormEvents.length,
  });

  return {
    address,
    latitude,
    longitude,
    preQualScore,
    damagelikelihood: damageLikelihood,
    nearbyVerifiedClaims: verifiedClaims.length,
    nearbyStormEvents: stormEvents.length,
    estimatedHailSize: avgHail ? Number(avgHail.toFixed(2)) : null,
    estimatedWindSpeed: maxWind || null,
    riskFactors,
    recommendation,
  };
}

/**
 * Persist a storm cluster to the database for reuse.
 */
export async function persistStormCluster(cluster: StormCluster, orgId: string): Promise<string> {
  const id = createId();

  // Count damage types from members
  const hailCount = cluster.members.filter((m) =>
    m.damageType.toLowerCase().includes("hail")
  ).length;
  const windCount = cluster.members.filter((m) =>
    m.damageType.toLowerCase().includes("wind")
  ).length;
  const waterCount = cluster.members.filter((m) =>
    m.damageType.toLowerCase().includes("water")
  ).length;

  await prisma.storm_clusters.create({
    data: {
      id,
      orgId,
      stormEventId: cluster.stormEventId || "",
      centerLat: cluster.centerLat,
      centerLng: cluster.centerLng,
      radiusMiles: cluster.radiusMiles,
      totalProperties: cluster.totalProperties,
      inspectedProperties: cluster.impactedProperties,
      claimsInCluster: cluster.totalClaims,
      verifiedDamage: cluster.verifiedClaims,
      hailDamageCount: hailCount,
      windDamageCount: windCount,
      waterDamageCount: waterCount,
      collateralDamageCount: cluster.members.length - hailCount - windCount - waterCount,
      corroborationScore: cluster.avgDamageSeverity,
      corroborationLevel: cluster.confidenceLevel,
      avgHailSize: cluster.avgHailSize,
      avgWindSpeed: cluster.maxWindSpeed,
      heatmapData: cluster.members.map((m) => ({
        lat: 0, // populated when full geo data available
        lng: 0,
        intensity: m.verificationLevel === "confirmed" ? 1 : 0.5,
        claimId: m.claimId,
      })),
    },
  });

  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface StormEventRow {
  id: string;
  eventType: string;
  detectedAt: Date;
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  hailSizeAvg: number | null;
  windSpeedMax: number | null;
  estimatedPropertiesImpacted: number;
  severity: number;
}

async function findNearbyStormEvents(
  point: GeoPoint,
  radiusMiles: number,
  orgId: string
): Promise<StormEventRow[]> {
  const latDelta = radiusMiles / 69;
  const lngDelta = radiusMiles / (69 * Math.cos((point.latitude * Math.PI) / 180));

  const events = await prisma.storm_events.findMany({
    where: {
      orgId,
      centerLat: {
        gte: point.latitude - latDelta,
        lte: point.latitude + latDelta,
      },
      centerLng: {
        gte: point.longitude - lngDelta,
        lte: point.longitude + lngDelta,
      },
    },
    select: {
      id: true,
      eventType: true,
      detectedAt: true,
      centerLat: true,
      centerLng: true,
      radiusMiles: true,
      hailSizeAvg: true,
      windSpeedMax: true,
      estimatedPropertiesImpacted: true,
      severity: true,
    },
    orderBy: { detectedAt: "desc" },
    take: 50,
  });

  return events
    .map((e) => ({
      ...e,
      centerLat: Number(e.centerLat),
      centerLng: Number(e.centerLng),
      radiusMiles: Number(e.radiusMiles),
      hailSizeAvg: e.hailSizeAvg ? Number(e.hailSizeAvg) : null,
      windSpeedMax: e.windSpeedMax,
    }))
    .filter((e) => {
      const dist = haversineDistance(point, {
        latitude: e.centerLat,
        longitude: e.centerLng,
      });
      return dist <= radiusMiles;
    });
}

function buildClusters(
  claims: NearbyClaimResult[],
  impacts: NearbyImpactResult[],
  stormEvents: StormEventRow[],
  orgId: string
): StormCluster[] {
  const clusters: StormCluster[] = [];

  // Strategy: Group claims by storm event if linked, else by geographic proximity
  const claimsByStorm = new Map<string, NearbyClaimResult[]>();
  const unlinkedClaims: NearbyClaimResult[] = [];

  for (const claim of claims) {
    if (claim.catStormEventId) {
      const existing = claimsByStorm.get(claim.catStormEventId) || [];
      existing.push(claim);
      claimsByStorm.set(claim.catStormEventId, existing);
    } else {
      unlinkedClaims.push(claim);
    }
  }

  // Build clusters from storm-linked claims
  for (const [stormEventId, stormClaims] of claimsByStorm) {
    const storm = stormEvents.find((s) => s.id === stormEventId);
    const cluster = createCluster(stormClaims, stormEventId, storm, impacts);
    if (cluster.totalClaims >= 2) {
      clusters.push(cluster);
    }
  }

  // Build geographic clusters from unlinked claims using simple proximity grouping
  if (unlinkedClaims.length >= 2) {
    const geoClusters = clusterByProximity(unlinkedClaims, 3); // 3 mile radius
    for (const geoCluster of geoClusters) {
      if (geoCluster.length >= 2) {
        const nearestStorm = findNearestStormEvent(geoCluster, stormEvents);
        const cluster = createCluster(geoCluster, nearestStorm?.id || null, nearestStorm, impacts);
        clusters.push(cluster);
      }
    }
  }

  // Sort by claim count
  clusters.sort((a, b) => b.totalClaims - a.totalClaims);

  return clusters;
}

function createCluster(
  claims: NearbyClaimResult[],
  stormEventId: string | null,
  storm: StormEventRow | null | undefined,
  impacts: NearbyImpactResult[]
): StormCluster {
  const lats = claims.map((c) => c.latitude);
  const lngs = claims.map((c) => c.longitude);
  const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

  const maxDist = Math.max(
    ...claims.map((c) =>
      haversineDistance(
        { latitude: centerLat, longitude: centerLng },
        { latitude: c.latitude, longitude: c.longitude }
      )
    ),
    0.5 // minimum radius
  );

  const verifiedClaims = claims.filter((c) =>
    ["APPROVED", "SUBMITTED", "IN_REVIEW"].includes(c.status || "")
  );

  // Impact count within cluster radius
  const clusterImpacts = impacts.filter((imp) => {
    const dist = haversineDistance(
      { latitude: centerLat, longitude: centerLng },
      { latitude: imp.latitude, longitude: imp.longitude }
    );
    return dist <= maxDist * 1.5;
  });

  const members: ClusterMember[] = claims.map((c) => ({
    claimId: c.claimId,
    claimNumber: c.claimNumber || "",
    address: c.address || "",
    distanceMiles: c.distanceMiles,
    damageType: c.damageType || "Unknown",
    status: c.status || "UNKNOWN",
    verificationLevel:
      c.status === "APPROVED"
        ? "confirmed"
        : ["SUBMITTED", "IN_REVIEW"].includes(c.status || "")
          ? "likely"
          : "unverified",
    detectionCount: 0, // populated later if needed
  }));

  const confidence: StormCluster["confidenceLevel"] =
    verifiedClaims.length >= 3 && storm
      ? "high"
      : verifiedClaims.length >= 1 || storm
        ? "medium"
        : "low";

  return {
    clusterId: createId(),
    stormEventId: stormEventId || null,
    stormType: storm?.eventType || "Unknown",
    stormDate: storm?.detectedAt?.toISOString() || new Date().toISOString(),
    centerLat,
    centerLng,
    radiusMiles: Math.ceil(maxDist * 10) / 10,
    totalClaims: claims.length,
    verifiedClaims: verifiedClaims.length,
    totalProperties: clusterImpacts.length + claims.length,
    impactedProperties: clusterImpacts.length,
    avgDamageSeverity:
      claims.length > 0
        ? Math.round(
            claims.reduce((sum, c) => sum + (verifiedClaims.includes(c) ? 70 : 40), 0) /
              claims.length
          )
        : 0,
    avgHailSize: storm?.hailSizeAvg || null,
    maxWindSpeed: storm?.windSpeedMax || null,
    confidenceLevel: confidence,
    members,
  };
}

function clusterByProximity(
  claims: NearbyClaimResult[],
  maxRadiusMiles: number
): NearbyClaimResult[][] {
  const visited = new Set<string>();
  const clusters: NearbyClaimResult[][] = [];

  for (const claim of claims) {
    if (visited.has(claim.claimId)) continue;

    const cluster: NearbyClaimResult[] = [claim];
    visited.add(claim.claimId);

    for (const other of claims) {
      if (visited.has(other.claimId)) continue;

      const dist = haversineDistance(
        { latitude: claim.latitude, longitude: claim.longitude },
        { latitude: other.latitude, longitude: other.longitude }
      );

      if (dist <= maxRadiusMiles) {
        cluster.push(other);
        visited.add(other.claimId);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

function findNearestStormEvent(
  claims: NearbyClaimResult[],
  stormEvents: StormEventRow[]
): StormEventRow | null {
  if (stormEvents.length === 0 || claims.length === 0) return null;

  const center: GeoPoint = {
    latitude: claims.reduce((s, c) => s + c.latitude, 0) / claims.length,
    longitude: claims.reduce((s, c) => s + c.longitude, 0) / claims.length,
  };

  let nearest: StormEventRow | null = null;
  let minDist = Infinity;

  for (const event of stormEvents) {
    const dist = haversineDistance(center, {
      latitude: event.centerLat,
      longitude: event.centerLng,
    });
    if (dist < minDist) {
      minDist = dist;
      nearest = event;
    }
  }

  return nearest;
}

function analyzeDamagePattern(
  nearbyClaims: NearbyClaimResult[],
  detections: Array<{ className: string; confidence: number; modelGroup: string }>,
  currentClaimId: string
): DamagePattern {
  const otherClaims = nearbyClaims.filter((c) => c.claimId !== currentClaimId);

  // Count damage types
  const typeCounts: Record<string, number> = {};
  for (const claim of otherClaims) {
    const dt = claim.damageType || "Unknown";
    typeCounts[dt] = (typeCounts[dt] || 0) + 1;
  }

  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const dominantType = sortedTypes[0]?.[0] || "Unknown";
  const dominantCount = sortedTypes[0]?.[1] || 0;
  const consistencyScore =
    otherClaims.length > 0 ? Math.round((dominantCount / otherClaims.length) * 100) : 0;

  // Average detection confidence
  const avgConfidence =
    detections.length > 0
      ? Math.round(detections.reduce((sum, d) => sum + (d.confidence || 0), 0) / detections.length)
      : 0;

  // Common detection types
  const detTypeCounts: Record<string, number> = {};
  for (const d of detections) {
    detTypeCounts[d.className] = (detTypeCounts[d.className] || 0) + 1;
  }
  const commonTypes = Object.entries(detTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // Outlier claims (different damage type from majority)
  const outliers = otherClaims.filter((c) => c.damageType !== dominantType).map((c) => c.claimId);

  return {
    dominantDamageType: dominantType,
    consistencyScore,
    averageDetectionConfidence: avgConfidence,
    commonDetectionTypes: commonTypes,
    outlierClaims: outliers.slice(0, 5),
  };
}

function computeDensity(
  claims: NearbyClaimResult[],
  center: GeoPoint,
  excludeClaimId: string
): GeographicDensity {
  const filtered = claims.filter((c) => c.claimId !== excludeClaimId);

  const within = (miles: number) =>
    filtered.filter((c) => {
      const dist = haversineDistance(center, {
        latitude: c.latitude,
        longitude: c.longitude,
      });
      return dist <= miles;
    }).length;

  // Find hotspot center (centroid of closest 5 claims)
  const closest5 = [...filtered].sort((a, b) => a.distanceMiles - b.distanceMiles).slice(0, 5);

  const hotspotCenter: GeoPoint | null =
    closest5.length >= 2
      ? {
          latitude: closest5.reduce((s, c) => s + c.latitude, 0) / closest5.length,
          longitude: closest5.reduce((s, c) => s + c.longitude, 0) / closest5.length,
        }
      : null;

  const hotspotRadius =
    closest5.length >= 2
      ? Math.max(
          ...closest5.map((c) =>
            haversineDistance(hotspotCenter!, {
              latitude: c.latitude,
              longitude: c.longitude,
            })
          )
        )
      : 0;

  return {
    radiusMile1: within(1),
    radiusMile3: within(3),
    radiusMile5: within(5),
    radiusMile10: within(10),
    hotspotCenter,
    hotspotRadiusMiles: Math.round(hotspotRadius * 10) / 10,
  };
}

function buildTimeline(
  claims: NearbyClaimResult[],
  stormEvents: StormEventRow[],
  impacts: NearbyImpactResult[],
  currentClaimId: string
): StormTimelineEntry[] {
  const entries: StormTimelineEntry[] = [];

  // Add storm detection events
  for (const storm of stormEvents) {
    entries.push({
      timestamp: storm.detectedAt.toISOString(),
      type: "storm_detected",
      description: `${storm.eventType} storm detected — ${storm.severity} severity${
        storm.hailSizeAvg ? `, ${storm.hailSizeAvg}" hail` : ""
      }${storm.windSpeedMax ? `, ${storm.windSpeedMax} mph winds` : ""}`,
      stormEventId: storm.id,
      location: { latitude: storm.centerLat, longitude: storm.centerLng },
    });
  }

  // Add claim filing events (sort by dateOfLoss)
  const sortedClaims = [...claims]
    .filter((c) => c.claimId !== currentClaimId)
    .sort((a, b) => {
      const da = a.dateOfLoss ? new Date(a.dateOfLoss).getTime() : 0;
      const db = b.dateOfLoss ? new Date(b.dateOfLoss).getTime() : 0;
      return da - db;
    });

  // First impact
  if (sortedClaims.length > 0) {
    const first = sortedClaims[0];
    entries.push({
      timestamp: first.dateOfLoss?.toISOString() || new Date().toISOString(),
      type: "first_impact",
      description: `First damage reported at ${first.address || "nearby property"} — ${first.damageType || "storm"} damage`,
      claimId: first.claimId,
      location: { latitude: first.latitude, longitude: first.longitude },
    });
  }

  // Add verified claim events
  for (const claim of sortedClaims.slice(0, 10)) {
    const isVerified = ["APPROVED", "SUBMITTED", "IN_REVIEW"].includes(claim.status || "");
    entries.push({
      timestamp: claim.dateOfLoss?.toISOString() || new Date().toISOString(),
      type: isVerified ? "claim_verified" : "claim_filed",
      description: `${isVerified ? "Verified" : "Filed"}: ${claim.damageType || "storm"} damage at ${claim.address || "nearby property"} (${claim.distanceMiles.toFixed(1)} mi)`,
      claimId: claim.claimId,
      location: { latitude: claim.latitude, longitude: claim.longitude },
    });
  }

  // Cluster formed event if enough claims
  if (claims.length >= 3) {
    entries.push({
      timestamp: new Date().toISOString(),
      type: "cluster_formed",
      description: `Storm damage cluster identified: ${claims.length} claims within ${CLUSTER_RADIUS_MILES} mile radius`,
    });
  }

  // Sort by timestamp and limit
  entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return entries.slice(0, MAX_TIMELINE_ENTRIES);
}

function computePreQualScore(
  verifiedClaims: number,
  deniedClaims: number,
  stormEvents: number,
  impactedProperties: number,
  density: GeographicDensity
): number {
  let score = 0;

  // Verified nearby claims (max 30 pts)
  score += Math.min(verifiedClaims * 6, 30);

  // Storm events (max 20 pts)
  score += Math.min(stormEvents * 10, 20);

  // Impacted properties (max 15 pts)
  score += Math.min(impactedProperties * 1.5, 15);

  // Geographic density bonus (max 20 pts)
  if (density.radiusMile1 >= 3) score += 10;
  else if (density.radiusMile1 >= 1) score += 5;

  if (density.radiusMile3 >= 10) score += 10;
  else if (density.radiusMile3 >= 5) score += 5;

  // Penalty for nearby denials (max -15 pts)
  score -= Math.min(deniedClaims * 5, 15);

  // Base awareness (if any data exists)
  if (verifiedClaims > 0 || stormEvents > 0) score += 15;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function computeCorroborationScore(
  verifiedClaims: number,
  deniedClaims: number,
  clusterCount: number,
  consistencyScore: number,
  stormEventCount: number,
  preQualScore: number
): number {
  let score = 0;

  // Verified nearby claims (max 30 pts)
  score += Math.min(verifiedClaims * 5, 30);

  // Storm cluster membership (max 20 pts)
  score += Math.min(clusterCount * 10, 20);

  // Damage consistency (max 15 pts)
  score += Math.round(consistencyScore * 0.15);

  // Weather verification (max 20 pts)
  score += Math.min(stormEventCount * 10, 20);

  // Pre-qualification alignment (max 15 pts)
  score += Math.round(preQualScore * 0.15);

  // Penalty for denials
  score -= Math.min(deniedClaims * 3, 10);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function emptyCorroboration(claimId: string, orgId: string): CorroborationResult {
  return {
    claimId,
    orgId,
    corroborationScore: 0,
    nearbyVerifiedDamage: 0,
    nearbyDenied: 0,
    stormClusters: [],
    damagePattern: {
      dominantDamageType: "Unknown",
      consistencyScore: 0,
      averageDetectionConfidence: 0,
      commonDetectionTypes: [],
      outlierClaims: [],
    },
    geographicDensity: {
      radiusMile1: 0,
      radiusMile3: 0,
      radiusMile5: 0,
      radiusMile10: 0,
      hotspotCenter: null,
      hotspotRadiusMiles: 0,
    },
    timeline: [],
    preQualScore: 0,
    computedAt: new Date().toISOString(),
  };
}
