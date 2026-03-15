/**
 * Storm Evidence Adapter v1
 * Unified interface for all storm evidence correlation across the platform.
 *
 * This is the SINGLE SOURCE OF TRUTH for weather evidence on any claim.
 * All subsystems (damage reports, supplements, carrier packets, folder assembler)
 * should use this adapter instead of querying weather data directly.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";

// ============================================================================
// TYPES
// ============================================================================

export interface StormEvidence {
  id: string;
  claimId: string;

  // DOL Information
  selectedDOL: Date;
  dolSource: "weather_analysis" | "manual" | "carrier_provided";
  dolConfidence: number; // 0-1 scale

  // Peril Classification
  primaryPeril: string;
  secondaryPeril?: string | null;

  // Weather Metrics
  hailSizeInches?: number | null;
  windSpeedMph?: number | null;
  rainfallInches?: number | null;
  tornadoRating?: string | null;

  // Supporting Evidence
  topEvents: TopWeatherEvent[];
  radarImageUrls: string[];
  satImageUrls: string[];
  nwsCitations: string[];

  // Photo Correlation
  photoCorrelations: PhotoWeatherMatch[];
  correlationScore?: number | null;

  // Timeline
  stormStartTime?: Date | null;
  stormEndTime?: Date | null;
  stormDuration?: number | null; // minutes

  // AI Summaries
  aiNarrative?: string | null;
  carrierSummary?: string | null;

  // Scoring
  overallScore: number; // 0-100
  evidenceGrade: "A" | "B" | "C" | "D" | "F";

  // Metadata
  lastFetchedAt: Date;
  weatherSourceIds: string[];
  stormEventId?: string | null;
}

export interface TopWeatherEvent {
  eventId: string;
  type: string;
  magnitude?: number;
  distanceMiles: number;
  directionCardinal: string;
  timeUtc: string;
  source: string;
}

export interface PhotoWeatherMatch {
  photoId: string;
  photoTimestamp: string;
  matchedEventId?: string;
  matchedEventType?: string;
  timeDeltaMinutes: number;
  correlationStrength: "strong" | "moderate" | "weak" | "none";
}

export interface CreateStormEvidenceInput {
  claimId: string;
  orgId: string;

  // Optional overrides
  forceDOL?: Date;
  dolSource?: "weather_analysis" | "manual" | "carrier_provided";

  // Weather context (if already fetched)
  weatherReportId?: string;
  stormEventId?: string;
}

// ============================================================================
// MAIN ADAPTER FUNCTION
// ============================================================================

/**
 * Get or create storm evidence for a claim.
 * This is the main entry point - all subsystems should use this.
 *
 * @param claimId - The claim ID to get evidence for
 * @param options - Optional settings for fetching/creating
 * @returns StormEvidence object or null if not available
 */
export async function getStormEvidence(
  claimId: string,
  options?: {
    forceRefresh?: boolean;
    includePhotoCorrelation?: boolean;
  }
): Promise<StormEvidence | null> {
  try {
    const { forceRefresh = false, includePhotoCorrelation = true } = options ?? {};

    // 1. Check for existing storm_evidence record
    const existing = await prisma.storm_evidence.findUnique({
      where: { claimId },
    });

    // If exists and not forcing refresh, return it
    if (existing && !forceRefresh) {
      return mapDbToStormEvidence(existing);
    }

    // 2. Get claim with property info
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: {
          select: {
            id: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        storm_events: true,
      },
    });

    if (!claim) {
      logger.warn("[STORM_EVIDENCE] Claim not found", { claimId });
      return null;
    }

    // 3. Get weather reports for this claim
    const weatherReports = await prisma.weather_reports.findMany({
      where: { claimId },
      orderBy: { createdAt: "desc" },
    });

    // 4. Build evidence from available data
    const evidence = await buildStormEvidence({
      claim,
      weatherReports,
      existingEvidence: existing,
      includePhotoCorrelation,
    });

    // 5. Upsert to database
    const saved = await upsertStormEvidence(evidence);

    return saved;
  } catch (error) {
    logger.error("[STORM_EVIDENCE] Failed to get/create evidence", { claimId, error });
    return null;
  }
}

/**
 * Create storm evidence with explicit input (for manual DOL or carrier-provided dates)
 */
export async function createStormEvidence(
  input: CreateStormEvidenceInput
): Promise<StormEvidence | null> {
  try {
    const claim = await prisma.claims.findUnique({
      where: { id: input.claimId },
      include: {
        properties: {
          select: {
            id: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        storm_events: true,
      },
    });

    if (!claim) {
      logger.warn("[STORM_EVIDENCE] Claim not found for creation", { claimId: input.claimId });
      return null;
    }

    // Get weather reports if available
    const weatherReports = await prisma.weather_reports.findMany({
      where: { claimId: input.claimId },
      orderBy: { createdAt: "desc" },
    });

    // Build evidence with forced DOL if provided
    const evidence = await buildStormEvidence({
      claim,
      weatherReports,
      forceDOL: input.forceDOL,
      dolSource: input.dolSource,
      stormEventId: input.stormEventId,
      includePhotoCorrelation: true,
    });

    return await upsertStormEvidence(evidence);
  } catch (error) {
    logger.error("[STORM_EVIDENCE] Failed to create evidence", { input, error });
    return null;
  }
}

/**
 * Update storm evidence with photo correlations after photos are uploaded
 */
export async function updatePhotoCorrelations(
  claimId: string,
  photoTimestamps: Array<{ photoId: string; timestamp: string }>
): Promise<StormEvidence | null> {
  const evidence = await prisma.storm_evidence.findUnique({
    where: { claimId },
  });

  if (!evidence) {
    logger.warn("[STORM_EVIDENCE] No evidence found for photo correlation update", { claimId });
    return null;
  }

  const topEvents = evidence.topEvents as unknown as TopWeatherEvent[];
  const correlations = correlatePhotosWithEvents(photoTimestamps, topEvents);
  const correlationScore = calculateCorrelationScore(correlations);

  const updated = await prisma.storm_evidence.update({
    where: { claimId },
    data: {
      photoCorrelations: correlations as any,
      correlationScore,
      updatedAt: new Date(),
    },
  });

  return mapDbToStormEvidence(updated);
}

// ============================================================================
// INTERNAL BUILDERS
// ============================================================================

interface BuildEvidenceParams {
  claim: any; // Prisma claim with relations
  weatherReports: any[];
  existingEvidence?: any;
  forceDOL?: Date;
  dolSource?: "weather_analysis" | "manual" | "carrier_provided";
  stormEventId?: string;
  includePhotoCorrelation?: boolean;
}

async function buildStormEvidence(params: BuildEvidenceParams): Promise<StormEvidence> {
  const {
    claim,
    weatherReports,
    existingEvidence,
    forceDOL,
    dolSource,
    stormEventId,
    includePhotoCorrelation = true,
  } = params;

  const property = claim.properties;
  const stormEvent = claim.storm_events;

  // Determine DOL
  let selectedDOL = forceDOL ?? claim.dateOfLoss;
  let dolConfidence = 0.5;
  let actualDolSource: "weather_analysis" | "manual" | "carrier_provided" = dolSource ?? "manual";

  // Extract weather metrics from reports
  let hailSizeInches: number | null = null;
  let windSpeedMph: number | null = null;
  let rainfallInches: number | null = null;
  let primaryPeril = "storm";
  let topEvents: TopWeatherEvent[] = [];
  let radarImageUrls: string[] = [];
  let nwsCitations: string[] = [];
  let stormStartTime: Date | null = null;
  let stormEndTime: Date | null = null;

  // Process weather reports
  if (weatherReports.length > 0) {
    const latestReport = weatherReports[0];
    const providerRaw = latestReport.providerRaw as any;

    if (providerRaw) {
      hailSizeInches = providerRaw.maxHailInches ?? null;
      windSpeedMph = providerRaw.maxWindGustMph ?? null;
      rainfallInches = providerRaw.precipitationIn ?? null;
    }

    primaryPeril = latestReport.primaryPeril ?? "storm";
    dolConfidence = latestReport.confidence ?? 0.5;

    if (latestReport.periodFrom) stormStartTime = new Date(latestReport.periodFrom);
    if (latestReport.periodTo) stormEndTime = new Date(latestReport.periodTo);

    // Build citations
    nwsCitations.push(`Weather Report ID: ${latestReport.id}`);
    if (latestReport.mode === "open-meteo") {
      nwsCitations.push("Source: Open-Meteo Archive API");
    }

    actualDolSource = "weather_analysis";
  }

  // Process CAT storm event if linked
  if (stormEvent) {
    if (stormEvent.hailSizeMax) {
      hailSizeInches = Math.max(hailSizeInches ?? 0, Number(stormEvent.hailSizeMax));
    }
    if (stormEvent.windSpeedMax) {
      windSpeedMph = Math.max(windSpeedMph ?? 0, stormEvent.windSpeedMax);
    }
    if (stormEvent.rainfallInches) {
      rainfallInches = (rainfallInches ?? 0) + Number(stormEvent.rainfallInches);
    }
    if (stormEvent.radarImageUrl) {
      radarImageUrls.push(stormEvent.radarImageUrl);
    }
    if (stormEvent.noaaEventId) {
      nwsCitations.push(`NOAA Event: ${stormEvent.noaaEventId}`);
    }
    if (stormEvent.stormStartTime) {
      stormStartTime = stormEvent.stormStartTime;
    }
    if (stormEvent.stormEndTime) {
      stormEndTime = stormEvent.stormEndTime;
    }

    // Use storm event's peril classification
    primaryPeril = mapEventTypeToPeril(stormEvent.eventType);
  }

  // Determine primary peril from metrics if not set
  if (primaryPeril === "storm" && (hailSizeInches || windSpeedMph)) {
    primaryPeril = determinePrimaryPeril(hailSizeInches, windSpeedMph, stormEvent?.tornadoRating);
  }

  // Calculate overall score
  const overallScore = calculateOverallScore({
    hailSizeInches,
    windSpeedMph,
    rainfallInches,
    hasStormEvent: !!stormEvent,
    hasWeatherReport: weatherReports.length > 0,
    dolConfidence,
  });

  // Determine evidence grade
  const evidenceGrade = scoreToGrade(overallScore);

  // Calculate storm duration
  let stormDuration: number | null = null;
  if (stormStartTime && stormEndTime) {
    stormDuration = Math.round((stormEndTime.getTime() - stormStartTime.getTime()) / 60000);
  }

  // Photo correlations (placeholder - will be populated when photos are uploaded)
  const photoCorrelations: PhotoWeatherMatch[] = [];

  // Generate AI narrative
  const aiNarrative = generateAINarrative({
    primaryPeril,
    hailSizeInches,
    windSpeedMph,
    selectedDOL,
    stormDuration,
    address: property ? `${property.street}, ${property.city}, ${property.state}` : "Unknown",
  });

  const carrierSummary = generateCarrierSummary({
    primaryPeril,
    hailSizeInches,
    windSpeedMph,
    selectedDOL,
    overallScore,
    evidenceGrade,
  });

  return {
    id: existingEvidence?.id ?? createId(),
    claimId: claim.id,
    selectedDOL,
    dolSource: actualDolSource,
    dolConfidence,
    primaryPeril,
    secondaryPeril: null,
    hailSizeInches,
    windSpeedMph,
    rainfallInches,
    tornadoRating: stormEvent?.tornadoRating ?? null,
    topEvents,
    radarImageUrls,
    satImageUrls: [],
    nwsCitations,
    photoCorrelations,
    correlationScore: null,
    stormStartTime,
    stormEndTime,
    stormDuration,
    aiNarrative,
    carrierSummary,
    overallScore,
    evidenceGrade,
    lastFetchedAt: new Date(),
    weatherSourceIds: weatherReports.map((r: any) => r.id),
    stormEventId: stormEvent?.id ?? stormEventId ?? null,
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function upsertStormEvidence(evidence: StormEvidence): Promise<StormEvidence> {
  const data = {
    orgId: await getOrgIdForClaim(evidence.claimId),
    selectedDOL: evidence.selectedDOL,
    dolSource: evidence.dolSource,
    dolConfidence: evidence.dolConfidence,
    primaryPeril: evidence.primaryPeril,
    secondaryPeril: evidence.secondaryPeril,
    hailSizeInches: evidence.hailSizeInches,
    windSpeedMph: evidence.windSpeedMph,
    rainfallInches: evidence.rainfallInches,
    tornadoRating: evidence.tornadoRating,
    topEvents: evidence.topEvents as any,
    radarImageUrls: evidence.radarImageUrls as any,
    satImageUrls: evidence.satImageUrls as any,
    nwsCitations: evidence.nwsCitations as any,
    photoCorrelations: evidence.photoCorrelations as any,
    correlationScore: evidence.correlationScore,
    stormStartTime: evidence.stormStartTime,
    stormEndTime: evidence.stormEndTime,
    stormDuration: evidence.stormDuration,
    aiNarrative: evidence.aiNarrative,
    carrierSummary: evidence.carrierSummary,
    overallScore: evidence.overallScore,
    evidenceGrade: evidence.evidenceGrade,
    lastFetchedAt: evidence.lastFetchedAt,
    weatherSourceIds: evidence.weatherSourceIds as any,
    stormEventId: evidence.stormEventId,
    updatedAt: new Date(),
  };

  const result = await prisma.storm_evidence.upsert({
    where: { claimId: evidence.claimId },
    create: {
      id: evidence.id,
      claimId: evidence.claimId,
      ...data,
    },
    update: data,
  });

  return mapDbToStormEvidence(result);
}

async function getOrgIdForClaim(claimId: string): Promise<string> {
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: { orgId: true },
  });
  return claim?.orgId ?? "";
}

function mapDbToStormEvidence(db: any): StormEvidence {
  return {
    id: db.id,
    claimId: db.claimId,
    selectedDOL: new Date(db.selectedDOL),
    dolSource: db.dolSource,
    dolConfidence: db.dolConfidence,
    primaryPeril: db.primaryPeril,
    secondaryPeril: db.secondaryPeril,
    hailSizeInches: db.hailSizeInches ? Number(db.hailSizeInches) : null,
    windSpeedMph: db.windSpeedMph,
    rainfallInches: db.rainfallInches ? Number(db.rainfallInches) : null,
    tornadoRating: db.tornadoRating,
    topEvents: (db.topEvents as TopWeatherEvent[]) ?? [],
    radarImageUrls: (db.radarImageUrls as string[]) ?? [],
    satImageUrls: (db.satImageUrls as string[]) ?? [],
    nwsCitations: (db.nwsCitations as string[]) ?? [],
    photoCorrelations: (db.photoCorrelations as PhotoWeatherMatch[]) ?? [],
    correlationScore: db.correlationScore,
    stormStartTime: db.stormStartTime ? new Date(db.stormStartTime) : null,
    stormEndTime: db.stormEndTime ? new Date(db.stormEndTime) : null,
    stormDuration: db.stormDuration,
    aiNarrative: db.aiNarrative,
    carrierSummary: db.carrierSummary,
    overallScore: db.overallScore,
    evidenceGrade: db.evidenceGrade as "A" | "B" | "C" | "D" | "F",
    lastFetchedAt: new Date(db.lastFetchedAt),
    weatherSourceIds: (db.weatherSourceIds as string[]) ?? [],
    stormEventId: db.stormEventId,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function determinePrimaryPeril(
  hailSize: number | null,
  windSpeed: number | null,
  tornadoRating: string | null
): string {
  // Tornado takes precedence
  if (tornadoRating) return "tornado";

  // Compare hail vs wind severity
  const hailScore = hailSize ? hailSize * 30 : 0; // 1" hail = 30 points
  const windScore = windSpeed ? (windSpeed - 40) * 0.5 : 0; // Points above 40mph

  if (hailScore > windScore && hailSize && hailSize >= 0.5) {
    return "hail";
  }
  if (windSpeed && windSpeed >= 50) {
    return "wind";
  }

  return "storm";
}

function mapEventTypeToPeril(eventType: string): string {
  const typeMap: Record<string, string> = {
    HAIL: "hail",
    WIND: "wind",
    TORNADO: "tornado",
    FLOOD: "flood",
    HURRICANE: "wind",
    THUNDERSTORM: "storm",
  };
  return typeMap[eventType?.toUpperCase()] ?? "storm";
}

function calculateOverallScore(params: {
  hailSizeInches: number | null;
  windSpeedMph: number | null;
  rainfallInches: number | null;
  hasStormEvent: boolean;
  hasWeatherReport: boolean;
  dolConfidence: number;
}): number {
  let score = 0;

  // Weather metrics (up to 50 points)
  if (params.hailSizeInches) {
    score += Math.min(25, params.hailSizeInches * 15); // 1.5" = 22.5 points
  }
  if (params.windSpeedMph) {
    score += Math.min(25, (params.windSpeedMph - 40) * 0.5); // 90mph = 25 points
  }

  // Data completeness (up to 30 points)
  if (params.hasStormEvent) score += 15;
  if (params.hasWeatherReport) score += 15;

  // DOL confidence (up to 20 points)
  score += params.dolConfidence * 20;

  return Math.round(Math.min(100, score));
}

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function correlatePhotosWithEvents(
  photos: Array<{ photoId: string; timestamp: string }>,
  events: TopWeatherEvent[]
): PhotoWeatherMatch[] {
  return photos.map((photo) => {
    const photoTime = new Date(photo.timestamp).getTime();

    // Find closest event
    let closestEvent: TopWeatherEvent | null = null;
    let minDelta = Infinity;

    for (const event of events) {
      const eventTime = new Date(event.timeUtc).getTime();
      const delta = Math.abs(photoTime - eventTime);
      if (delta < minDelta) {
        minDelta = delta;
        closestEvent = event;
      }
    }

    const timeDeltaMinutes = Math.round(minDelta / 60000);

    // Determine correlation strength
    let correlationStrength: "strong" | "moderate" | "weak" | "none" = "none";
    if (closestEvent) {
      if (timeDeltaMinutes <= 60) correlationStrength = "strong";
      else if (timeDeltaMinutes <= 360)
        correlationStrength = "moderate"; // 6 hours
      else if (timeDeltaMinutes <= 1440) correlationStrength = "weak"; // 24 hours
    }

    return {
      photoId: photo.photoId,
      photoTimestamp: photo.timestamp,
      matchedEventId: closestEvent?.eventId,
      matchedEventType: closestEvent?.type,
      timeDeltaMinutes,
      correlationStrength,
    };
  });
}

function calculateCorrelationScore(correlations: PhotoWeatherMatch[]): number {
  if (correlations.length === 0) return 0;

  const strengthScores = {
    strong: 100,
    moderate: 70,
    weak: 40,
    none: 0,
  };

  const totalScore = correlations.reduce(
    (sum, c) => sum + strengthScores[c.correlationStrength],
    0
  );
  return Math.round(totalScore / correlations.length);
}

function generateAINarrative(params: {
  primaryPeril: string;
  hailSizeInches: number | null;
  windSpeedMph: number | null;
  selectedDOL: Date;
  stormDuration: number | null;
  address: string;
}): string {
  const { primaryPeril, hailSizeInches, windSpeedMph, selectedDOL, stormDuration, address } =
    params;
  const dateStr = selectedDOL.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let narrative = `On ${dateStr}, the property located at ${address} was impacted by a significant weather event. `;

  if (primaryPeril === "hail" && hailSizeInches) {
    narrative += `Hail up to ${hailSizeInches.toFixed(2)} inches in diameter was reported in the vicinity. `;
    if (hailSizeInches >= 1.0) {
      narrative +=
        "Hail of this size is categorized as 'damaging' and typically causes impact damage to roofing materials, siding, and outdoor equipment. ";
    }
  }

  if (primaryPeril === "wind" && windSpeedMph) {
    narrative += `Wind gusts reached ${windSpeedMph} mph during the event. `;
    if (windSpeedMph >= 60) {
      narrative +=
        "Sustained winds at this velocity are capable of causing structural damage, lifting shingles, and downing trees or power lines. ";
    }
  }

  if (primaryPeril === "tornado") {
    narrative +=
      "A tornado was confirmed in the area during this event. Tornadic activity presents an extreme risk of catastrophic damage to structures. ";
  }

  if (stormDuration) {
    const hours = Math.floor(stormDuration / 60);
    const mins = stormDuration % 60;
    if (hours > 0) {
      narrative += `The storm persisted for approximately ${hours} hour${hours > 1 ? "s" : ""} and ${mins} minutes. `;
    } else {
      narrative += `The storm persisted for approximately ${mins} minutes. `;
    }
  }

  narrative +=
    "This weather verification is based on official National Weather Service data and meteorological archives.";

  return narrative;
}

function generateCarrierSummary(params: {
  primaryPeril: string;
  hailSizeInches: number | null;
  windSpeedMph: number | null;
  selectedDOL: Date;
  overallScore: number;
  evidenceGrade: string;
}): string {
  const { primaryPeril, hailSizeInches, windSpeedMph, selectedDOL, overallScore, evidenceGrade } =
    params;
  const dateStr = selectedDOL.toISOString().split("T")[0];

  let summary = `WEATHER VERIFICATION SUMMARY\n`;
  summary += `Date of Loss: ${dateStr}\n`;
  summary += `Primary Peril: ${primaryPeril.toUpperCase()}\n`;

  if (hailSizeInches) {
    summary += `Max Hail Size: ${hailSizeInches.toFixed(2)} inches\n`;
  }
  if (windSpeedMph) {
    summary += `Max Wind Speed: ${windSpeedMph} mph\n`;
  }

  summary += `\nEvidence Strength: Grade ${evidenceGrade} (${overallScore}/100)\n`;
  summary += `\nThis weather verification is based on official NWS data and supports the claimed date of loss.`;

  return summary;
}

// ============================================================================
// EXPORTS FOR SPECIFIC USE CASES
// ============================================================================

/**
 * Quick check if claim has storm evidence
 */
export async function hasStormEvidence(claimId: string): Promise<boolean> {
  const count = await prisma.storm_evidence.count({
    where: { claimId },
  });
  return count > 0;
}

/**
 * Get storm evidence summary for carrier packet
 */
export async function getCarrierPacketEvidence(claimId: string): Promise<{
  summary: string;
  grade: string;
  radarUrls: string[];
} | null> {
  const evidence = await getStormEvidence(claimId);
  if (!evidence) return null;

  return {
    summary: evidence.carrierSummary ?? "",
    grade: evidence.evidenceGrade,
    radarUrls: evidence.radarImageUrls,
  };
}

/**
 * Get evidence for damage report AI
 */
export async function getDamageReportEvidence(claimId: string): Promise<{
  narrative: string;
  primaryPeril: string;
  hailSize: number | null;
  windSpeed: number | null;
  dolConfidence: number;
} | null> {
  const evidence = await getStormEvidence(claimId);
  if (!evidence) return null;

  return {
    narrative: evidence.aiNarrative ?? "",
    primaryPeril: evidence.primaryPeril,
    hailSize: evidence.hailSizeInches ?? null,
    windSpeed: evidence.windSpeedMph ?? null,
    dolConfidence: evidence.dolConfidence,
  };
}

/**
 * Get evidence for supplement builder
 */
export async function getSupplementEvidence(claimId: string): Promise<{
  weatherJustification: string;
  perilType: string;
  magnitude: { hail?: number; wind?: number };
  citations: string[];
} | null> {
  const evidence = await getStormEvidence(claimId);
  if (!evidence) return null;

  return {
    weatherJustification: evidence.aiNarrative ?? "",
    perilType: evidence.primaryPeril,
    magnitude: {
      hail: evidence.hailSizeInches ?? undefined,
      wind: evidence.windSpeedMph ?? undefined,
    },
    citations: evidence.nwsCitations,
  };
}
