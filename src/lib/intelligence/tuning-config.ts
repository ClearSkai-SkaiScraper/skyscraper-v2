/**
 * SkaiScraper Intelligence Tuning Configuration
 *
 * SINGLE SOURCE OF TRUTH for all scoring weights, thresholds,
 * and sensitivity settings across the intelligence layer.
 *
 * Tuning guide:
 *   - Simulation weights must sum to 1.0
 *   - Packet score weights must sum to 1.0
 *   - Thresholds are on 0-100 scale unless noted
 *   - Storm alert distances are in miles
 *   - Weather values are in imperial (inches, mph)
 *
 * Update this file → all engines pick up the change.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Simulation Engine
// ─────────────────────────────────────────────────────────────────────────────

export const SIMULATION_CONFIG = {
  version: "1.0.0",

  /** Category weights — MUST sum to 1.0 */
  weights: {
    stormEvidence: 0.2,
    damageEvidence: 0.25,
    collateralEvidence: 0.15,
    repairability: 0.1,
    documentationCompleteness: 0.15,
    codeCompliance: 0.05,
    carrierHistory: 0.1,
  } as const,

  /** Outcome thresholds (on final 0-100 score) */
  outcomes: {
    approvedMin: 65, // >= 65 → "approved"
    partialMin: 40, // >= 40 → "partial"
    // below 40 → "denied"
  },

  /** Confidence thresholds */
  confidence: {
    highMin: 70,
    mediumMin: 45,
    // below 45 → "low"
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Storm Graph Engine
// ─────────────────────────────────────────────────────────────────────────────

export const STORM_GRAPH_CONFIG = {
  /** Radius for claim clustering (miles) */
  clusterRadiusMiles: 10,

  /** Radius for corroboration searches (miles) */
  corroborationRadiusMiles: 5,

  /** Minimum claims to form a cluster */
  minClaimsForCluster: 2,

  /** Pre-qualification score thresholds */
  preQual: {
    veryHighMin: 70,
    highMin: 50,
    moderateMin: 30,
    // below 30 → "low"
  },

  /** Corroboration scoring weights */
  corroboration: {
    nearbyClaimsWeight: 0.35,
    verifiedDamageWeight: 0.25,
    stormEventWeight: 0.2,
    damageConsistencyWeight: 0.2,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Packet Intelligence Score
// ─────────────────────────────────────────────────────────────────────────────

export const PACKET_SCORE_CONFIG = {
  /** Component weights — MUST sum to 1.0 */
  weights: {
    claimIQ: 0.4,
    simulation: 0.35,
    stormGraph: 0.25,
  } as const,

  /** Grade thresholds */
  grades: {
    A: 85,
    B: 70,
    C: 55,
    D: 40,
    // below 40 → "F"
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Evidence Gap Detector
// ─────────────────────────────────────────────────────────────────────────────

export const EVIDENCE_GAP_CONFIG = {
  /** Impact scores per model group (0-30 scale) */
  modelGroupImpact: {
    roof: 20,
    storm: 25,
    hail: 22,
    wind: 18,
    soft_metals: 18,
    collateral: 15,
    spatter: 12,
    water: 14,
    siding: 12,
    hvac: 14,
  } as const,

  /** Priority thresholds */
  priority: {
    highMin: 18,
    mediumMin: 12,
    // below 12 → "low"
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Storm Alerts
// ─────────────────────────────────────────────────────────────────────────────

export const STORM_ALERT_CONFIG = {
  /** Maximum distance to check for storms (miles) */
  alertRadiusMiles: 15,

  /** Only alert for storms within this many days */
  recentStormDays: 30,

  /** Critical thresholds */
  critical: {
    hailSizeInches: 1.5,
    windSpeedMph: 70,
  },

  /** Alert level distance bands (miles) */
  distanceBands: {
    criticalMaxMiles: 3,
    warningMaxMiles: 5,
    warningExtendedMiles: 10, // warning if severe + within 10mi
  },

  /** Extended warning thresholds (within warningExtendedMiles) */
  extendedWarning: {
    minHailInches: 1.0,
    minWindMph: 60,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Carrier Playbook
// ─────────────────────────────────────────────────────────────────────────────

export const CARRIER_PLAYBOOK_CONFIG = {
  /** Approval rate tiers */
  approvalTiers: {
    cooperative: 75, // >= 75% → "cooperative"
    moderate: 50, // >= 50% → "moderate"
    // below 50 → "difficult"
  },

  /** Resolution speed tiers (days) */
  resolutionTiers: {
    fast: 30,
    typical: 60,
    // above 60 → "slow"
  },

  /** Minimum claims to generate a meaningful playbook */
  minClaimsForPlaybook: 3,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// User-facing labels (conservative wording per advisor)
// ─────────────────────────────────────────────────────────────────────────────

export const INTELLIGENCE_LABELS = {
  /** Panel / section titles */
  simulationTitle: "Claim Strength Analysis",
  simulationSubtitle: "Evidence-based assessment of claim viability",
  stormGraphTitle: "Storm Corroboration",
  stormGraphSubtitle: "Cross-claim damage verification",
  packetScoreTitle: "Submission Readiness",
  packetScoreSubtitle: "Composite score across all evidence engines",
  carrierTitle: "Carrier Intelligence",
  carrierSubtitle: "Historical patterns and strategies",
  alertTitle: "Storm Exposure Alerts",
  alertSubtitle: "Properties with nearby storm activity",

  /** Score labels (avoid predictive language) */
  approvalProbability: "Evidence Confidence",
  predictedOutcome: "Assessment",
  corroborationScore: "Corroboration Score",
  packetScore: "Submission Readiness Score",

  /** Outcome labels */
  outcomes: {
    approved: "Strong",
    partial: "Moderate",
    denied: "Needs Work",
  } as Record<string, string>,

  /** Grade descriptions */
  gradeDescriptions: {
    A: "Submission-ready — strong evidence across all engines",
    B: "Near-ready — address remaining gaps before submission",
    C: "Needs improvement — review factors and add documentation",
    D: "Significant gaps — gather more evidence before proceeding",
    F: "Not ready — major evidence gaps exist",
  } as Record<string, string>,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

/** Runtime check — call on app init or in tests */
export function validateTuningConfig(): string[] {
  const errors: string[] = [];

  // Simulation weights must sum to 1.0
  const simSum = Object.values(SIMULATION_CONFIG.weights).reduce((s, w) => s + w, 0);
  if (Math.abs(simSum - 1.0) > 0.001) {
    errors.push(`Simulation weights sum to ${simSum.toFixed(3)}, expected 1.000`);
  }

  // Packet score weights must sum to 1.0
  const packetSum = Object.values(PACKET_SCORE_CONFIG.weights).reduce((s, w) => s + w, 0);
  if (Math.abs(packetSum - 1.0) > 0.001) {
    errors.push(`Packet score weights sum to ${packetSum.toFixed(3)}, expected 1.000`);
  }

  // Corroboration weights must sum to 1.0
  const corrSum = Object.values(STORM_GRAPH_CONFIG.corroboration).reduce((s, w) => s + w, 0);
  if (Math.abs(corrSum - 1.0) > 0.001) {
    errors.push(`Corroboration weights sum to ${corrSum.toFixed(3)}, expected 1.000`);
  }

  // Threshold ordering checks
  if (SIMULATION_CONFIG.outcomes.approvedMin <= SIMULATION_CONFIG.outcomes.partialMin) {
    errors.push("Simulation: approvedMin must be > partialMin");
  }

  if (
    PACKET_SCORE_CONFIG.grades.A <= PACKET_SCORE_CONFIG.grades.B ||
    PACKET_SCORE_CONFIG.grades.B <= PACKET_SCORE_CONFIG.grades.C ||
    PACKET_SCORE_CONFIG.grades.C <= PACKET_SCORE_CONFIG.grades.D
  ) {
    errors.push("Packet grades must be in descending order: A > B > C > D");
  }

  return errors;
}
