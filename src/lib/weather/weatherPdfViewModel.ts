/**
 * Weather PDF View Model — v2
 *
 * Centralized data structure for weather report PDF generation.
 * Uses EffectiveDolContext as the single source of truth.
 * Separates claim-window conditions from storm-event evidence.
 * Embeds real radar images (base64) instead of text placeholders.
 *
 * Business logic happens HERE. The PDF renderer only renders.
 *
 * @module lib/weather/weatherPdfViewModel
 */

import { logger } from "@/lib/logger";

import type { EffectiveDolContext } from "./effectiveDolContext";
import { buildEffectiveDolContext } from "./effectiveDolContext";

// ─────────────────────────────────────────────────────────────────────────────
// Normalized Weather Models
// ─────────────────────────────────────────────────────────────────────────────

export interface NormalizedWeatherObservation {
  date: string; // YYYY-MM-DD
  source: string; // "visual_crossing", "weatherstack", "open_meteo"
  tempHigh?: number; // °F
  tempLow?: number; // °F
  precip?: number; // inches
  precipProb?: number; // 0-100
  windSpeed?: number; // mph (sustained)
  windGust?: number; // mph
  snowfall?: number; // inches
  conditions?: string; // "Clear", "Rain", "Thunderstorm", etc.
  description?: string; // Longer description
  humidity?: number; // %
  confidence: number; // 0-1 how reliable this data is
}

export interface NormalizedStormEvidence {
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  type: string; // "hail", "wind", "tornado_warning", "thunderstorm", etc.
  description?: string;
  severity?: string; // "Severe", "Moderate", "Minor"
  intensity?: string;
  hailSize?: string; // e.g. "1.75 inch"
  windSpeed?: string; // e.g. "65 mph"
  distanceMiles?: number;
  direction?: string; // "NW", "SE", etc.
  source: string; // "mesonet", "cap", "ai_analysis"
  score: number; // 0-100 relevance
  notes?: string;
  /** Whether this event falls within the 3-day claim window */
  isInClaimWindow: boolean;
  /** Whether this event falls on a different date than the DOL */
  isNearbyEvent: boolean;
}

export interface NormalizedRadarFrame {
  url: string;
  timestamp: string;
  stationId: string;
  label: string;
  frameType: "before" | "peak" | "after" | "other";
  /** Base64-encoded image data for PDF embedding */
  base64Data?: string;
  /** Whether we actually fetched the image successfully */
  imageLoaded: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// View Model Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WeatherDayData {
  date: string;
  label: "Day Before" | "Date of Loss" | "Day After";
  tempHigh?: number;
  tempLow?: number;
  precip?: number;
  precipProb?: number;
  windSpeed?: number;
  windGust?: number;
  conditions?: string;
  description?: string;
  isAnchorDay: boolean;
}

export interface ClaimSnapshot {
  claimNumber: string;
  insuredName: string;
  carrier: string;
  policyNumber: string;
  adjusterName: string;
  adjusterPhone: string;
  adjusterEmail: string;
  dateOfLoss: string;
  propertyAddress: string;
}

export interface CompanyBranding {
  companyName: string;
  phone: string;
  email: string;
  website: string;
  license: string;
  logoUrl: string;
  logoBase64?: string;
  primaryColor: string;
  address: string;
}

export interface LocationData {
  lat: number;
  lng: number;
  resolved: boolean;
  radarStationId: string;
}

export interface ResolvedPeril {
  type: string;
  confidence: "high" | "medium" | "low" | "unknown";
  displayText: string;
  evidenceSummary: string;
}

export interface EvidenceSummary {
  hasHail: boolean;
  hasWind: boolean;
  hasRain: boolean;
  hasRadar: boolean;
  maxWindGust?: number;
  maxPrecip?: number;
  hailSizeMax?: string;
  stormConfidence: "high" | "medium" | "low" | "none";
}

export interface WeatherPdfViewModel {
  // Report metadata
  reportId: string;
  generatedAt: string;
  generatedBy: string;

  // Canonical DOL context (drives everything)
  dolContext: EffectiveDolContext;

  // Company branding
  branding: CompanyBranding;

  // Claim snapshot
  claim: ClaimSnapshot;

  // Location
  location: LocationData;

  // Resolved peril
  peril: ResolvedPeril;

  // Claim window anchor
  anchorDate: string;

  // SECTION: Claim Window Conditions (day before / DOL / day after)
  weatherWindow: WeatherDayData[];

  // SECTION: Storm Event Evidence (significant events in evidence window)
  stormEvidence: NormalizedStormEvidence[];
  hasStormEvidence: boolean;
  /** If event anchor differs from DOL, this note explains it */
  eventAnchorNote: string | null;

  // Evidence summary
  evidence: EvidenceSummary;

  // SECTION: Radar imagery (real embedded images)
  radarFrames: NormalizedRadarFrame[];
  hasRadarImagery: boolean;

  // Analysis text
  executiveSummary: string;
  carrierTalkingPoints: string;

  // Data sources
  dataSources: string[];

  // Provider diagnostics (dev/admin only)
  diagnostics: ProviderDiagnostics;

  // ── Backward compat shims ──
  /** @deprecated Use stormEvidence */
  events: NormalizedStormEvidence[];
}

export interface ProviderDiagnostics {
  providersRequested: string[];
  providersSucceeded: string[];
  providersFailed: string[];
  providerTimestamps: Record<string, string>;
  selectedDol: string;
  eventAnchor: string;
  radarFrameCount: number;
  eventSource: "provider" | "ai" | "mixed" | "none";
}

// ─────────────────────────────────────────────────────────────────────────────
// Peril Resolution
// ─────────────────────────────────────────────────────────────────────────────

export function resolvePrimaryPeril(
  claimPeril: string | null | undefined,
  stormEvidence: NormalizedStormEvidence[],
  weatherData: WeatherDayData[]
): ResolvedPeril {
  // Priority 1: Explicit claim peril if set and valid
  if (
    claimPeril &&
    !["unknown", "unspecified", "other", "multiple", ""].includes(claimPeril.toLowerCase())
  ) {
    return {
      type: capitalizeFirst(claimPeril),
      confidence: "high",
      displayText: capitalizeFirst(claimPeril),
      evidenceSummary: "Based on claim designation",
    };
  }

  // Priority 2: Infer from strongest storm evidence
  const hailEvents = stormEvidence.filter(
    (e) =>
      e.type?.toLowerCase().includes("hail") ||
      e.description?.toLowerCase().includes("hail") ||
      e.hailSize
  );
  const windEvents = stormEvidence.filter(
    (e) =>
      e.type?.toLowerCase().includes("wind") ||
      e.description?.toLowerCase().includes("wind") ||
      (e.windSpeed && parseFloat(e.windSpeed) > 40)
  );

  if (hailEvents.length > 0 && windEvents.length > 0) {
    const maxHailScore = Math.max(...hailEvents.map((e) => e.score));
    const maxWindScore = Math.max(...windEvents.map((e) => e.score));
    if (maxHailScore >= maxWindScore) {
      const maxHail = hailEvents.find((e) => e.hailSize);
      return {
        type: "Hail",
        confidence: "high",
        displayText: "Hail",
        evidenceSummary: maxHail?.hailSize
          ? `Hail up to ${maxHail.hailSize} detected`
          : `${hailEvents.length} hail event(s) detected`,
      };
    } else {
      const maxWind = windEvents.reduce((max, e) => {
        const speed = e.windSpeed ? parseFloat(e.windSpeed) : 0;
        return speed > max ? speed : max;
      }, 0);
      return {
        type: "Wind",
        confidence: "high",
        displayText: "Wind",
        evidenceSummary:
          maxWind > 0 ? `Wind gusts up to ${maxWind} mph` : "High wind events detected",
      };
    }
  }

  if (hailEvents.length > 0) {
    const maxHail = hailEvents.find((e) => e.hailSize);
    return {
      type: "Hail",
      confidence: "high",
      displayText: "Hail",
      evidenceSummary: maxHail?.hailSize
        ? `Hail up to ${maxHail.hailSize} detected`
        : `${hailEvents.length} hail event(s) detected`,
    };
  }

  if (windEvents.length > 0) {
    const maxWind = windEvents.reduce((max, e) => {
      const speed = e.windSpeed ? parseFloat(e.windSpeed) : 0;
      return speed > max ? speed : max;
    }, 0);
    return {
      type: "Wind",
      confidence: "high",
      displayText: "Wind",
      evidenceSummary:
        maxWind > 0 ? `Wind gusts up to ${maxWind} mph` : "High wind events detected",
    };
  }

  // Priority 3: Infer from weather data
  const maxGust = Math.max(...weatherData.map((w) => w.windGust || 0));
  const maxPrecip = Math.max(...weatherData.map((w) => w.precip || 0));

  if (maxGust > 50) {
    return {
      type: "Wind",
      confidence: "medium",
      displayText: "Likely Wind",
      evidenceSummary: `Wind gusts up to ${maxGust.toFixed(0)} mph observed`,
    };
  }

  if (maxPrecip > 0.5) {
    return {
      type: "Rain/Storm",
      confidence: "medium",
      displayText: "Rain/Storm",
      evidenceSummary: `${maxPrecip.toFixed(2)}" precipitation recorded`,
    };
  }

  // Priority 4: No significant evidence
  if (stormEvidence.length === 0 && weatherData.length === 0) {
    return {
      type: "Unknown",
      confidence: "unknown",
      displayText: "Peril Under Review",
      evidenceSummary: "Insufficient weather data available",
    };
  }

  return {
    type: "Unknown",
    confidence: "low",
    displayText: "No Significant Storm Peril Identified",
    evidenceSummary: "No severe weather events detected in reporting window",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Radar Frame Selection
// ─────────────────────────────────────────────────────────────────────────────

export function selectRadarFramesForDolOrEvent(
  frames: Array<{ url: string; timestamp: string; stationId?: string; label: string }>,
  dolContext: EffectiveDolContext,
  maxFrames: number = 3
): NormalizedRadarFrame[] {
  if (!frames || frames.length === 0) return [];

  const anchorDateStr = dolContext.eventAnchorDate;
  const anchor = new Date(anchorDateStr + "T12:00:00Z");

  const scored = frames.map((frame) => {
    const frameTime = new Date(frame.timestamp);
    const hoursDiff = Math.abs(frameTime.getTime() - anchor.getTime()) / (1000 * 60 * 60);

    let score = Math.max(0, 100 - hoursDiff * 2);
    let frameType: "before" | "peak" | "after" | "other" = "other";

    const anchorStart = new Date(anchor);
    anchorStart.setUTCHours(0, 0, 0, 0);
    const anchorEnd = new Date(anchor);
    anchorEnd.setUTCHours(23, 59, 59, 999);

    if (frameTime < anchorStart) {
      frameType = "before";
    } else if (frameTime > anchorEnd) {
      frameType = "after";
    } else {
      frameType = "peak";
      score += 50;
    }

    return {
      url: frame.url,
      timestamp: frame.timestamp,
      stationId: frame.stationId || "Unknown",
      label: frame.label,
      frameType,
      score,
      imageLoaded: false as boolean,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const result: NormalizedRadarFrame[] = [];
  const types: Array<"before" | "peak" | "after"> = ["before", "peak", "after"];

  for (const type of types) {
    const frame = scored.find((f) => f.frameType === type && !result.some((r) => r.url === f.url));
    if (frame && result.length < maxFrames) {
      result.push({
        url: frame.url,
        timestamp: frame.timestamp,
        stationId: frame.stationId,
        label: frame.label,
        frameType: frame.frameType,
        imageLoaded: false,
      });
    }
  }

  for (const frame of scored) {
    if (result.length >= maxFrames) break;
    if (!result.some((r) => r.url === frame.url)) {
      result.push({
        url: frame.url,
        timestamp: frame.timestamp,
        stationId: frame.stationId,
        label: frame.label,
        frameType: frame.frameType,
        imageLoaded: false,
      });
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Radar Image Fetcher (real images for PDF embedding)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchRadarImages(
  frames: NormalizedRadarFrame[]
): Promise<NormalizedRadarFrame[]> {
  if (frames.length === 0) return [];

  const results = await Promise.allSettled(
    frames.map(async (frame) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(frame.url, {
          headers: { "User-Agent": "SkaiScraper/1.0 (support@skaiscrape.com)" },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          logger.warn("[RADAR_IMG] Failed to fetch", { url: frame.url, status: response.status });
          return { ...frame, imageLoaded: false };
        }

        const contentType = response.headers.get("content-type") || "image/png";

        // Only accept image content types
        if (!contentType.startsWith("image/")) {
          logger.warn("[RADAR_IMG] Non-image content type", { url: frame.url, contentType });
          return { ...frame, imageLoaded: false };
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        // Reject tiny images (likely error pages)
        if (buffer.length < 500) {
          logger.warn("[RADAR_IMG] Image too small, likely error", {
            url: frame.url,
            size: buffer.length,
          });
          return { ...frame, imageLoaded: false };
        }

        const base64 = buffer.toString("base64");
        return { ...frame, base64Data: `data:${contentType};base64,${base64}`, imageLoaded: true };
      } catch (err) {
        logger.warn("[RADAR_IMG] Fetch error", { url: frame.url, error: String(err) });
        return { ...frame, imageLoaded: false };
      }
    })
  );

  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { ...frames[i], imageLoaded: false }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Evidence Summary Builder
// ─────────────────────────────────────────────────────────────────────────────

export function buildEvidenceSummary(
  stormEvidence: NormalizedStormEvidence[],
  weatherData: WeatherDayData[],
  radarFrameCount: number
): EvidenceSummary {
  const hasHail = stormEvidence.some(
    (e) =>
      e.type?.toLowerCase().includes("hail") ||
      e.description?.toLowerCase().includes("hail") ||
      e.hailSize
  );

  const hasWind = stormEvidence.some(
    (e) =>
      e.type?.toLowerCase().includes("wind") ||
      e.windSpeed ||
      weatherData.some((w) => (w.windGust || 0) > 40)
  );

  const hasRain = weatherData.some((w) => (w.precip || 0) > 0.1);

  const maxWindGust = Math.max(...weatherData.map((w) => w.windGust || 0), 0);
  const maxPrecip = Math.max(...weatherData.map((w) => w.precip || 0), 0);
  const hailSizeMax =
    stormEvidence
      .filter((e) => e.hailSize)
      .map((e) => e.hailSize!)
      .sort()
      .pop() || undefined;

  let stormConfidence: "high" | "medium" | "low" | "none" = "none";
  if (hasHail || maxWindGust > 60) {
    stormConfidence = "high";
  } else if (hasWind || maxWindGust > 40 || maxPrecip > 0.5) {
    stormConfidence = "medium";
  } else if (maxPrecip > 0.1 || stormEvidence.length > 0) {
    stormConfidence = "low";
  }

  return {
    hasHail,
    hasWind,
    hasRain,
    hasRadar: radarFrameCount > 0,
    maxWindGust: maxWindGust > 0 ? maxWindGust : undefined,
    maxPrecip: maxPrecip > 0 ? maxPrecip : undefined,
    hailSizeMax,
    stormConfidence,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Weather Window Builder
// ─────────────────────────────────────────────────────────────────────────────

export function filterWeatherToClaimWindow(
  conditions: NormalizedWeatherObservation[],
  dolContext: EffectiveDolContext
): WeatherDayData[] {
  const [dayBefore, dolDay, dayAfter] = dolContext.claimWindowDays;
  const result: WeatherDayData[] = [];

  const buildDay = (
    date: string,
    label: WeatherDayData["label"],
    isAnchor: boolean
  ): WeatherDayData => {
    const data = conditions.find((c) => c.date === date);
    if (data) {
      return {
        date,
        label,
        tempHigh: data.tempHigh,
        tempLow: data.tempLow,
        precip: data.precip,
        precipProb: data.precipProb,
        windSpeed: data.windSpeed,
        windGust: data.windGust,
        conditions: data.conditions,
        description: data.description,
        isAnchorDay: isAnchor,
      };
    }
    return { date, label, conditions: "No data available", isAnchorDay: isAnchor };
  };

  result.push(buildDay(dayBefore, "Day Before", false));
  result.push(buildDay(dolDay, "Date of Loss", true));
  result.push(buildDay(dayAfter, "Day After", false));

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storm Evidence Normalizer
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeStormEvidence(
  aiEvents: Array<{
    type: string;
    date: string;
    time?: string;
    intensity?: string;
    notes?: string;
    severity?: string;
    hailSize?: string;
    windSpeed?: string;
  }>,
  dolContext: EffectiveDolContext,
  maxEvents: number = 6
): NormalizedStormEvidence[] {
  const [dayBefore, dolDay, dayAfter] = dolContext.claimWindowDays;
  const claimDays = new Set([dayBefore, dolDay, dayAfter]);

  const normalized: NormalizedStormEvidence[] = aiEvents.map((e) => {
    const eventDate = e.date;
    const isInClaimWindow = claimDays.has(eventDate);

    let score = 50;
    if (eventDate === dolDay) score += 40;
    else if (isInClaimWindow) score += 20;
    else score += 5;

    if (e.hailSize) {
      const size = parseFloat(e.hailSize);
      if (!isNaN(size)) score += size * 15;
    }
    if (e.windSpeed) {
      const speed = parseFloat(e.windSpeed);
      if (!isNaN(speed) && speed > 40) score += (speed - 40) * 0.5;
    }
    if (e.intensity?.toLowerCase().includes("severe")) score += 10;

    return {
      date: eventDate,
      time: e.time,
      type: e.type,
      description: e.notes,
      severity: e.severity || e.intensity,
      intensity: e.intensity,
      hailSize: e.hailSize,
      windSpeed: e.windSpeed,
      source: "ai_analysis" as const,
      score: Math.min(100, score),
      notes: e.notes,
      isInClaimWindow,
      isNearbyEvent: !isInClaimWindow,
    };
  });

  // Add nearby event candidates from DOL context
  for (const candidate of dolContext.nearbyEventCandidates) {
    const alreadyExists = normalized.some(
      (e) => e.date === candidate.date && e.type === candidate.type
    );
    if (!alreadyExists) {
      const isInClaimWindow = claimDays.has(candidate.date);
      normalized.push({
        date: candidate.date,
        type: candidate.type,
        distanceMiles: candidate.distanceMiles,
        source: candidate.source,
        score: candidate.score,
        isInClaimWindow,
        isNearbyEvent: !isInClaimWindow,
      });
    }
  }

  return normalized.sort((a, b) => b.score - a.score).slice(0, maxEvents);
}

// ─────────────────────────────────────────────────────────────────────────────
// Executive Summary Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildCanonicalSummary(
  peril: ResolvedPeril,
  evidence: EvidenceSummary,
  dolContext: EffectiveDolContext,
  stormEvidence: NormalizedStormEvidence[],
  weatherWindow: WeatherDayData[]
): string {
  const dolDisplay = formatDateDisplay(dolContext.selectedDol);
  const dolDay = weatherWindow.find((d) => d.isAnchorDay);

  if (evidence.stormConfidence === "none") {
    const baseMsg = `Weather analysis for the reporting period around ${dolDisplay} did not identify significant storm activity in the claim window.`;
    if (dolDay && dolDay.conditions && dolDay.conditions !== "No data available") {
      return `${baseMsg} Conditions on the date of loss were reported as ${dolDay.conditions.toLowerCase()} with ${(dolDay.precip || 0).toFixed(2)} inches of precipitation.`;
    }
    return `${baseMsg} No severe weather events such as hail, damaging wind, or heavy precipitation were detected in the available data sources.`;
  }

  const parts: string[] = [];
  parts.push(
    `Weather analysis for the ${dolDisplay} date of loss indicates ${peril.displayText.toLowerCase()} activity in the area.`
  );

  if (dolDay && dolDay.conditions !== "No data available") {
    const dolConditions: string[] = [];
    if (dolDay.precip && dolDay.precip > 0)
      dolConditions.push(`${dolDay.precip.toFixed(2)}" precipitation`);
    if (dolDay.windGust && dolDay.windGust > 30)
      dolConditions.push(`wind gusts to ${dolDay.windGust.toFixed(0)} mph`);
    if (dolConditions.length > 0) {
      parts.push(`On the date of loss, conditions included ${dolConditions.join(" and ")}.`);
    } else if (dolDay.conditions?.toLowerCase().includes("clear")) {
      parts.push(
        `Daily conditions on the date of loss were reported as ${dolDay.conditions.toLowerCase()}.`
      );
    }
  }

  const claimWindowEvents = stormEvidence.filter((e) => e.isInClaimWindow);
  const nearbyEvents = stormEvidence.filter((e) => e.isNearbyEvent);

  if (claimWindowEvents.length > 0) {
    if (evidence.hasHail && evidence.hailSizeMax)
      parts.push(`Hail up to ${evidence.hailSizeMax} was reported within the claim window.`);
    if (evidence.maxWindGust && evidence.maxWindGust > 40)
      parts.push(`Wind gusts reached ${evidence.maxWindGust.toFixed(0)} mph.`);
  }

  if (nearbyEvents.length > 0 && claimWindowEvents.length === 0) {
    const bestNearby = nearbyEvents[0];
    parts.push(
      `Relevant storm activity was identified on ${bestNearby.date} within the broader search window, though the 3-day claim window showed milder conditions.`
    );
  } else if (nearbyEvents.length > 0 && claimWindowEvents.length > 0) {
    parts.push(
      `Additional supporting storm evidence was identified within the broader search window.`
    );
  }

  return parts.join(" ");
}

function buildCanonicalTalkingPoints(
  peril: ResolvedPeril,
  evidence: EvidenceSummary,
  dolContext: EffectiveDolContext,
  stormEvidence: NormalizedStormEvidence[]
): string {
  if (evidence.stormConfidence === "none") {
    return "Weather data for the claimed date of loss does not show significant storm activity in the immediate area. Consider requesting additional documentation or adjusting the date of loss if the insured has evidence of storm damage.";
  }

  const points: string[] = [];
  if (evidence.hasHail)
    points.push(
      `Hail activity was confirmed in the area${evidence.hailSizeMax ? ` with sizes up to ${evidence.hailSizeMax}` : ""}.`
    );
  if (evidence.maxWindGust && evidence.maxWindGust > 40)
    points.push(`Damaging wind gusts of ${evidence.maxWindGust.toFixed(0)} mph were recorded.`);
  if (evidence.hasRadar)
    points.push(`NEXRAD radar imagery confirms storm cell activity over the property location.`);

  if (dolContext.eventAnchorDiffersFromDol) {
    points.push(
      `Note: The strongest storm evidence was identified on ${dolContext.eventAnchorDate}, which differs from the claimed date of loss (${dolContext.selectedDol}). This may warrant a date of loss review.`
    );
  }

  if (points.length === 0)
    points.push(
      "Weather conditions during the reporting period support the possibility of storm-related damage."
    );

  return points.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateBeforeGeneration(input: BuildViewModelInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.propertyAddress || input.propertyAddress === "Not Provided") {
    errors.push("Claim has no property address.");
  }
  if (!input.dateOfLoss) {
    errors.push("Date of Loss is required.");
  }
  if (!input.locationResolved || (input.lat === 0 && input.lng === 0)) {
    warnings.push(
      "Property location could not be geocoded. Radar and location-specific data may be unavailable."
    );
  }
  if (input.weatherConditions.length === 0) {
    warnings.push("No weather condition data available from providers.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// View Model Builder
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildViewModelInput {
  reportId: string;
  generatedBy?: string;

  claimNumber?: string;
  insuredName?: string;
  carrier?: string;
  policyNumber?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;
  propertyAddress?: string;
  dateOfLoss: string;
  claimPeril?: string | null;

  lat: number;
  lng: number;
  locationResolved: boolean;
  radarStationId?: string;

  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyLicense?: string;
  companyLogoUrl?: string;
  companyAddress?: string;
  primaryColor?: string;

  weatherConditions: Array<{
    datetime: string;
    tempmax?: number;
    tempmin?: number;
    precip?: number;
    precipprob?: number;
    windspeed?: number;
    windgust?: number;
    conditions?: string;
    description?: string;
  }>;

  events: Array<{
    date: string;
    time?: string;
    type: string;
    severity?: string;
    intensity?: string;
    hailSize?: string;
    windSpeed?: string;
    notes?: string;
  }>;

  radarFrames: Array<{ url: string; timestamp: string; stationId?: string; label: string }>;

  summary?: string;
  carrierTalkingPoints?: string;

  dolSource?: "claim" | "quick_dol" | "manual_override" | "user_input";
  quickDolResult?: {
    confidence?: number;
    candidates?: Array<{
      date: string;
      type?: string;
      magnitude?: number;
      distanceMiles?: number;
      score: number;
      source?: string;
    }>;
    fromDate?: string;
    toDate?: string;
  } | null;

  providersUsed?: string[];
  providersFailed?: string[];
}

export async function buildWeatherPdfViewModel(
  input: BuildViewModelInput
): Promise<WeatherPdfViewModel> {
  const startTime = Date.now();

  // 1. Build canonical DOL context — THE SINGLE SOURCE OF TRUTH
  const dolContext = buildEffectiveDolContext({
    dol: input.dateOfLoss,
    dolSource: input.dolSource || "user_input",
    quickDolResult: input.quickDolResult,
    providersUsed: input.providersUsed,
    radarStationId: input.radarStationId,
  });

  // 2. Normalize weather conditions
  const normalizedConditions: NormalizedWeatherObservation[] = input.weatherConditions.map((c) => ({
    date: c.datetime,
    source: "visual_crossing",
    tempHigh: c.tempmax,
    tempLow: c.tempmin,
    precip: c.precip,
    precipProb: c.precipprob,
    windSpeed: c.windspeed,
    windGust: c.windgust,
    conditions: c.conditions,
    description: c.description,
    confidence: 0.9,
  }));

  // 3. Filter to claim window using DOL context
  const weatherWindow = filterWeatherToClaimWindow(normalizedConditions, dolContext);

  // 4. Normalize storm evidence using DOL context
  const stormEvidence = normalizeStormEvidence(input.events, dolContext);

  // 5. Resolve peril from evidence
  const peril = resolvePrimaryPeril(input.claimPeril, stormEvidence, weatherWindow);

  // 6. Select radar frames centered on event anchor
  let radarFrames = selectRadarFramesForDolOrEvent(input.radarFrames, dolContext);

  // 7. Fetch actual radar images
  radarFrames = await fetchRadarImages(radarFrames);
  const loadedFrames = radarFrames.filter((f) => f.imageLoaded);
  const hasRadarImagery = loadedFrames.length > 0;

  // 8. Build evidence summary
  const evidence = buildEvidenceSummary(stormEvidence, weatherWindow, loadedFrames.length);

  // 9. Build event anchor note
  let eventAnchorNote: string | null = null;
  if (dolContext.eventAnchorDiffersFromDol) {
    eventAnchorNote = `Strongest storm evidence was identified on ${formatDateDisplay(dolContext.eventAnchorDate)}, which differs from the claimed Date of Loss (${formatDateDisplay(dolContext.selectedDol)}). Radar imagery is centered on the event anchor date.`;
  }

  // 10. Build canonical summary (consistent with timeline & evidence)
  const executiveSummary =
    input.summary && evidence.stormConfidence !== "none"
      ? input.summary
      : buildCanonicalSummary(peril, evidence, dolContext, stormEvidence, weatherWindow);

  // 11. Build carrier talking points
  const carrierTalkingPoints =
    input.carrierTalkingPoints && evidence.stormConfidence !== "none"
      ? input.carrierTalkingPoints
      : buildCanonicalTalkingPoints(peril, evidence, dolContext, stormEvidence);

  // 12. Data sources
  const dataSources: string[] = [];
  if (normalizedConditions.length > 0) dataSources.push("Visual Crossing Weather API");
  if (loadedFrames.length > 0)
    dataSources.push(`NEXRAD Radar (${dolContext.radarStationId || "N/A"})`);
  dataSources.push("Iowa Environmental Mesonet", "NWS RIDGE");

  // 13. Diagnostics
  const diagnostics: ProviderDiagnostics = {
    providersRequested: input.providersUsed || ["visual_crossing", "iem_nexrad"],
    providersSucceeded: input.providersUsed || [],
    providersFailed: input.providersFailed || [],
    providerTimestamps: { built: new Date().toISOString() },
    selectedDol: dolContext.selectedDol,
    eventAnchor: dolContext.eventAnchorDate,
    radarFrameCount: loadedFrames.length,
    eventSource:
      stormEvidence.length > 0
        ? stormEvidence.some((e) => e.source !== "ai_analysis")
          ? "mixed"
          : "ai"
        : "none",
  };

  const vm: WeatherPdfViewModel = {
    reportId: input.reportId,
    generatedAt: new Date().toISOString(),
    generatedBy: input.generatedBy || "SkaiScraper",
    dolContext,
    branding: {
      companyName: input.companyName || "SkaiScraper",
      phone: input.companyPhone || "",
      email: input.companyEmail || "",
      website: input.companyWebsite || "",
      license: input.companyLicense || "",
      logoUrl: input.companyLogoUrl || "",
      primaryColor: input.primaryColor || "#1e40af",
      address: input.companyAddress || "",
    },
    claim: {
      claimNumber: input.claimNumber || "Not Provided",
      insuredName: input.insuredName || "Not Provided",
      carrier: input.carrier || "Not Provided",
      policyNumber: input.policyNumber || "Not Provided",
      adjusterName: input.adjusterName || "Not Provided",
      adjusterPhone: input.adjusterPhone || "",
      adjusterEmail: input.adjusterEmail || "",
      dateOfLoss: formatDateDisplay(dolContext.selectedDol),
      propertyAddress: input.propertyAddress || "Not Provided",
    },
    location: {
      lat: input.lat,
      lng: input.lng,
      resolved: input.locationResolved,
      radarStationId: dolContext.radarStationId || "N/A",
    },
    peril,
    anchorDate: dolContext.selectedDol,
    weatherWindow,
    stormEvidence,
    hasStormEvidence: evidence.stormConfidence !== "none",
    eventAnchorNote,
    evidence,
    radarFrames: loadedFrames,
    hasRadarImagery,
    executiveSummary,
    carrierTalkingPoints,
    dataSources,
    diagnostics,
    // Backward compat
    events: stormEvidence,
  };

  logger.info("[WeatherPdfViewModel] Built v2 view model", {
    anchorDate: vm.anchorDate,
    eventAnchor: dolContext.eventAnchorDate,
    anchorDiffers: dolContext.eventAnchorDiffersFromDol,
    weatherDays: vm.weatherWindow.length,
    stormEvents: vm.stormEvidence.length,
    radarFrames: vm.radarFrames.length,
    hasRadarImages: vm.hasRadarImagery,
    perilType: vm.peril.type,
    stormConfidence: vm.evidence.stormConfidence,
    buildTimeMs: Date.now() - startTime,
  });

  return vm;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function formatDateDisplay(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T12:00:00Z");
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

function capitalizeFirst(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Backward compat re-exports
export { getClaimWindowDays } from "./effectiveDolContext";
export type { EffectiveDolContext } from "./effectiveDolContext";
/** @deprecated Use NormalizedRadarFrame */
export type RadarFrame = NormalizedRadarFrame;
/** @deprecated Use the new WeatherEvent from old module — storm evidence replaces it */
export type WeatherEvent = {
  date: string;
  time?: string;
  type: string;
  description?: string;
  severity?: string;
  intensity?: string;
  hailSize?: string;
  windSpeed?: string;
  notes?: string;
  confidence?: number;
};
