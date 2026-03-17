/**
 * Effective DOL Context — Single Source of Truth
 *
 * This module is the canonical anchor for ALL weather report sections.
 * Every section (summary, timeline, storm evidence, radar, carrier talking points)
 * MUST use this same context object. No section picks its own dates independently.
 *
 * @module lib/weather/effectiveDolContext
 */

import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DolSource =
  | "claim" // User-entered DOL from claim record
  | "quick_dol" // AI-recommended via Quick DOL scan
  | "manual_override" // Manually overridden by user
  | "user_input"; // Directly entered in weather form

export type DolConfidence = "high" | "medium" | "low" | "unknown";

export interface NearbyEventCandidate {
  date: string; // YYYY-MM-DD
  type: string; // "hail_report", "wind_report", "svr_warning", etc.
  magnitude?: number; // Hail size in inches, wind in mph
  distanceMiles?: number;
  score: number; // 0-100 composite score
  source: string; // "mesonet", "cap", "visual_crossing"
}

/**
 * The canonical DOL context that drives the ENTIRE weather report.
 * Every section must reference this — no independent date picking.
 */
export interface EffectiveDolContext {
  /** The selected Date of Loss (YYYY-MM-DD) */
  selectedDol: string;

  /** Where this DOL came from */
  dolSource: DolSource;

  /** How confident we are in this DOL */
  confidence: DolConfidence;

  /** The 3-day claim window: [dayBefore, dol, dayAfter] */
  claimWindowDays: [string, string, string];

  /** Broader evidence search window start (YYYY-MM-DD) */
  evidenceFromDate: string;

  /** Broader evidence search window end (YYYY-MM-DD) */
  evidenceToDate: string;

  /** The date around which storm evidence is strongest (may differ from DOL) */
  eventAnchorDate: string;

  /** Whether the event anchor differs from the DOL */
  eventAnchorDiffersFromDol: boolean;

  /** Nearby event candidates found in the evidence window */
  nearbyEventCandidates: NearbyEventCandidate[];

  /** Selected weather data providers */
  providersUsed: string[];

  /** Selected radar station ID */
  radarStationId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Claim Window Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the canonical 3-day claim window: [dayBefore, dolDay, dayAfter]
 * This is the ONLY function that should produce claim window days.
 */
export function getClaimWindowDays(dol: string): [string, string, string] {
  const dolDate = new Date(dol + "T12:00:00Z"); // Noon UTC to avoid timezone shifts

  const dayBefore = new Date(dolDate);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

  const dayAfter = new Date(dolDate);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);

  return [formatISODate(dayBefore), formatISODate(dolDate), formatISODate(dayAfter)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Storm Evidence Window Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the broader storm evidence search window.
 * This window is wider than the claim window — typically DOL ± 7 days —
 * to catch nearby storm events that support or contextualize the claim.
 *
 * If Quick DOL provided from/to dates, use those.
 * Otherwise, default to DOL ± 7 days.
 */
export function getStormEvidenceWindow(
  dol: string,
  quickDolFromDate?: string | null,
  quickDolToDate?: string | null
): { fromDate: string; toDate: string } {
  if (quickDolFromDate && quickDolToDate) {
    return { fromDate: quickDolFromDate, toDate: quickDolToDate };
  }

  const dolDate = new Date(dol + "T12:00:00Z");

  const fromDate = new Date(dolDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - 7);

  const toDate = new Date(dolDate);
  toDate.setUTCDate(toDate.getUTCDate() + 7);

  return {
    fromDate: formatISODate(fromDate),
    toDate: formatISODate(toDate),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Anchor Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the event anchor date — the date with the strongest storm evidence.
 * If significant evidence exists on a date OTHER than the DOL,
 * that date becomes the event anchor (but DOL stays the same for the claim).
 */
export function resolveEventAnchor(
  dol: string,
  candidates: NearbyEventCandidate[]
): { anchorDate: string; differsFromDol: boolean } {
  if (candidates.length === 0) {
    return { anchorDate: dol, differsFromDol: false };
  }

  // Group by date, find strongest
  const byDate = new Map<string, number>();
  for (const c of candidates) {
    const current = byDate.get(c.date) || 0;
    byDate.set(c.date, Math.max(current, c.score));
  }

  // Sort by score descending
  const sorted = [...byDate.entries()].sort((a, b) => b[1] - a[1]);
  const bestDate = sorted[0]?.[0] || dol;

  return {
    anchorDate: bestDate,
    differsFromDol: bestDate !== dol,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Builder
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildDolContextInput {
  /** The DOL from the claim or user input */
  dol: string;

  /** Where this DOL came from */
  dolSource: DolSource;

  /** Quick DOL result, if available */
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

  /** Providers that were used */
  providersUsed?: string[];

  /** Radar station ID */
  radarStationId?: string | null;
}

/**
 * Build the canonical EffectiveDolContext.
 * This is the ONE function that creates the context all report sections use.
 */
export function buildEffectiveDolContext(input: BuildDolContextInput): EffectiveDolContext {
  const { dol, dolSource, quickDolResult } = input;

  // 1. Build claim window
  const claimWindowDays = getClaimWindowDays(dol);

  // 2. Build evidence window
  const { fromDate: evidenceFromDate, toDate: evidenceToDate } = getStormEvidenceWindow(
    dol,
    quickDolResult?.fromDate,
    quickDolResult?.toDate
  );

  // 3. Normalize candidates
  const nearbyEventCandidates: NearbyEventCandidate[] = (quickDolResult?.candidates || []).map(
    (c) => ({
      date: c.date,
      type: c.type || "unknown",
      magnitude: c.magnitude,
      distanceMiles: c.distanceMiles,
      score: c.score,
      source: c.source || "unknown",
    })
  );

  // 4. Resolve event anchor
  const { anchorDate: eventAnchorDate, differsFromDol: eventAnchorDiffersFromDol } =
    resolveEventAnchor(dol, nearbyEventCandidates);

  // 5. Resolve confidence
  let confidence: DolConfidence = "unknown";
  if (quickDolResult?.confidence !== undefined) {
    if (quickDolResult.confidence >= 0.7) confidence = "high";
    else if (quickDolResult.confidence >= 0.4) confidence = "medium";
    else confidence = "low";
  } else if (dolSource === "claim" || dolSource === "manual_override") {
    confidence = "medium"; // User-provided, we trust it moderately
  }

  const ctx: EffectiveDolContext = {
    selectedDol: dol,
    dolSource,
    confidence,
    claimWindowDays,
    evidenceFromDate,
    evidenceToDate,
    eventAnchorDate,
    eventAnchorDiffersFromDol,
    nearbyEventCandidates,
    providersUsed: input.providersUsed || [],
    radarStationId: input.radarStationId || null,
  };

  logger.info("[EFFECTIVE_DOL] Built canonical DOL context", {
    selectedDol: ctx.selectedDol,
    dolSource: ctx.dolSource,
    confidence: ctx.confidence,
    claimWindow: ctx.claimWindowDays,
    eventAnchor: ctx.eventAnchorDate,
    anchorDiffers: ctx.eventAnchorDiffersFromDol,
    candidateCount: ctx.nearbyEventCandidates.length,
    providers: ctx.providersUsed,
  });

  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function formatISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}
