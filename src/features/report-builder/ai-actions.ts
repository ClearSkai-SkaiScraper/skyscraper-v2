// ============================================================================
// AI ACTION STUBS — To be implemented in Phase 2.1
// ============================================================================

import type { Photo, Report } from "./types";

/**
 * AUTO-CAPTION PHOTOS
 * Uses OpenAI Vision API to generate captions for uploaded photos
 */
export async function autoCaptionPhotos(projectId: string): Promise<Photo[]> {
  // eslint-disable-next-line no-console
  console.log(`[AI] Auto-captioning photos for project ${projectId}...`);

  // TODO: Implement
  // 1. Fetch all photos for project
  // 2. For each photo, call OpenAI Vision API
  // 3. Update photo.aiCaption and photo.aiLabels
  // 4. Return updated photos

  throw new Error("autoCaptionPhotos not yet implemented");
}

/**
 * DETECT DAMAGE TYPES
 * Analyzes photos to detect hail, wind, soft metal dents, etc.
 */
export async function detectDamageTypes(projectId: string): Promise<Photo[]> {
  // eslint-disable-next-line no-console
  console.log(`[AI] Detecting damage types for project ${projectId}...`);

  // TODO: Implement
  // 1. Fetch all photos for project
  // 2. Call custom vision model or OpenAI Vision API
  // 3. Update photo.aiDamageType array
  // 4. Return updated photos

  throw new Error("detectDamageTypes not yet implemented");
}

/**
 * GENERATE FULL REPORT
 * Creates a complete report with all sections auto-filled
 */
export async function generateFullReport(
  projectId: string,
  version: "insurance" | "retail"
): Promise<Report> {
  // eslint-disable-next-line no-console
  console.log(`[AI] Generating full ${version} report for project ${projectId}...`);

  // TODO: Implement
  // 1. Fetch project data (property, photos, etc.)
  // 2. Auto-generate sections:
  //    - Cover page (from project data)
  //    - Weather (from NWS API)
  //    - Damage summary (from photo AI labels)
  //    - Photo evidence pages
  //    - Scope (from Xactimate integration)
  //    - Code references (from applicable codes DB)
  // 3. Create Report + ReportSections
  // 4. Return complete report

  throw new Error("generateFullReport not yet implemented");
}

/**
 * BUILD SCOPE FROM PHOTOS
 * Generates Xactimate-compatible scope from photo analysis
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildScopeFromPhotos(projectId: string): Promise<any> {
  // eslint-disable-next-line no-console
  console.log(`[AI] Building scope from photos for project ${projectId}...`);

  // TODO: Implement
  // 1. Analyze photos for roof type, damage areas, square footage
  // 2. Generate line items (tear-off, install, flashing, etc.)
  // 3. Map to Xactimate codes
  // 4. Return estimate object

  throw new Error("buildScopeFromPhotos not yet implemented");
}

/**
 * FETCH WEATHER DATA
 * Pulls NWS bulletins, hail size, wind speed for date of loss
 */
export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  dateOfLoss: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  // eslint-disable-next-line no-console
  console.log(`[AI] Fetching weather data for ${latitude},${longitude} on ${dateOfLoss}...`);

  // TODO: Implement
  // 1. Call NWS API for location + date
  // 2. Parse storm reports (hail size, wind speed)
  // 3. Return structured weather data

  throw new Error("fetchWeatherData not yet implemented");
}

/**
 * EXTRACT CODE REFERENCES
 * Automatically applies relevant IBC/IRC/ARMA/NRCA codes
 */
export async function extractCodeReferences(
  roofType: string,
  damageType: string[]
): Promise<string[]> {
  // eslint-disable-next-line no-console
  console.log(
    `[AI] Extracting code references for ${roofType} with damage: ${damageType.join(", ")}...`
  );

  // TODO: Implement
  // 1. Look up applicable codes from DB based on roof type + damage
  // 2. Return array of code citations

  return [
    "IBC 2021 / IRC 2021",
    "ARMA Installation Guidelines",
    "NRCA Repair Standards",
    "Manufacturer Warranty Requirements",
  ];
}
