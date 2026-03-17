/**
 * DOL (Date of Loss) Scoring & Recommendation Engine
 * Enhanced scoring system with confidence levels and actionable recommendations.
 *
 * This module provides carrier-ready DOL analysis with:
 * - Multi-source weather event scoring
 * - Confidence intervals
 * - Alternative date suggestions
 * - Carrier submission recommendations
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { DOLResult, PropertyContext, ScoredEvent, WeatherEvent } from "@/types/weather";

import { pickQuickDOL, scoreEventsForProperty } from "./score";

// ============================================================================
// TYPES
// ============================================================================

export interface DOLRecommendation {
  // Primary recommendation
  recommendedDate: string; // ISO date (YYYY-MM-DD)
  confidence: DOLConfidence;
  confidenceScore: number; // 0-100

  // Weather basis
  primaryPeril: string;
  perilMagnitude: string; // "1.5 inch hail", "75 mph wind"

  // Supporting events
  supportingEvents: SupportingEvent[];
  totalEventsAnalyzed: number;

  // Alternative dates (if confidence is low)
  alternativeDates: AlternativeDate[];

  // Actionable insights
  recommendation: RecommendationType;
  recommendationReason: string;
  actionItems: string[];

  // Carrier-ready content
  carrierNarrative: string;
  citations: string[];
}

export interface SupportingEvent {
  date: string;
  type: string;
  magnitude?: number;
  distanceMiles: number;
  direction: string;
  source: string;
  score: number;
}

export interface AlternativeDate {
  date: string;
  confidence: number;
  reason: string;
  peril: string;
}

export type DOLConfidence = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
export type RecommendationType =
  | "PROCEED" // Strong evidence, proceed with claim
  | "VERIFY_DATE" // Evidence suggests different date
  | "GATHER_MORE_DATA" // Need additional weather reports
  | "MANUAL_REVIEW" // Complex case, needs human review
  | "NO_WEATHER_FOUND"; // No weather events found

// ============================================================================
// MAIN RECOMMENDATION FUNCTION
// ============================================================================

/**
 * Analyze weather data and provide DOL recommendation for a claim
 */
export async function analyzeDOL(
  claimId: string,
  options?: {
    forceAnalysis?: boolean;
    daysBack?: number;
  }
): Promise<DOLRecommendation | null> {
  try {
    const { daysBack = 120 } = options ?? {};

    // 1. Get claim with property and weather reports (which have coordinates)
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
        weather_reports: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!claim) {
      logger.warn("[DOL_ANALYSIS] Claim not found", { claimId });
      return null;
    }

    const property = claim.properties;
    // Get coordinates from weather reports (which geocoded the address)
    const weatherReport = claim.weather_reports?.[0];
    const lat = weatherReport?.lat;
    const lng = weatherReport?.lng;

    if (!property || !lat || !lng) {
      logger.warn("[DOL_ANALYSIS] Property missing coordinates - run weather verification first", {
        claimId,
      });
      return createInsufficientDataRecommendation(claim.dateOfLoss);
    }

    const currentDOL = claim.dateOfLoss;

    // 2. Gather all weather events from various sources
    const weatherEvents = await gatherWeatherEvents(claimId, { ...property, lat, lng }, daysBack);

    if (weatherEvents.length === 0) {
      logger.info("[DOL_ANALYSIS] No weather events found", { claimId });
      return createNoWeatherRecommendation(currentDOL);
    }

    // 3. Score events against property location
    const propertyContext: PropertyContext = {
      lat,
      lon: lng,
      address: `${property.street}, ${property.city}, ${property.state}`,
    };

    const { scored, byDate } = scoreEventsForProperty(weatherEvents, propertyContext);

    // 4. Get DOL recommendation from scoring engine
    const dolResult = pickQuickDOL(scored, byDate);

    // 5. Analyze and build recommendation
    const recommendation = buildRecommendation({
      dolResult,
      scored,
      byDate,
      currentDOL,
      property: propertyContext,
    });

    logger.info("[DOL_ANALYSIS] Analysis complete", {
      claimId,
      recommendedDate: recommendation.recommendedDate,
      confidence: recommendation.confidence,
      eventsAnalyzed: recommendation.totalEventsAnalyzed,
    });

    return recommendation;
  } catch (error) {
    logger.error("[DOL_ANALYSIS] Analysis failed", { claimId, error });
    return null;
  }
}

/**
 * Compare claim DOL with weather-recommended DOL
 */
export async function validateClaimDOL(claimId: string): Promise<{
  isValid: boolean;
  currentDOL: string;
  recommendedDOL: string | null;
  daysDifference: number;
  recommendation: string;
} | null> {
  const analysis = await analyzeDOL(claimId);
  if (!analysis) return null;

  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: { dateOfLoss: true },
  });

  if (!claim) return null;

  const currentDOL = claim.dateOfLoss.toISOString().split("T")[0];
  const daysDiff = Math.abs(
    Math.floor(
      (new Date(analysis.recommendedDate).getTime() - claim.dateOfLoss.getTime()) / 86400000
    )
  );

  const isValid = daysDiff <= 3 || analysis.confidence === "INSUFFICIENT";

  let recommendation = "";
  if (isValid) {
    recommendation = "Current date of loss aligns with weather data.";
  } else if (daysDiff <= 7) {
    recommendation = `Weather data suggests ${analysis.recommendedDate} may be a better DOL. Consider reviewing before submission.`;
  } else {
    recommendation = `Significant discrepancy detected. Weather data indicates ${analysis.recommendedDate}. Manual review recommended.`;
  }

  return {
    isValid,
    currentDOL,
    recommendedDOL: analysis.recommendedDate,
    daysDifference: daysDiff,
    recommendation,
  };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

async function gatherWeatherEvents(
  claimId: string,
  property: { lat: number; lng: number },
  daysBack: number
): Promise<WeatherEvent[]> {
  const events: WeatherEvent[] = [];

  // 1. Get from weather_reports
  const reports = await prisma.weather_reports.findMany({
    where: { claimId },
    select: {
      id: true,
      events: true,
      primaryPeril: true,
      providerRaw: true,
      dol: true,
    },
  });

  for (const report of reports) {
    if (report.events && Array.isArray(report.events)) {
      events.push(...(report.events as unknown as WeatherEvent[]));
    }

    // Create synthetic event from report data
    const raw = report.providerRaw as any;
    if (raw && report.dol) {
      if (raw.maxHailInches && raw.maxHailInches > 0) {
        events.push({
          id: `${report.id}_hail`,
          source: "mesonet",
          type: "hail_report",
          time_utc: report.dol.toISOString(),
          magnitude: raw.maxHailInches,
          geometry: { type: "Point", coordinates: [property.lng, property.lat] },
        });
      }
      if (raw.maxWindGustMph && raw.maxWindGustMph > 40) {
        events.push({
          id: `${report.id}_wind`,
          source: "mesonet",
          type: "wind_report",
          time_utc: report.dol.toISOString(),
          magnitude: raw.maxWindGustMph,
          geometry: { type: "Point", coordinates: [property.lng, property.lat] },
        });
      }
    }
  }

  // 2. Get from storm_events table (if claim is linked to a CAT event)
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    include: {
      storm_events: true,
    },
  });

  if (claim?.storm_events) {
    const storm = claim.storm_events;

    if (storm.hailSizeMax && Number(storm.hailSizeMax) > 0) {
      events.push({
        id: `storm_${storm.id}_hail`,
        source: "cap",
        type: "hail_report",
        time_utc: storm.stormStartTime.toISOString(),
        magnitude: Number(storm.hailSizeMax),
        geometry: {
          type: "Point",
          coordinates: [Number(storm.centerLng), Number(storm.centerLat)],
        },
      });
    }

    if (storm.windSpeedMax && storm.windSpeedMax > 40) {
      events.push({
        id: `storm_${storm.id}_wind`,
        source: "cap",
        type: "wind_report",
        time_utc: storm.stormStartTime.toISOString(),
        magnitude: storm.windSpeedMax,
        geometry: {
          type: "Point",
          coordinates: [Number(storm.centerLng), Number(storm.centerLat)],
        },
      });
    }

    if (storm.tornadoRating) {
      events.push({
        id: `storm_${storm.id}_tornado`,
        source: "cap",
        type: "tor_warning",
        time_utc: storm.stormStartTime.toISOString(),
        magnitude: efToNumber(storm.tornadoRating),
        geometry: {
          type: "Point",
          coordinates: [Number(storm.centerLng), Number(storm.centerLat)],
        },
      });
    }
  }

  return events;
}

function buildRecommendation(params: {
  dolResult: DOLResult;
  scored: ScoredEvent[];
  byDate: Map<string, number>;
  currentDOL: Date;
  property: PropertyContext;
}): DOLRecommendation {
  const { dolResult, scored, byDate, currentDOL, property } = params;

  // Determine confidence level
  const confidence = determineConfidence(dolResult.confidence, scored.length);
  const confidenceScore = Math.round(dolResult.confidence * 100);

  // Get primary peril from top events
  const { primaryPeril, perilMagnitude } = determinePrimaryPeril(dolResult.top_events);

  // Build supporting events list
  const supportingEvents: SupportingEvent[] = dolResult.top_events.map((e) => ({
    date: e.time_utc.split("T")[0],
    type: formatEventType(e.type),
    magnitude: e.magnitude,
    distanceMiles: e.distance_miles,
    direction: e.direction_cardinal,
    source: e.source,
    score: scored.find((s) => s.id === e.eventId)?.score ?? 0,
  }));

  // Find alternative dates (dates with scores above threshold but not the best)
  const alternativeDates = findAlternativeDates(byDate, dolResult.recommended_date_utc);

  // Determine recommendation type
  const currentDOLStr = currentDOL.toISOString().split("T")[0];
  const daysDiff = Math.abs(
    Math.floor(
      (new Date(dolResult.recommended_date_utc).getTime() - currentDOL.getTime()) / 86400000
    )
  );

  const { recommendation, recommendationReason, actionItems } = determineRecommendation({
    confidence,
    daysDiff,
    currentDOL: currentDOLStr,
    recommendedDOL: dolResult.recommended_date_utc,
    eventsCount: scored.length,
  });

  // Build carrier narrative
  const carrierNarrative = buildCarrierNarrative({
    recommendedDate: dolResult.recommended_date_utc,
    confidence,
    primaryPeril,
    perilMagnitude,
    supportingEvents,
    property,
  });

  // Build citations
  const citations = buildCitations(dolResult.top_events);

  return {
    recommendedDate: dolResult.recommended_date_utc,
    confidence,
    confidenceScore,
    primaryPeril,
    perilMagnitude,
    supportingEvents,
    totalEventsAnalyzed: dolResult.total_events_scanned,
    alternativeDates,
    recommendation,
    recommendationReason,
    actionItems,
    carrierNarrative,
    citations,
  };
}

function determineConfidence(rawConfidence: number, eventsCount: number): DOLConfidence {
  if (eventsCount < 2) return "INSUFFICIENT";
  if (rawConfidence >= 0.75) return "HIGH";
  if (rawConfidence >= 0.5) return "MEDIUM";
  if (rawConfidence >= 0.25) return "LOW";
  return "INSUFFICIENT";
}

function determinePrimaryPeril(topEvents: DOLResult["top_events"]): {
  primaryPeril: string;
  perilMagnitude: string;
} {
  const eventTypes = topEvents.map((e) => e.type);

  // Count by type
  const typeCounts: Record<string, number> = {};
  const typeMagnitudes: Record<string, number> = {};

  for (const event of topEvents) {
    typeCounts[event.type] = (typeCounts[event.type] ?? 0) + 1;
    if (event.magnitude) {
      typeMagnitudes[event.type] = Math.max(typeMagnitudes[event.type] ?? 0, event.magnitude);
    }
  }

  // Tornado takes precedence
  if (typeCounts["tor_warning"]) {
    return { primaryPeril: "tornado", perilMagnitude: "Tornado Warning" };
  }

  // Otherwise, use most common type
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const [primaryType] = sortedTypes[0] ?? ["storm", 0];

  let primaryPeril = "storm";
  let perilMagnitude = "Storm event";

  if (primaryType === "hail_report") {
    primaryPeril = "hail";
    const mag = typeMagnitudes["hail_report"];
    perilMagnitude = mag ? `${mag.toFixed(2)} inch hail` : "Hail reported";
  } else if (primaryType === "wind_report") {
    primaryPeril = "wind";
    const mag = typeMagnitudes["wind_report"];
    perilMagnitude = mag ? `${Math.round(mag)} mph wind` : "Damaging winds";
  } else if (primaryType === "svr_warning") {
    primaryPeril = "severe_storm";
    perilMagnitude = "Severe Thunderstorm Warning";
  }

  return { primaryPeril, perilMagnitude };
}

function findAlternativeDates(byDate: Map<string, number>, bestDate: string): AlternativeDate[] {
  const alternatives: AlternativeDate[] = [];

  const sortedDates = [...byDate.entries()]
    .filter(([date]) => date !== bestDate)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [date, score] of sortedDates) {
    if (score >= 30) {
      alternatives.push({
        date,
        confidence: Math.min(1, score / 100),
        reason: score >= 50 ? "Significant weather activity" : "Some weather activity",
        peril: "storm",
      });
    }
  }

  return alternatives;
}

function determineRecommendation(params: {
  confidence: DOLConfidence;
  daysDiff: number;
  currentDOL: string;
  recommendedDOL: string;
  eventsCount: number;
}): {
  recommendation: RecommendationType;
  recommendationReason: string;
  actionItems: string[];
} {
  const { confidence, daysDiff, currentDOL, recommendedDOL, eventsCount } = params;

  // No weather events
  if (eventsCount === 0) {
    return {
      recommendation: "NO_WEATHER_FOUND",
      recommendationReason: "No significant weather events found in the search window.",
      actionItems: [
        "Verify the correct address was used",
        "Expand search window (more days)",
        "Check alternate weather data sources",
      ],
    };
  }

  // Insufficient data
  if (confidence === "INSUFFICIENT") {
    return {
      recommendation: "GATHER_MORE_DATA",
      recommendationReason: "Weather data is insufficient for high-confidence DOL determination.",
      actionItems: [
        "Request detailed weather report from third-party provider",
        "Check for additional storm reports in the area",
        "Consider adjusting the search radius",
      ],
    };
  }

  // Dates match (within 3 days)
  if (daysDiff <= 3) {
    return {
      recommendation: "PROCEED",
      recommendationReason: `Weather data supports the claimed DOL of ${currentDOL}.`,
      actionItems: [
        "Include weather verification in carrier submission",
        "Document supporting weather events",
      ],
    };
  }

  // Small discrepancy (4-7 days)
  if (daysDiff <= 7 && confidence !== "HIGH") {
    return {
      recommendation: "VERIFY_DATE",
      recommendationReason: `Weather data suggests ${recommendedDOL} may be a better DOL. Current DOL is ${currentDOL}.`,
      actionItems: [
        "Review weather data with homeowner",
        "Consider updating DOL if appropriate",
        "Document reason for date selection",
      ],
    };
  }

  // Large discrepancy or high confidence different date
  if (daysDiff > 7 || (confidence === "HIGH" && daysDiff > 3)) {
    return {
      recommendation: "MANUAL_REVIEW",
      recommendationReason: `Significant date discrepancy. Weather data suggests ${recommendedDOL}, but claim shows ${currentDOL}.`,
      actionItems: [
        "Schedule review with claims manager",
        "Interview homeowner about date of loss",
        "Consider possibility of multiple storm events",
        "Document investigation findings",
      ],
    };
  }

  // Default
  return {
    recommendation: "PROCEED",
    recommendationReason: "Weather data provides reasonable support for the claimed DOL.",
    actionItems: ["Include weather verification in carrier submission"],
  };
}

function buildCarrierNarrative(params: {
  recommendedDate: string;
  confidence: DOLConfidence;
  primaryPeril: string;
  perilMagnitude: string;
  supportingEvents: SupportingEvent[];
  property: PropertyContext;
}): string {
  const { recommendedDate, confidence, primaryPeril, perilMagnitude, supportingEvents, property } =
    params;

  const dateStr = new Date(recommendedDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let narrative = `WEATHER VERIFICATION FOR DATE OF LOSS\n\n`;
  narrative += `Property: ${property.address}\n`;
  narrative += `Recommended Date of Loss: ${dateStr}\n`;
  narrative += `Confidence Level: ${confidence}\n`;
  narrative += `Primary Peril: ${perilMagnitude}\n\n`;

  narrative += `SUPPORTING WEATHER EVENTS:\n`;
  for (const event of supportingEvents.slice(0, 5)) {
    narrative += `- ${event.date}: ${event.type}`;
    if (event.magnitude) {
      narrative += ` (${event.magnitude}${event.type.includes("hail") ? " in" : " mph"})`;
    }
    narrative += ` - ${event.distanceMiles.toFixed(1)} miles ${event.direction}\n`;
  }

  narrative += `\nThis weather verification is based on official National Weather Service data, `;
  narrative += `Iowa State Mesonet reports, and NOAA archives. `;

  if (confidence === "HIGH") {
    narrative += `The evidence strongly supports the date of loss claim.`;
  } else if (confidence === "MEDIUM") {
    narrative += `The evidence provides reasonable support for the date of loss claim.`;
  } else {
    narrative += `Additional documentation may be beneficial to support this claim.`;
  }

  return narrative;
}

function buildCitations(events: DOLResult["top_events"]): string[] {
  const citations: string[] = [];
  const sources = new Set(events.map((e) => e.source));

  if (sources.has("cap")) {
    citations.push("National Weather Service (NWS) Common Alerting Protocol (CAP)");
  }
  if (sources.has("mesonet")) {
    citations.push("Iowa State University Mesonet Storm Reports");
  }
  if (sources.has("nexrad")) {
    citations.push("NOAA NEXRAD Radar Archive");
  }

  citations.push("Weather data retrieved via SkaiScraper Weather Intelligence System");

  return citations;
}

function formatEventType(type: string): string {
  const typeMap: Record<string, string> = {
    hail_report: "Hail Report",
    wind_report: "Wind Report",
    tor_warning: "Tornado Warning",
    svr_warning: "Severe Thunderstorm Warning",
    ff_warning: "Flash Flood Warning",
    smw_warning: "Special Marine Warning",
    radar_core: "Radar Detection",
  };
  return typeMap[type] ?? type;
}

function efToNumber(rating: string): number {
  const efMap: Record<string, number> = {
    EF0: 0,
    EF1: 1,
    EF2: 2,
    EF3: 3,
    EF4: 4,
    EF5: 5,
  };
  return efMap[rating?.toUpperCase()] ?? 0;
}

function createInsufficientDataRecommendation(currentDOL: Date): DOLRecommendation {
  return {
    recommendedDate: currentDOL.toISOString().split("T")[0],
    confidence: "INSUFFICIENT",
    confidenceScore: 0,
    primaryPeril: "unknown",
    perilMagnitude: "No data available",
    supportingEvents: [],
    totalEventsAnalyzed: 0,
    alternativeDates: [],
    recommendation: "GATHER_MORE_DATA",
    recommendationReason: "Property location is required for weather analysis.",
    actionItems: ["Add property coordinates (lat/lng)", "Verify property address is complete"],
    carrierNarrative: "Weather verification pending - property location required.",
    citations: [],
  };
}

function createNoWeatherRecommendation(currentDOL: Date): DOLRecommendation {
  return {
    recommendedDate: currentDOL.toISOString().split("T")[0],
    confidence: "INSUFFICIENT",
    confidenceScore: 0,
    primaryPeril: "unknown",
    perilMagnitude: "No weather events detected",
    supportingEvents: [],
    totalEventsAnalyzed: 0,
    alternativeDates: [],
    recommendation: "NO_WEATHER_FOUND",
    recommendationReason:
      "No significant weather events found near the property during the search period.",
    actionItems: [
      "Expand search window",
      "Request third-party weather report",
      "Check for localized events not captured in public data",
    ],
    carrierNarrative:
      "No significant weather events found in public records for this location and time period.",
    citations: [],
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { buildCarrierNarrative, determineConfidence, findAlternativeDates };
