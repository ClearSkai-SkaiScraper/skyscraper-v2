/**
 * Storm Detection Notification Service
 *
 * Monitors for storm events and notifies relevant users
 * when storms are detected near their properties
 */

import { logger } from "@/lib/logger";
import { sendTemplatedNotification } from "@/lib/notifications/templates";
import prisma from "@/lib/prisma";

export interface StormDetectionConfig {
  radiusMiles?: number; // Default 25 miles
  minHailSize?: number; // Minimum hail size to alert (inches)
  minWindSpeed?: number; // Minimum wind speed to alert (mph)
  includeTornado?: boolean; // Always alert for tornadoes
}

export interface DetectedStorm {
  id: string;
  type: "hail" | "wind" | "tornado" | "severe_thunderstorm";
  severity: "low" | "moderate" | "high" | "extreme";
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  hailSize?: number;
  windSpeed?: number;
  city?: string;
  state?: string;
  zipCodes?: string[];
  startTime: Date;
  endTime?: Date;
}

export interface AffectedProperty {
  propertyId: string;
  distanceMiles: number;
  riskLevel: "low" | "medium" | "high";
  address: string;
  claimId?: string;
}

/**
 * Detect storms near properties for an organization
 */
export async function detectStormsNearProperties(
  orgId: string,
  config: StormDetectionConfig = {}
): Promise<{
  storms: DetectedStorm[];
  affectedProperties: AffectedProperty[];
}> {
  const { radiusMiles = 25, minHailSize = 0.75, minWindSpeed = 58, includeTornado = true } = config;

  // Get recent storm events (last 24 hours)
  const recentStorms = await prisma.storm_events.findMany({
    where: {
      orgId,
      stormStartTime: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { stormStartTime: "desc" },
  });

  // Filter storms by magnitude
  const filteredStorms = recentStorms.filter((storm) => {
    const hail = storm.hailSizeMax ? Number(storm.hailSizeMax) : 0;
    const wind = storm.windSpeedMax ? Number(storm.windSpeedMax) : 0;
    const hasTornado = includeTornado && storm.tornadoRating;
    return hail >= minHailSize || wind >= minWindSpeed || hasTornado;
  });

  // Get all properties for the org - get coordinates from weather reports
  const properties = await prisma.properties.findMany({
    where: { orgId },
    select: {
      id: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
      claims: {
        where: { status: { not: "closed" } },
        select: {
          id: true,
          weather_reports: {
            select: { lat: true, lng: true },
            take: 1,
          },
        },
        take: 1,
      },
    },
  });

  const storms: DetectedStorm[] = filteredStorms.map((storm) => {
    const hail = storm.hailSizeMax ? Number(storm.hailSizeMax) : 0;
    const wind = storm.windSpeedMax ? Number(storm.windSpeedMax) : 0;
    return {
      id: storm.id,
      type: storm.tornadoRating
        ? "tornado"
        : hail >= 1
          ? "hail"
          : wind >= 58
            ? "wind"
            : "severe_thunderstorm",
      severity: calculateSeverity(storm),
      centerLat: storm.centerLat ? Number(storm.centerLat) : 0,
      centerLng: storm.centerLng ? Number(storm.centerLng) : 0,
      radiusMiles: storm.radiusMiles ? Number(storm.radiusMiles) : radiusMiles,
      hailSize: hail || undefined,
      windSpeed: wind || undefined,
      city: storm.affectedCities?.[0] as string | undefined,
      state: undefined,
      zipCodes: storm.affectedZipCodes as string[] | undefined,
      startTime: storm.stormStartTime ?? new Date(),
      endTime: storm.stormEndTime ?? undefined,
    };
  });

  const affectedProperties: AffectedProperty[] = [];

  // Check each property against each storm
  for (const property of properties) {
    // Get coordinates from claim's weather report
    const lat = property.claims[0]?.weather_reports?.[0]?.lat;
    const lng = property.claims[0]?.weather_reports?.[0]?.lng;
    if (!lat || !lng) continue;

    for (const storm of storms) {
      const distance = haversineDistance(lat, lng, storm.centerLat, storm.centerLng);

      if (distance <= storm.radiusMiles) {
        const riskLevel = distance <= 5 ? "high" : distance <= 15 ? "medium" : "low";

        affectedProperties.push({
          propertyId: property.id,
          distanceMiles: Math.round(distance * 10) / 10,
          riskLevel,
          address: [property.street, property.city, property.state, property.zipCode]
            .filter(Boolean)
            .join(", "),
          claimId: property.claims[0]?.id,
        });
      }
    }
  }

  return { storms, affectedProperties };
}

/**
 * Send storm notifications to relevant users
 */
export async function sendStormNotifications(
  orgId: string,
  storm: DetectedStorm,
  affectedProperties: AffectedProperty[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Get all users in the org who should receive notifications
  const orgMembers = await prisma.user_organizations.findMany({
    where: {
      organizationId: orgId,
      role: { in: ["admin", "manager", "member"] },
    },
    select: { userId: true },
  });

  const highRiskCount = affectedProperties.filter((p) => p.riskLevel === "high").length;
  const propertyCount = affectedProperties.length;

  // Determine notification template based on severity
  const template =
    storm.severity === "extreme" || storm.severity === "high"
      ? "STORM_IMPACT_ALERT"
      : "STORM_DETECTED";

  const notificationData = {
    stormType: storm.type.replace("_", " "),
    city: storm.city || "your service area",
    propertyCount: propertyCount.toString(),
    hailSize: storm.hailSize ? `${storm.hailSize}"` : "N/A",
    windSpeed: storm.windSpeed?.toString() || "N/A",
    zipCodes: storm.zipCodes?.slice(0, 3).join(", ") || "multiple areas",
    highRiskCount: highRiskCount.toString(),
    action:
      highRiskCount > 5
        ? "Deploy canvassing teams immediately"
        : "Monitor and prepare for inspections",
  };

  for (const member of orgMembers) {
    try {
      const success = await sendTemplatedNotification(
        template as any,
        member.userId,
        notificationData
      );
      if (success) sent++;
      else failed++;
    } catch (error) {
      logger.error("[StormDetection] Failed to send notification", {
        userId: member.userId,
        error,
      });
      failed++;
    }
  }

  // Log storm detection event
  logger.info("[StormDetection] Storm notifications sent", {
    orgId,
    stormId: storm.id,
    stormType: storm.type,
    severity: storm.severity,
    propertyCount,
    highRiskCount,
    notificationsSent: sent,
    notificationsFailed: failed,
  });

  return { sent, failed };
}

/**
 * Notify when storm ends - for follow-up actions
 */
export async function sendStormEndedNotification(
  orgId: string,
  storm: DetectedStorm,
  affectedPropertyCount: number
): Promise<void> {
  const orgMembers = await prisma.user_organizations.findMany({
    where: {
      organizationId: orgId,
      role: { in: ["admin", "manager"] },
    },
    select: { userId: true },
  });

  const duration = storm.endTime
    ? Math.round((storm.endTime.getTime() - storm.startTime.getTime()) / 60000)
    : 0;

  for (const member of orgMembers) {
    await sendTemplatedNotification("STORM_ENDED" as any, member.userId, {
      stormType: storm.type.replace("_", " "),
      city: storm.city || "your service area",
      duration: duration.toString(),
      propertyCount: affectedPropertyCount.toString(),
    });
  }
}

/**
 * Check if a claim's photos correlate with weather - notify if mismatch
 */
export async function notifyPhotoWeatherMismatch(
  claimId: string,
  correlationScore: number,
  assignedUserId?: string
): Promise<void> {
  if (correlationScore >= 50) return; // Only notify on poor correlation

  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: {
      claimNumber: true,
      assignedTo: true,
      orgId: true,
    },
  });

  if (!claim) return;

  const userId = assignedUserId || claim.assignedTo;
  if (!userId) return;

  await sendTemplatedNotification("PHOTO_WEATHER_MISMATCH" as any, userId, {
    claimNumber: claim.claimNumber,
    score: correlationScore.toString(),
  });
}

/**
 * Notify when weather evidence is ready for a claim
 */
export async function notifyWeatherEvidenceReady(
  claimId: string,
  grade: string,
  eventCount: number
): Promise<void> {
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: {
      claimNumber: true,
      assignedTo: true,
    },
  });

  if (!claim || !claim.assignedTo) return;

  await sendTemplatedNotification("WEATHER_EVIDENCE_READY" as any, claim.assignedTo, {
    claimNumber: claim.claimNumber,
    grade,
    eventCount: eventCount.toString(),
  });
}

/**
 * Notify when DOL verification is needed due to low confidence
 */
export async function notifyDOLVerificationNeeded(
  claimId: string,
  confidence: number,
  suggestedDOL: string
): Promise<void> {
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: {
      claimNumber: true,
      assignedTo: true,
    },
  });

  if (!claim || !claim.assignedTo) return;

  await sendTemplatedNotification("DOL_VERIFICATION_NEEDED" as any, claim.assignedTo, {
    claimNumber: claim.claimNumber,
    confidence: Math.round(confidence).toString(),
    suggestedDOL,
  });
}

// Helper functions

function calculateSeverity(storm: any): "low" | "moderate" | "high" | "extreme" {
  if (storm.tornadoRating) return "extreme";

  const hail = storm.hailSizeMax?.toNumber() ?? 0;
  const wind = storm.windSpeedMax?.toNumber() ?? 0;

  if (hail >= 2 || wind >= 80) return "extreme";
  if (hail >= 1.5 || wind >= 70) return "high";
  if (hail >= 1 || wind >= 58) return "moderate";
  return "low";
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
