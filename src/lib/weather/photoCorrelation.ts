/**
 * Photo-Weather Correlation Engine
 * Correlates photo EXIF timestamps with weather events to prove
 * damage documentation was taken around the time of storm impact.
 *
 * This strengthens carrier submissions by showing photos align with
 * documented weather conditions.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import type { TopWeatherEvent } from "./getStormEvidence";

// ============================================================================
// TYPES
// ============================================================================

export interface PhotoMetadata {
  id: string;
  claimId: string;
  fileName: string;
  capturedAt?: string | null; // EXIF DateTimeOriginal (ISO)
  uploadedAt: string; // When file was uploaded
  lat?: number | null; // EXIF GPS lat
  lng?: number | null; // EXIF GPS lng
  cameraModel?: string | null; // EXIF camera model
  orientation?: string | null; // EXIF orientation
}

export interface CorrelationResult {
  photoId: string;
  photoTimestamp: string;

  // Matched event (if any)
  matchedEvent?: {
    eventId: string;
    type: string;
    magnitude?: number;
    timeUtc: string;
    distanceMiles: number;
  };

  // Temporal analysis
  timeDeltaMinutes: number;
  temporalCorrelation: "same_hour" | "same_day" | "within_week" | "outside_window";

  // Spatial analysis (if photo has GPS)
  spatialCorrelation?: "exact" | "nearby" | "same_area" | "outside_area" | "unknown";
  distanceFromPropertyMiles?: number;

  // Overall strength
  correlationStrength: "strong" | "moderate" | "weak" | "none";

  // Explanation for carrier
  narrative: string;
}

export interface PhotoCorrelationReport {
  claimId: string;
  generatedAt: string;

  // Summary metrics
  totalPhotos: number;
  photosWithExif: number;
  strongCorrelations: number;
  moderateCorrelations: number;
  weakCorrelations: number;

  // Overall score (0-100)
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";

  // Individual correlations
  correlations: CorrelationResult[];

  // Carrier-ready summary
  summary: string;
}

// ============================================================================
// MAIN CORRELATION FUNCTIONS
// ============================================================================

/**
 * Correlate all photos for a claim with weather events
 */
export async function correlateClaimPhotos(
  claimId: string
): Promise<PhotoCorrelationReport | null> {
  try {
    // 1. Get claim with storm evidence
    const evidence = await prisma.storm_evidence.findUnique({
      where: { claimId },
    });

    if (!evidence) {
      logger.warn("[PHOTO_CORRELATION] No storm evidence found", { claimId });
      return null;
    }

    // 2. Get property location (from weather reports or storm events)
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: {
          select: { street: true, city: true, state: true, zipCode: true },
        },
        weather_reports: {
          select: { lat: true, lng: true },
          take: 1,
        },
      },
    });

    if (!claim) {
      logger.warn("[PHOTO_CORRELATION] Claim not found", { claimId });
      return null;
    }

    const propertyLat = claim.weather_reports?.[0]?.lat;
    const propertyLng = claim.weather_reports?.[0]?.lng;

    // 3. Get all photos for the claim
    const photos = await getClaimPhotos(claimId);

    if (photos.length === 0) {
      logger.info("[PHOTO_CORRELATION] No photos found for claim", { claimId });
      return createEmptyReport(claimId);
    }

    // 4. Get weather events from evidence
    const topEvents = (evidence.topEvents as unknown as TopWeatherEvent[]) ?? [];
    const stormStart = evidence.stormStartTime;
    const stormEnd = evidence.stormEndTime ?? evidence.selectedDOL;

    // 5. Correlate each photo
    const correlations: CorrelationResult[] = [];
    let photosWithExif = 0;

    for (const photo of photos) {
      if (photo.capturedAt) {
        photosWithExif++;
      }

      const correlation = correlatePhoto(photo, topEvents, {
        propertyLat,
        propertyLng,
        stormStart,
        stormEnd,
      });

      correlations.push(correlation);
    }

    // 6. Calculate summary metrics
    const strongCorrelations = correlations.filter(
      (c) => c.correlationStrength === "strong"
    ).length;
    const moderateCorrelations = correlations.filter(
      (c) => c.correlationStrength === "moderate"
    ).length;
    const weakCorrelations = correlations.filter((c) => c.correlationStrength === "weak").length;

    const overallScore = calculateOverallCorrelationScore(correlations, photosWithExif);
    const grade = scoreToGrade(overallScore);

    const report: PhotoCorrelationReport = {
      claimId,
      generatedAt: new Date().toISOString(),
      totalPhotos: photos.length,
      photosWithExif,
      strongCorrelations,
      moderateCorrelations,
      weakCorrelations,
      overallScore,
      grade,
      correlations,
      summary: generateCorrelationSummary({
        totalPhotos: photos.length,
        photosWithExif,
        strongCorrelations,
        moderateCorrelations,
        weakCorrelations,
        grade,
        stormDate: evidence.selectedDOL,
      }),
    };

    logger.info("[PHOTO_CORRELATION] Report generated", {
      claimId,
      totalPhotos: photos.length,
      photosWithExif,
      overallScore,
      grade,
    });

    return report;
  } catch (error) {
    logger.error("[PHOTO_CORRELATION] Failed to correlate photos", { claimId, error });
    return null;
  }
}

/**
 * Correlate a single photo with weather events
 */
function correlatePhoto(
  photo: PhotoMetadata,
  events: TopWeatherEvent[],
  context: {
    propertyLat?: number | null;
    propertyLng?: number | null;
    stormStart?: Date | null;
    stormEnd?: Date | null;
  }
): CorrelationResult {
  const photoTimestamp = photo.capturedAt ?? photo.uploadedAt;
  const photoTime = new Date(photoTimestamp).getTime();

  // Find closest weather event
  let matchedEvent: CorrelationResult["matchedEvent"] | undefined;
  let minDelta = Infinity;

  for (const event of events) {
    const eventTime = new Date(event.timeUtc).getTime();
    const delta = Math.abs(photoTime - eventTime);

    if (delta < minDelta) {
      minDelta = delta;
      matchedEvent = {
        eventId: event.eventId,
        type: event.type,
        magnitude: event.magnitude,
        timeUtc: event.timeUtc,
        distanceMiles: event.distanceMiles,
      };
    }
  }

  const timeDeltaMinutes = Math.round(minDelta / 60000);

  // Determine temporal correlation
  let temporalCorrelation: CorrelationResult["temporalCorrelation"] = "outside_window";
  if (timeDeltaMinutes <= 60) {
    temporalCorrelation = "same_hour";
  } else if (timeDeltaMinutes <= 1440) {
    temporalCorrelation = "same_day";
  } else if (timeDeltaMinutes <= 10080) {
    temporalCorrelation = "within_week";
  }

  // Determine spatial correlation (if photo has GPS)
  let spatialCorrelation: CorrelationResult["spatialCorrelation"] = "unknown";
  let distanceFromPropertyMiles: number | undefined;

  if (photo.lat && photo.lng && context.propertyLat && context.propertyLng) {
    distanceFromPropertyMiles = haversineMiles(
      { lat: photo.lat, lng: photo.lng },
      { lat: context.propertyLat, lng: context.propertyLng }
    );

    if (distanceFromPropertyMiles < 0.05) {
      spatialCorrelation = "exact"; // Within 250ft
    } else if (distanceFromPropertyMiles < 0.25) {
      spatialCorrelation = "nearby"; // Within quarter mile
    } else if (distanceFromPropertyMiles < 1) {
      spatialCorrelation = "same_area";
    } else {
      spatialCorrelation = "outside_area";
    }
  }

  // Determine overall correlation strength
  let correlationStrength: CorrelationResult["correlationStrength"] = "none";

  if (photo.capturedAt) {
    // Photo has EXIF timestamp - use temporal correlation
    if (temporalCorrelation === "same_hour") {
      correlationStrength = "strong";
    } else if (temporalCorrelation === "same_day") {
      correlationStrength = "moderate";
    } else if (temporalCorrelation === "within_week") {
      correlationStrength = "weak";
    }

    // Boost if spatial correlation is good
    if (spatialCorrelation === "exact" && correlationStrength !== "strong") {
      correlationStrength = correlationStrength === "weak" ? "moderate" : "strong";
    }
  }

  // Generate narrative
  const narrative = generatePhotoNarrative({
    photoFileName: photo.fileName,
    hasCapturedAt: !!photo.capturedAt,
    temporalCorrelation,
    spatialCorrelation,
    timeDeltaMinutes,
    distanceFromPropertyMiles,
    matchedEventType: matchedEvent?.type,
  });

  return {
    photoId: photo.id,
    photoTimestamp,
    matchedEvent,
    timeDeltaMinutes,
    temporalCorrelation,
    spatialCorrelation,
    distanceFromPropertyMiles,
    correlationStrength,
    narrative,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getClaimPhotos(claimId: string): Promise<PhotoMetadata[]> {
  // Get photos from file_assets or documents tables
  const fileAssets = await prisma.file_assets.findMany({
    where: {
      claimId,
      category: { in: ["photo", "inspection_photo", "damage_photo"] },
    },
    select: {
      id: true,
      filename: true,
      createdAt: true,
      metadata: true,
    },
  });

  // Also check reports for embedded photos
  const reports = await prisma.reports.findMany({
    where: { claimId },
    select: {
      id: true,
      meta: true,
      createdAt: true,
    },
  });

  const photos: PhotoMetadata[] = [];

  // Process file_assets
  for (const asset of fileAssets) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = asset.metadata as any;
    photos.push({
      id: asset.id,
      claimId,
      fileName: asset.filename ?? "photo.jpg",
      capturedAt: metadata?.exif?.DateTimeOriginal ?? null,
      uploadedAt: asset.createdAt.toISOString(),
      lat: metadata?.exif?.GPSLatitude ?? null,
      lng: metadata?.exif?.GPSLongitude ?? null,
      cameraModel: metadata?.exif?.Model ?? null,
      orientation: metadata?.exif?.Orientation ?? null,
    });
  }

  // Process reports for photo references
  for (const report of reports) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = report.meta as any;
    if (payload?.photos && Array.isArray(payload.photos)) {
      for (const photo of payload.photos) {
        photos.push({
          id: `${report.id}_${photo.id ?? photos.length}`,
          claimId,
          fileName: photo.fileName ?? photo.name ?? "report_photo.jpg",
          capturedAt: photo.capturedAt ?? photo.timestamp ?? null,
          uploadedAt: report.createdAt.toISOString(),
          lat: photo.lat ?? null,
          lng: photo.lng ?? null,
          cameraModel: photo.camera ?? null,
          orientation: null,
        });
      }
    }
  }

  return photos;
}

function createEmptyReport(claimId: string): PhotoCorrelationReport {
  return {
    claimId,
    generatedAt: new Date().toISOString(),
    totalPhotos: 0,
    photosWithExif: 0,
    strongCorrelations: 0,
    moderateCorrelations: 0,
    weakCorrelations: 0,
    overallScore: 0,
    grade: "F",
    correlations: [],
    summary: "No photos available for correlation analysis.",
  };
}

function calculateOverallCorrelationScore(
  correlations: CorrelationResult[],
  photosWithExif: number
): number {
  if (correlations.length === 0) return 0;

  const strengthScores = {
    strong: 100,
    moderate: 70,
    weak: 40,
    none: 10,
  };

  // Weight by correlation strength
  const totalScore = correlations.reduce(
    (sum, c) => sum + strengthScores[c.correlationStrength],
    0
  );

  let score = totalScore / correlations.length;

  // Bonus for high EXIF coverage
  const exifRatio = photosWithExif / correlations.length;
  if (exifRatio >= 0.8) score += 10;
  else if (exifRatio >= 0.5) score += 5;

  // Penalty if no EXIF data at all
  if (photosWithExif === 0) {
    score = Math.min(score, 30);
  }

  return Math.round(Math.min(100, score));
}

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

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

function generatePhotoNarrative(params: {
  photoFileName: string;
  hasCapturedAt: boolean;
  temporalCorrelation: CorrelationResult["temporalCorrelation"];
  spatialCorrelation?: CorrelationResult["spatialCorrelation"];
  timeDeltaMinutes: number;
  distanceFromPropertyMiles?: number;
  matchedEventType?: string;
}): string {
  const {
    photoFileName,
    hasCapturedAt,
    temporalCorrelation,
    spatialCorrelation,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    timeDeltaMinutes,
    distanceFromPropertyMiles,
    matchedEventType,
  } = params;

  if (!hasCapturedAt) {
    return `Photo "${photoFileName}" does not contain timestamp metadata (EXIF). Temporal correlation cannot be verified.`;
  }

  let narrative = `Photo "${photoFileName}" `;

  // Temporal description
  if (temporalCorrelation === "same_hour") {
    narrative += "was captured within one hour of documented storm activity";
  } else if (temporalCorrelation === "same_day") {
    narrative += "was captured on the same day as documented storm activity";
  } else if (temporalCorrelation === "within_week") {
    narrative += "was captured within one week of documented storm activity";
  } else {
    narrative += "was captured outside the documented storm window";
  }

  if (matchedEventType) {
    narrative += ` (${formatEventType(matchedEventType)})`;
  }

  narrative += ".";

  // Spatial description (if available)
  if (spatialCorrelation && spatialCorrelation !== "unknown") {
    if (spatialCorrelation === "exact") {
      narrative += " GPS data confirms photo was taken at the property location.";
    } else if (spatialCorrelation === "nearby") {
      narrative += ` GPS data shows photo was taken ${distanceFromPropertyMiles?.toFixed(2)} miles from the property.`;
    } else if (spatialCorrelation === "same_area") {
      narrative += " GPS data indicates photo was taken in the general area.";
    } else {
      narrative += " GPS data indicates photo was taken outside the property area.";
    }
  }

  return narrative;
}

function formatEventType(type: string): string {
  const typeMap: Record<string, string> = {
    hail_report: "hail event",
    wind_report: "wind event",
    tor_warning: "tornado warning",
    svr_warning: "severe thunderstorm warning",
    ff_warning: "flash flood warning",
  };
  return typeMap[type] ?? type;
}

function generateCorrelationSummary(params: {
  totalPhotos: number;
  photosWithExif: number;
  strongCorrelations: number;
  moderateCorrelations: number;
  weakCorrelations: number;
  grade: string;
  stormDate?: Date | null;
}): string {
  const {
    totalPhotos,
    photosWithExif,
    strongCorrelations,
    moderateCorrelations,
    weakCorrelations,
    grade,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stormDate,
  } = params;

  let summary = `PHOTO-WEATHER CORRELATION SUMMARY\n`;
  summary += `Grade: ${grade}\n\n`;

  summary += `Total Photos Analyzed: ${totalPhotos}\n`;
  summary += `Photos with EXIF Timestamps: ${photosWithExif} (${Math.round((photosWithExif / totalPhotos) * 100)}%)\n\n`;

  summary += `Correlation Results:\n`;
  summary += `- Strong (within 1 hour of storm): ${strongCorrelations}\n`;
  summary += `- Moderate (same day): ${moderateCorrelations}\n`;
  summary += `- Weak (within 1 week): ${weakCorrelations}\n`;
  summary += `- No correlation: ${totalPhotos - strongCorrelations - moderateCorrelations - weakCorrelations}\n\n`;

  if (grade === "A" || grade === "B") {
    summary += "CONCLUSION: Photo documentation strongly supports the claimed date of loss. ";
    summary +=
      "The majority of photos were captured in close temporal proximity to documented weather events.";
  } else if (grade === "C") {
    summary +=
      "CONCLUSION: Photo documentation provides moderate support for the claimed date of loss. ";
    summary += "Some photos correlate with documented weather events, but coverage is incomplete.";
  } else {
    summary +=
      "CONCLUSION: Photo documentation provides limited support for temporal correlation. ";
    summary += "Consider obtaining photos with EXIF timestamps or additional documentation.";
  }

  return summary;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { calculateOverallCorrelationScore, correlatePhoto, generateCorrelationSummary };
