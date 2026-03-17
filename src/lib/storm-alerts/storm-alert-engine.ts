/**
 * Storm Alert System — R5
 *
 * Detects new storm events near existing properties and claims,
 * generates alerts so contractors can proactively reach out.
 *
 * Since properties don't have lat/lng, we match by:
 *   - Storm event affectedZipCodes against property zipCodes
 *
 * Two modes:
 *   1. checkForNewStormAlerts(orgId) — batch check all properties
 *   2. checkPropertyStormExposure(propertyId, orgId) — single property
 */

import { createId } from "@paralleldrive/cuid2";

import { STORM_ALERT_CONFIG } from "@/lib/intelligence/tuning-config";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface StormAlert {
  id: string;
  orgId: string;
  propertyId: string | null;
  claimId: string | null;
  stormEventId: string;
  stormName: string;
  stormDate: string;
  distanceMiles: number;
  estimatedHailSize: number | null;
  estimatedWindSpeed: number | null;
  alertLevel: "info" | "warning" | "critical";
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface StormAlertSummary {
  alerts: StormAlert[];
  newAlertsCount: number;
  criticalCount: number;
  affectedProperties: number;
  stormEventsDetected: number;
}

/* ------------------------------------------------------------------ */
/* Configuration (from centralized tuning-config)                      */
/* ------------------------------------------------------------------ */

const RECENT_STORM_DAYS = STORM_ALERT_CONFIG.recentStormDays;
const HAIL_CRITICAL_THRESHOLD = STORM_ALERT_CONFIG.critical.hailSizeInches;
const WIND_CRITICAL_THRESHOLD = STORM_ALERT_CONFIG.critical.windSpeedMph;

/* ------------------------------------------------------------------ */
/* Core Engine                                                         */
/* ------------------------------------------------------------------ */

/**
 * Batch check all org properties for nearby recent storm events.
 * Matches by overlapping zip codes since properties lack lat/lng.
 * Returns alerts for new unacknowledged storm exposures.
 */
export async function checkForNewStormAlerts(
  orgId: string,
): Promise<StormAlertSummary> {
  logger.info("[STORM_ALERT] Checking for new alerts", { orgId });

  // 1. Get all org properties with their zip codes
  const properties = await prisma.properties.findMany({
    where: { orgId },
    select: {
      id: true,
      name: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
    },
  });

  if (properties.length === 0) {
    return emptyResult();
  }

  // 2. Get recent storm events
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RECENT_STORM_DAYS);

  const stormEvents = await prisma.storm_events.findMany({
    where: {
      orgId,
      stormStartTime: { gte: cutoffDate },
    },
    select: {
      id: true,
      eventType: true,
      impactSummary: true,
      stormStartTime: true,
      centerLat: true,
      centerLng: true,
      hailSizeMax: true,
      windSpeedMax: true,
      severity: true,
      affectedZipCodes: true,
    },
  });

  if (stormEvents.length === 0) {
    return emptyResult();
  }

  // 3. Get existing alerts to avoid duplicates
  const existingAlerts = await getExistingAlertKeys(orgId);

  // 4. Cross-check properties against storm events using zip code overlap
  const alerts: StormAlert[] = [];
  const affectedPropertyIds = new Set<string>();
  const stormEventIds = new Set<string>();

  for (const property of properties) {
    for (const storm of stormEvents) {
      // Check if the storm's affected zip codes include this property's zip
      const stormZips = parseZipCodes(storm.affectedZipCodes);
      if (!stormZips.includes(property.zipCode)) continue;

      // Check if alert already exists
      const key = `${property.id}:${storm.id}`;
      if (existingAlerts.has(key)) continue;

      const hailSize = storm.hailSizeMax ? Number(storm.hailSizeMax) : null;
      const windSpeed = storm.windSpeedMax ? Number(storm.windSpeedMax) : null;

      // Estimate distance: same zip = ~0 miles (in the affected area)
      const estimatedDistance = 0;

      const alertLevel = determineAlertLevel(
        estimatedDistance,
        hailSize,
        windSpeed,
      );
      const stormName =
        storm.impactSummary?.slice(0, 60) || `${storm.eventType} event`;
      const address = `${property.street}, ${property.city}`;

      const alert: StormAlert = {
        id: createId(),
        orgId,
        propertyId: property.id,
        claimId: null,
        stormEventId: storm.id,
        stormName,
        stormDate: storm.stormStartTime?.toISOString() || "",
        distanceMiles: estimatedDistance,
        estimatedHailSize: hailSize,
        estimatedWindSpeed: windSpeed,
        alertLevel,
        message: buildAlertMessage(
          address,
          stormName,
          estimatedDistance,
          hailSize,
          windSpeed,
        ),
        acknowledged: false,
        createdAt: new Date().toISOString(),
      };

      alerts.push(alert);
      affectedPropertyIds.add(property.id);
      stormEventIds.add(storm.id);
    }
  }

  // 5. Persist new alerts
  if (alerts.length > 0) {
    await persistAlerts(alerts);
  }

  logger.info("[STORM_ALERT] Check complete", {
    orgId,
    newAlerts: alerts.length,
    affectedProperties: affectedPropertyIds.size,
  });

  return {
    alerts: alerts.sort(
      (a, b) => alertPriority(b.alertLevel) - alertPriority(a.alertLevel),
    ),
    newAlertsCount: alerts.length,
    criticalCount: alerts.filter((a) => a.alertLevel === "critical").length,
    affectedProperties: affectedPropertyIds.size,
    stormEventsDetected: stormEventIds.size,
  };
}

/**
 * Check a single property's exposure to recent storms
 */
export async function checkPropertyStormExposure(
  propertyId: string,
  orgId: string,
): Promise<StormAlert[]> {
  const property = await prisma.properties.findFirst({
    where: { id: propertyId, orgId },
    select: {
      id: true,
      name: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
    },
  });

  if (!property) {
    return [];
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RECENT_STORM_DAYS);

  const stormEvents = await prisma.storm_events.findMany({
    where: {
      orgId,
      stormStartTime: { gte: cutoffDate },
    },
    select: {
      id: true,
      eventType: true,
      impactSummary: true,
      stormStartTime: true,
      centerLat: true,
      centerLng: true,
      hailSizeMax: true,
      windSpeedMax: true,
      affectedZipCodes: true,
    },
  });

  const alerts: StormAlert[] = [];

  for (const storm of stormEvents) {
    const stormZips = parseZipCodes(storm.affectedZipCodes);
    if (!stormZips.includes(property.zipCode)) continue;

    const hailSize = storm.hailSizeMax ? Number(storm.hailSizeMax) : null;
    const windSpeed = storm.windSpeedMax ? Number(storm.windSpeedMax) : null;
    const estimatedDistance = 0; // Same zip code
    const stormName =
      storm.impactSummary?.slice(0, 60) || `${storm.eventType} event`;
    const address = `${property.street}, ${property.city}`;

    alerts.push({
      id: createId(),
      orgId,
      propertyId: property.id,
      claimId: null,
      stormEventId: storm.id,
      stormName,
      stormDate: storm.stormStartTime?.toISOString() || "",
      distanceMiles: estimatedDistance,
      estimatedHailSize: hailSize,
      estimatedWindSpeed: windSpeed,
      alertLevel: determineAlertLevel(estimatedDistance, hailSize, windSpeed),
      message: buildAlertMessage(
        address,
        stormName,
        estimatedDistance,
        hailSize,
        windSpeed,
      ),
      acknowledged: false,
      createdAt: new Date().toISOString(),
    });
  }

  return alerts.sort(
    (a, b) => alertPriority(b.alertLevel) - alertPriority(a.alertLevel),
  );
}

/**
 * Get all existing (unacknowledged) alerts for an org
 */
export async function getOrgAlerts(orgId: string): Promise<StormAlert[]> {
  try {
    const rows = await prisma.notification.findMany({
      where: {
        orgId,
        type: "storm_alert",
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return rows.map((r) => {
      const meta = (r.metadata as Record<string, unknown>) ?? {};
      return {
        id: r.id,
        orgId: r.orgId ?? "",
        propertyId: (meta.propertyId as string) ?? null,
        claimId: (meta.claimId as string) ?? null,
        stormEventId: (meta.stormEventId as string) ?? "",
        stormName: (meta.stormName as string) ?? "",
        stormDate: (meta.stormDate as string) ?? "",
        distanceMiles: (meta.distanceMiles as number) ?? 0,
        estimatedHailSize: (meta.estimatedHailSize as number) ?? null,
        estimatedWindSpeed: (meta.estimatedWindSpeed as number) ?? null,
        alertLevel:
          (meta.alertLevel as StormAlert["alertLevel"]) ?? "info",
        message: r.body ?? "",
        acknowledged: r.readAt != null,
        createdAt: r.createdAt.toISOString(),
      };
    });
  } catch {
    // Notification table may not exist yet in all environments
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Parse affectedZipCodes JSON (could be string[] or JSON string) */
function parseZipCodes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function determineAlertLevel(
  distanceMiles: number,
  hailSize: number | null,
  windSpeed: number | null,
): "info" | "warning" | "critical" {
  const criticalDist = STORM_ALERT_CONFIG.distanceBands.criticalMaxMiles;
  const warningDist = STORM_ALERT_CONFIG.distanceBands.warningMaxMiles;
  const extendedDist = STORM_ALERT_CONFIG.distanceBands.warningExtendedMiles;

  // Critical: direct hit with severe weather
  if (distanceMiles <= criticalDist) {
    if (
      (hailSize && hailSize >= HAIL_CRITICAL_THRESHOLD) ||
      (windSpeed && windSpeed >= WIND_CRITICAL_THRESHOLD)
    ) {
      return "critical";
    }
    return "warning";
  }

  // Warning: within warning distance OR severe weather within extended range
  if (distanceMiles <= warningDist) return "warning";
  if (
    distanceMiles <= extendedDist &&
    ((hailSize && hailSize >= 1.0) || (windSpeed && windSpeed >= 60))
  ) {
    return "warning";
  }

  return "info";
}

function buildAlertMessage(
  address: string,
  stormName: string,
  distance: number,
  hailSize: number | null,
  windSpeed: number | null,
): string {
  const distText =
    distance === 0
      ? `in the affected area of ${address}`
      : `${distance.toFixed(1)} mi from ${address}`;
  const parts = [`${stormName} detected ${distText}`];

  if (hailSize) parts.push(`hail up to ${hailSize}" reported`);
  if (windSpeed) parts.push(`winds up to ${windSpeed} mph`);

  return parts.join(" — ");
}

function alertPriority(level: string): number {
  return level === "critical" ? 3 : level === "warning" ? 2 : 1;
}

async function getExistingAlertKeys(orgId: string): Promise<Set<string>> {
  try {
    const existing = await prisma.notification.findMany({
      where: { orgId, type: "storm_alert" },
      select: { metadata: true },
    });
    const keys = new Set<string>();
    for (const row of existing) {
      const meta = (row.metadata as Record<string, unknown>) ?? {};
      if (meta.propertyId && meta.stormEventId) {
        keys.add(`${meta.propertyId}:${meta.stormEventId}`);
      }
    }
    return keys;
  } catch {
    return new Set();
  }
}

async function persistAlerts(alerts: StormAlert[]) {
  try {
    await prisma.notification.createMany({
      data: alerts.map((a) => ({
        id: a.id,
        orgId: a.orgId,
        type: "storm_alert",
        title: `Storm Alert: ${a.stormName}`,
        body: a.message,
        metadata: {
          propertyId: a.propertyId,
          claimId: a.claimId,
          stormEventId: a.stormEventId,
          stormName: a.stormName,
          stormDate: a.stormDate,
          distanceMiles: a.distanceMiles,
          estimatedHailSize: a.estimatedHailSize,
          estimatedWindSpeed: a.estimatedWindSpeed,
          alertLevel: a.alertLevel,
        },
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    logger.error("[STORM_ALERT] Persist failed:", err);
  }
}

function emptyResult(): StormAlertSummary {
  return {
    alerts: [],
    newAlertsCount: 0,
    criticalCount: 0,
    affectedProperties: 0,
    stormEventsDetected: 0,
  };
}
