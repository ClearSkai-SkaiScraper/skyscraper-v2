/**
 * Storm Detection Notifications
 * Automated alerts when storms are detected near tracked properties
 *
 * This service:
 * 1. Monitors for new storm_events
 * 2. Matches against org's property portfolio
 * 3. Sends targeted notifications to relevant users
 * 4. Creates action items for follow-up
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import { sendTemplatedNotification } from "./templates";

// ============================================================================
// TYPES
// ============================================================================

export interface StormNotificationOptions {
  stormEventId: string;
  orgId: string;
  forceNotify?: boolean;
}

export interface PropertyImpactSummary {
  totalProperties: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  affectedZipCodes: string[];
  primaryCity: string;
}

// ============================================================================
// MAIN NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Send notifications when a new storm is detected
 */
export async function notifyStormDetected(
  options: StormNotificationOptions
): Promise<{ notified: string[]; errors: string[] }> {
  const { stormEventId, orgId } = options;

  const notified: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Get storm event details
    const storm = await prisma.storm_events.findUnique({
      where: { id: stormEventId },
    });

    if (!storm) {
      logger.warn("[STORM_NOTIFY] Storm event not found", { stormEventId });
      return { notified, errors: ["Storm event not found"] };
    }

    // 2. Find properties in the affected area
    const impactSummary = await getPropertyImpacts(orgId, storm);

    if (impactSummary.totalProperties === 0) {
      logger.info("[STORM_NOTIFY] No properties affected", { stormEventId, orgId });
      return { notified, errors };
    }

    // 3. Get users to notify (org admins and assigned users)
    const usersToNotify = await getNotificationRecipients(orgId, impactSummary);

    // 4. Send notifications
    for (const userId of usersToNotify) {
      try {
        await sendTemplatedNotification("STORM_DETECTED", userId, {
          stormType: formatStormType(storm.eventType),
          city: impactSummary.primaryCity,
          propertyCount: impactSummary.totalProperties,
          hailSize: storm.hailSizeMax ? `${Number(storm.hailSizeMax).toFixed(2)}"` : "N/A",
          windSpeed: storm.windSpeedMax ?? "N/A",
        });
        notified.push(userId);
      } catch (e) {
        errors.push(`Failed to notify ${userId}: ${e.message}`);
      }
    }

    // 5. If high-impact storm, send additional alert
    if (impactSummary.highRisk > 0) {
      for (const userId of usersToNotify) {
        try {
          await sendTemplatedNotification("STORM_IMPACT_ALERT", userId, {
            zipCodes: impactSummary.affectedZipCodes.slice(0, 5).join(", "),
            highRiskCount: impactSummary.highRisk,
            action: getRecommendedAction(storm),
          });
        } catch (e) {
          errors.push(`Failed to send impact alert to ${userId}: ${e.message}`);
        }
      }
    }

    // 6. Create property_impacts records for tracking
    await createPropertyImpactRecords(orgId, stormEventId, storm);

    logger.info("[STORM_NOTIFY] Storm notifications sent", {
      stormEventId,
      orgId,
      notifiedCount: notified.length,
      affectedProperties: impactSummary.totalProperties,
    });

    return { notified, errors };
  } catch (error) {
    logger.error("[STORM_NOTIFY] Failed to send storm notifications", { stormEventId, error });
    return { notified, errors: [error.message] };
  }
}

/**
 * Send notification when a storm event ends
 */
export async function notifyStormEnded(stormEventId: string, orgId: string): Promise<void> {
  try {
    const storm = await prisma.storm_events.findUnique({
      where: { id: stormEventId },
    });

    if (!storm) return;

    const duration =
      storm.duration ??
      (storm.stormEndTime && storm.stormStartTime
        ? Math.round((storm.stormEndTime.getTime() - storm.stormStartTime.getTime()) / 60000)
        : 0);

    const impactCount = await prisma.property_impacts.count({
      where: { stormEventId },
    });

    const users = await getNotificationRecipients(orgId, {
      totalProperties: impactCount,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      affectedZipCodes: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      primaryCity: String((storm.affectedCities as any)?.[0] ?? "your area"),
    });

    for (const userId of users) {
      await sendTemplatedNotification("STORM_ENDED", userId, {
        stormType: formatStormType(storm.eventType),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        city: String((storm.affectedCities as any)?.[0] ?? "your area"),
        duration,
        propertyCount: impactCount,
      });
    }
  } catch (error) {
    logger.error("[STORM_NOTIFY] Failed to notify storm ended", { stormEventId, error });
  }
}

/**
 * Notify about DOL verification needs
 */
export async function notifyDOLVerificationNeeded(
  claimId: string,
  confidence: number,
  suggestedDOL: string
): Promise<void> {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        users: { select: { id: true } },
      },
    });

    if (!claim) return;

    // Notify assigned user
    if (claim.assignedTo) {
      await sendTemplatedNotification("DOL_VERIFICATION_NEEDED", claim.assignedTo, {
        claimNumber: claim.claimNumber,
        confidence: Math.round(confidence * 100),
        suggestedDOL,
      });
    }
  } catch (error) {
    logger.error("[STORM_NOTIFY] Failed to notify DOL verification", { claimId, error });
  }
}

/**
 * Notify about photo-weather correlation issues
 */
export async function notifyPhotoWeatherMismatch(
  claimId: string,
  correlationScore: number
): Promise<void> {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
    });

    if (!claim) return;

    if (claim.assignedTo) {
      await sendTemplatedNotification("PHOTO_WEATHER_MISMATCH", claim.assignedTo, {
        claimNumber: claim.claimNumber,
        score: Math.round(correlationScore),
      });
    }
  } catch (error) {
    logger.error("[STORM_NOTIFY] Failed to notify photo mismatch", { claimId, error });
  }
}

/**
 * Notify when weather evidence is ready for a claim
 */
export async function notifyWeatherEvidenceReady(
  claimId: string,
  grade: string,
  eventCount: number
): Promise<void> {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
    });

    if (!claim) return;

    if (claim.assignedTo) {
      await sendTemplatedNotification("WEATHER_EVIDENCE_READY", claim.assignedTo, {
        claimNumber: claim.claimNumber,
        grade,
        eventCount,
      });
    }
  } catch (error) {
    logger.error("[STORM_NOTIFY] Failed to notify evidence ready", { claimId, error });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPropertyImpacts(orgId: string, storm: any): Promise<PropertyImpactSummary> {
  // Get affected ZIP codes from storm
  const affectedZips = (storm.affectedZipCodes as string[]) ?? [];
  const affectedCities = (storm.affectedCities as string[]) ?? [];

  // Find properties in those ZIP codes
  const properties = await prisma.properties.findMany({
    where: {
      orgId,
      zipCode: { in: affectedZips },
    },
    select: {
      id: true,
      zipCode: true,
    },
  });

  // Calculate risk levels based on ZIP code proximity (simplified without lat/lng)
  // Properties in affected ZIPs are considered medium risk by default
  let highRisk = 0;
  let mediumRisk = properties.length; // All properties in affected ZIPs start as medium
  let lowRisk = 0;

  // If we have storm center and can calculate distances, refine the estimates
  // For now, using ZIP-code based assessment

  return {
    totalProperties: properties.length,
    highRisk,
    mediumRisk,
    lowRisk,
    affectedZipCodes: [...new Set(properties.map((p) => p.zipCode).filter(Boolean))] as string[],
    primaryCity: affectedCities[0] ?? "Unknown",
  };
}

async function getNotificationRecipients(
  orgId: string,
  impact: PropertyImpactSummary
): Promise<string[]> {
  // Get org admins and managers
  const orgMembers = await prisma.user_organizations.findMany({
    where: {
      organizationId: orgId,
      role: { in: ["ADMIN", "MANAGER"] },
    },
    select: { userId: true },
  });

  const userIds = new Set<string>();

  // Add admins/managers
  for (const member of orgMembers) {
    userIds.add(member.userId);
  }

  // If high-risk properties, also notify users assigned to those properties
  if (impact.highRisk > 0) {
    const assignedUsers = await prisma.claims.findMany({
      where: {
        orgId,
        assignedTo: { not: null },
        properties: {
          zipCode: { in: impact.affectedZipCodes },
        },
      },
      select: { assignedTo: true },
    });

    for (const claim of assignedUsers) {
      if (claim.assignedTo) {
        userIds.add(claim.assignedTo);
      }
    }
  }

  return Array.from(userIds);
}

async function createPropertyImpactRecords(
  orgId: string,
  stormEventId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  storm: any
): Promise<void> {
  // NOTE: The property_impacts model requires extensive data including
  // lat/lng coordinates, damage probability scores, AI estimates, etc.
  // that must be calculated by a separate impact analysis service.
  // This function is a placeholder - actual property impact records
  // should be created by the storm impact analysis pipeline.
  logger.info(
    "[STORM_NOTIFICATIONS] Property impact record creation skipped - requires impact analysis pipeline",
    {
      orgId,
      stormEventId,
    }
  );
}

function formatStormType(eventType: string): string {
  const typeMap: Record<string, string> = {
    HAIL: "hail",
    WIND: "wind",
    TORNADO: "tornado",
    THUNDERSTORM: "thunderstorm",
    HURRICANE: "hurricane",
    SEVERE: "severe",
  };
  return typeMap[eventType?.toUpperCase()] ?? eventType?.toLowerCase() ?? "weather";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRecommendedAction(storm: any): string {
  const hailSize = Number(storm.hailSizeMax ?? 0);
  const windSpeed = storm.windSpeedMax ?? 0;

  if (storm.tornadoRating) {
    return "Immediate property assessment required";
  }
  if (hailSize >= 1.5) {
    return "Schedule roof inspections within 48 hours";
  }
  if (windSpeed >= 70) {
    return "Check for structural and exterior damage";
  }
  if (hailSize >= 1.0 || windSpeed >= 50) {
    return "Schedule property assessments this week";
  }
  return "Monitor for damage reports from homeowners";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function haversineMiles(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { formatStormType, getNotificationRecipients, getPropertyImpacts, getRecommendedAction };
