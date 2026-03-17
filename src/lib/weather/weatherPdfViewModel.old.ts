/**
 * Weather PDF View Model
 *
 * Centralized data structure and helpers for weather report PDF generation.
 * Separates business logic from rendering logic.
 *
 * @module lib/weather/weatherPdfViewModel
 */

import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WeatherEvent {
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
}

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

export interface RadarFrame {
  url: string;
  timestamp: string;
  stationId: string;
  label: string;
  frameType: "before" | "peak" | "after" | "other";
  base64Data?: string; // For embedding
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
  logoBase64?: string; // For embedding
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
  type: string; // "Hail", "Wind", "Rain", etc.
  confidence: "high" | "medium" | "low" | "unknown";
  displayText: string; // User-facing text
  evidenceSummary: string; // Brief evidence note
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

  // Company branding
  branding: CompanyBranding;

  // Claim snapshot
  claim: ClaimSnapshot;

  // Location
  location: LocationData;

  // Resolved peril
  peril: ResolvedPeril;

  // Anchor date window (day before / DOL / day after)
  anchorDate: string;
  weatherWindow: WeatherDayData[];

  // Storm events
  events: WeatherEvent[];
  hasStormEvidence: boolean;

  // Evidence summary
  evidence: EvidenceSummary;

  // Radar imagery
  radarFrames: RadarFrame[];
  hasRadarImagery: boolean;

  // Analysis text
  executiveSummary: string;
  carrierTalkingPoints: string;

  // Data sources
  dataSources: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Anchor Date Window Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the canonical 3-day window: day before, DOL, day after
 */
export function getWeatherDisplayWindow(anchorDate: string): {
  dayBefore: string;
  anchor: string;
  dayAfter: string;
} {
  const anchor = new Date(anchorDate);

  const dayBefore = new Date(anchor);
  dayBefore.setDate(dayBefore.getDate() - 1);

  const dayAfter = new Date(anchor);
  dayAfter.setDate(dayAfter.getDate() + 1);

  return {
    dayBefore: formatDateISO(dayBefore),
    anchor: formatDateISO(anchor),
    dayAfter: formatDateISO(dayAfter),
  };
}

/**
 * Filter weather conditions to exactly the 3-day window
 */
export function filterWeatherToWindow(
  conditions: Array<{
    datetime: string;
    tempmax?: number;
    tempmin?: number;
    precip?: number;
    precipprob?: number;
    windspeed?: number;
    windgust?: number;
    conditions?: string;
    description?: string;
  }>,
  anchorDate: string
): WeatherDayData[] {
  const window = getWeatherDisplayWindow(anchorDate);
  const result: WeatherDayData[] = [];

  // Find day before
  const dayBeforeData = conditions.find((c) => c.datetime === window.dayBefore);
  if (dayBeforeData) {
    result.push({
      date: window.dayBefore,
      label: "Day Before",
      tempHigh: dayBeforeData.tempmax,
      tempLow: dayBeforeData.tempmin,
      precip: dayBeforeData.precip,
      precipProb: dayBeforeData.precipprob,
      windSpeed: dayBeforeData.windspeed,
      windGust: dayBeforeData.windgust,
      conditions: dayBeforeData.conditions,
      description: dayBeforeData.description,
      isAnchorDay: false,
    });
  }

  // Find anchor day (DOL)
  const anchorData = conditions.find((c) => c.datetime === window.anchor);
  if (anchorData) {
    result.push({
      date: window.anchor,
      label: "Date of Loss",
      tempHigh: anchorData.tempmax,
      tempLow: anchorData.tempmin,
      precip: anchorData.precip,
      precipProb: anchorData.precipprob,
      windSpeed: anchorData.windspeed,
      windGust: anchorData.windgust,
      conditions: anchorData.conditions,
      description: anchorData.description,
      isAnchorDay: true,
    });
  }

  // Find day after
  const dayAfterData = conditions.find((c) => c.datetime === window.dayAfter);
  if (dayAfterData) {
    result.push({
      date: window.dayAfter,
      label: "Day After",
      tempHigh: dayAfterData.tempmax,
      tempLow: dayAfterData.tempmin,
      precip: dayAfterData.precip,
      precipProb: dayAfterData.precipprob,
      windSpeed: dayAfterData.windspeed,
      windGust: dayAfterData.windgust,
      conditions: dayAfterData.conditions,
      description: dayAfterData.description,
      isAnchorDay: false,
    });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Peril Resolution Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the primary peril with clean display text
 */
export function resolvePrimaryPeril(
  claimPeril: string | null | undefined,
  events: WeatherEvent[],
  weatherData: WeatherDayData[]
): ResolvedPeril {
  // Priority 1: Explicit claim peril if set and valid
  if (claimPeril && !["unknown", "unspecified", "other", ""].includes(claimPeril.toLowerCase())) {
    return {
      type: capitalizeFirst(claimPeril),
      confidence: "high",
      displayText: capitalizeFirst(claimPeril),
      evidenceSummary: "Based on claim designation",
    };
  }

  // Priority 2: Infer from strongest detected event
  const hailEvents = events.filter(
    (e) =>
      e.type?.toLowerCase().includes("hail") ||
      e.description?.toLowerCase().includes("hail") ||
      e.hailSize
  );
  const windEvents = events.filter(
    (e) =>
      e.type?.toLowerCase().includes("wind") ||
      e.description?.toLowerCase().includes("wind") ||
      (e.windSpeed && parseFloat(e.windSpeed) > 40)
  );

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
  if (events.length === 0 && weatherData.length === 0) {
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
// Radar Frame Selection Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Select the best radar frames for the PDF (before / peak / after)
 */
export function selectBestRadarFrames(
  frames: Array<{ url: string; timestamp: string; stationId?: string; label: string }>,
  anchorDate: string,
  maxFrames: number = 3
): RadarFrame[] {
  if (!frames || frames.length === 0) {
    return [];
  }

  const anchor = new Date(anchorDate);
  const anchorStart = new Date(anchor);
  anchorStart.setHours(0, 0, 0, 0);
  const anchorEnd = new Date(anchor);
  anchorEnd.setHours(23, 59, 59, 999);

  // Score frames by relevance to anchor date
  const scoredFrames = frames.map((frame) => {
    const frameTime = new Date(frame.timestamp);
    const hoursDiff = Math.abs(frameTime.getTime() - anchor.getTime()) / (1000 * 60 * 60);

    let score = 100 - hoursDiff * 2; // Closer to anchor = higher score
    let frameType: "before" | "peak" | "after" | "other" = "other";

    if (frameTime < anchorStart) {
      frameType = "before";
    } else if (frameTime > anchorEnd) {
      frameType = "after";
    } else {
      frameType = "peak";
      score += 50; // Bonus for being on the anchor day
    }

    return {
      ...frame,
      stationId: frame.stationId || "Unknown",
      frameType,
      score,
    };
  });

  // Sort by score and take the best
  scoredFrames.sort((a, b) => b.score - a.score);

  // Try to get one of each type if possible
  const result: RadarFrame[] = [];
  const types: Array<"before" | "peak" | "after"> = ["before", "peak", "after"];

  for (const type of types) {
    const frame = scoredFrames.find((f) => f.frameType === type && !result.includes(f));
    if (frame && result.length < maxFrames) {
      result.push({
        url: frame.url,
        timestamp: frame.timestamp,
        stationId: frame.stationId,
        label: frame.label,
        frameType: frame.frameType,
      });
    }
  }

  // Fill remaining slots with highest scored frames
  for (const frame of scoredFrames) {
    if (result.length >= maxFrames) break;
    if (!result.find((r) => r.url === frame.url)) {
      result.push({
        url: frame.url,
        timestamp: frame.timestamp,
        stationId: frame.stationId,
        label: frame.label,
        frameType: frame.frameType,
      });
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Evidence Summary Builder
// ─────────────────────────────────────────────────────────────────────────────

export function buildEvidenceSummary(
  events: WeatherEvent[],
  weatherData: WeatherDayData[],
  radarFrameCount: number
): EvidenceSummary {
  const hasHail = events.some(
    (e) =>
      e.type?.toLowerCase().includes("hail") ||
      e.description?.toLowerCase().includes("hail") ||
      e.hailSize
  );

  const hasWind = events.some(
    (e) =>
      e.type?.toLowerCase().includes("wind") ||
      e.windSpeed ||
      weatherData.some((w) => (w.windGust || 0) > 40)
  );

  const hasRain = weatherData.some((w) => (w.precip || 0) > 0.1);

  const maxWindGust = Math.max(...weatherData.map((w) => w.windGust || 0), 0);
  const maxPrecip = Math.max(...weatherData.map((w) => w.precip || 0), 0);
  const hailSizeMax =
    events
      .filter((e) => e.hailSize)
      .map((e) => e.hailSize)
      .sort()
      .pop() || undefined;

  let stormConfidence: "high" | "medium" | "low" | "none" = "none";
  if (hasHail || maxWindGust > 60) {
    stormConfidence = "high";
  } else if (hasWind || maxWindGust > 40 || maxPrecip > 0.5) {
    stormConfidence = "medium";
  } else if (maxPrecip > 0.1 || events.length > 0) {
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
// View Model Builder
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildViewModelInput {
  // Report metadata
  reportId: string;
  generatedBy?: string;

  // Claim data
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

  // Location
  lat: number;
  lng: number;
  locationResolved: boolean;
  radarStationId?: string;

  // Branding
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyLicense?: string;
  companyLogoUrl?: string;
  companyAddress?: string;
  primaryColor?: string;

  // Weather data
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

  // Events from AI
  events: WeatherEvent[];

  // Radar
  radarFrames: Array<{ url: string; timestamp: string; stationId?: string; label: string }>;

  // Analysis
  summary?: string;
  carrierTalkingPoints?: string;
}

export function buildWeatherPdfViewModel(input: BuildViewModelInput): WeatherPdfViewModel {
  const anchorDate = input.dateOfLoss;

  // Build weather window (day before / DOL / day after)
  const weatherWindow = filterWeatherToWindow(input.weatherConditions, anchorDate);

  // Resolve peril
  const peril = resolvePrimaryPeril(input.claimPeril, input.events, weatherWindow);

  // Select best radar frames
  const radarFrames = selectBestRadarFrames(input.radarFrames, anchorDate, 3);

  // Build evidence summary
  const evidence = buildEvidenceSummary(input.events, weatherWindow, radarFrames.length);

  // Build data sources list
  const dataSources: string[] = [];
  if (weatherWindow.length > 0) dataSources.push("Visual Crossing Weather API");
  if (radarFrames.length > 0) dataSources.push(`NEXRAD Radar (${input.radarStationId || "N/A"})`);
  dataSources.push("Iowa Environmental Mesonet", "NWS RIDGE");

  logger.info("[WeatherPdfViewModel] Built view model", {
    anchorDate,
    weatherDays: weatherWindow.length,
    events: input.events.length,
    radarFrames: radarFrames.length,
    perilType: peril.type,
    stormConfidence: evidence.stormConfidence,
  });

  return {
    reportId: input.reportId,
    generatedAt: new Date().toISOString(),
    generatedBy: input.generatedBy || "SkaiScraper",

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
      dateOfLoss: formatDateDisplay(anchorDate),
      propertyAddress: input.propertyAddress || "Not Provided",
    },

    location: {
      lat: input.lat,
      lng: input.lng,
      resolved: input.locationResolved,
      radarStationId: input.radarStationId || "N/A",
    },

    peril,
    anchorDate,
    weatherWindow,

    events: input.events,
    hasStormEvidence: evidence.stormConfidence !== "none",

    evidence,

    radarFrames,
    hasRadarImagery: radarFrames.length > 0,

    executiveSummary: input.summary || buildDefaultSummary(peril, evidence, anchorDate),
    carrierTalkingPoints: input.carrierTalkingPoints || buildDefaultTalkingPoints(peril, evidence),

    dataSources,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Text Builders
// ─────────────────────────────────────────────────────────────────────────────

function buildDefaultSummary(
  peril: ResolvedPeril,
  evidence: EvidenceSummary,
  anchorDate: string
): string {
  if (evidence.stormConfidence === "none") {
    return `Weather analysis for the reporting period around ${formatDateDisplay(anchorDate)} did not identify significant storm activity. No severe weather events such as hail, damaging wind, or heavy precipitation were detected in the available data sources.`;
  }

  const parts: string[] = [];
  parts.push(
    `Weather analysis for the ${formatDateDisplay(anchorDate)} date of loss indicates ${peril.displayText.toLowerCase()} activity in the area.`
  );

  if (evidence.hasHail && evidence.hailSizeMax) {
    parts.push(`Hail up to ${evidence.hailSizeMax} was reported.`);
  }
  if (evidence.maxWindGust && evidence.maxWindGust > 40) {
    parts.push(`Wind gusts reached ${evidence.maxWindGust.toFixed(0)} mph.`);
  }
  if (evidence.maxPrecip && evidence.maxPrecip > 0.1) {
    parts.push(`Total precipitation of ${evidence.maxPrecip.toFixed(2)} inches was recorded.`);
  }

  return parts.join(" ");
}

function buildDefaultTalkingPoints(peril: ResolvedPeril, evidence: EvidenceSummary): string {
  if (evidence.stormConfidence === "none") {
    return "Weather data for the claimed date of loss does not show significant storm activity in the immediate area. Consider requesting additional documentation or adjusting the date of loss if the insured has evidence of storm damage.";
  }

  const points: string[] = [];

  if (evidence.hasHail) {
    points.push(
      `Hail activity was confirmed in the area${evidence.hailSizeMax ? ` with sizes up to ${evidence.hailSizeMax}` : ""}.`
    );
  }
  if (evidence.maxWindGust && evidence.maxWindGust > 40) {
    points.push(`Damaging wind gusts of ${evidence.maxWindGust.toFixed(0)} mph were recorded.`);
  }
  if (evidence.hasRadar) {
    points.push("NEXRAD radar imagery confirms storm cell activity over the property location.");
  }

  if (points.length === 0) {
    points.push(
      "Weather conditions during the reporting period support the possibility of storm-related damage."
    );
  }

  return points.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateDisplay(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function capitalizeFirst(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
