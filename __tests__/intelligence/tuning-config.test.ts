/**
 * Integration tests for the Intelligence Layer
 *
 * Tests:
 * - Tuning config validation
 * - DOL interpretation helpers
 * - Simulation scoring ranges
 * - Evidence gap analysis structure
 * - Dataset builder type shapes
 */

import {
  CARRIER_PLAYBOOK_CONFIG,
  DOL_CONFIG,
  EVIDENCE_GAP_CONFIG,
  INTELLIGENCE_LABELS,
  PACKET_SCORE_CONFIG,
  SIMULATION_CONFIG,
  STORM_ALERT_CONFIG,
  STORM_GRAPH_CONFIG,
  validateTuningConfig,
} from "@/lib/intelligence/tuning-config";
import { describe, expect, it } from "vitest";

// ============================================================================
// Tuning Config Validation
// ============================================================================

describe("Tuning Config Validation", () => {
  it("passes all internal validation checks", () => {
    const errors = validateTuningConfig();
    expect(errors).toEqual([]);
  });

  it("SIMULATION_CONFIG weights sum to 1.0", () => {
    const sum = Object.values(SIMULATION_CONFIG.weights).reduce((s, w) => s + w, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  it("PACKET_SCORE_CONFIG weights sum to 1.0", () => {
    const sum = Object.values(PACKET_SCORE_CONFIG.weights).reduce((s, w) => s + w, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  it("STORM_GRAPH_CONFIG corroboration weights sum to 1.0", () => {
    const sum = Object.values(STORM_GRAPH_CONFIG.corroboration).reduce((s, w) => s + w, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  it("grades are in descending order", () => {
    const g = PACKET_SCORE_CONFIG.grades;
    expect(g.A).toBeGreaterThan(g.B);
    expect(g.B).toBeGreaterThan(g.C);
    expect(g.C).toBeGreaterThan(g.D);
  });

  it("SIMULATION_CONFIG outcomes are ordered correctly", () => {
    expect(SIMULATION_CONFIG.outcomes.approvedMin).toBeGreaterThan(
      SIMULATION_CONFIG.outcomes.partialMin
    );
  });
});

// ============================================================================
// DOL Configuration
// ============================================================================

describe("DOL Configuration", () => {
  it("severity thresholds are in descending order", () => {
    const s = DOL_CONFIG.severity;
    expect(s.high).toBeGreaterThan(s.moderate);
    expect(s.moderate).toBeGreaterThan(s.low);
  });

  it("confidence thresholds are in descending order", () => {
    const c = DOL_CONFIG.confidence;
    expect(c.high).toBeGreaterThan(c.moderate);
  });

  it("all severity thresholds are between 0 and 1", () => {
    for (const v of Object.values(DOL_CONFIG.severity)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("simulationBoost values are non-negative", () => {
    for (const v of Object.values(DOL_CONFIG.simulationBoost)) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it("has labels for all severity tiers", () => {
    expect(DOL_CONFIG.labels.high).toBeDefined();
    expect(DOL_CONFIG.labels.moderate).toBeDefined();
    expect(DOL_CONFIG.labels.low).toBeDefined();
    expect(DOL_CONFIG.labels.minimal).toBeDefined();
  });
});

// ============================================================================
// Storm Alert Config
// ============================================================================

describe("Storm Alert Configuration", () => {
  it("has valid critical thresholds", () => {
    expect(STORM_ALERT_CONFIG.critical.hailSizeInches).toBeGreaterThan(0);
    expect(STORM_ALERT_CONFIG.critical.windSpeedMph).toBeGreaterThan(0);
  });

  it("distance bands are in ascending order", () => {
    expect(STORM_ALERT_CONFIG.distanceBands.criticalMaxMiles).toBeLessThan(
      STORM_ALERT_CONFIG.distanceBands.warningMaxMiles
    );
    expect(STORM_ALERT_CONFIG.distanceBands.warningMaxMiles).toBeLessThan(
      STORM_ALERT_CONFIG.distanceBands.warningExtendedMiles
    );
  });

  it("alert radius is positive", () => {
    expect(STORM_ALERT_CONFIG.alertRadiusMiles).toBeGreaterThan(0);
  });
});

// ============================================================================
// Evidence Gap Config
// ============================================================================

describe("Evidence Gap Configuration", () => {
  it("has valid model group impact scores", () => {
    const impact = EVIDENCE_GAP_CONFIG.modelGroupImpact;
    for (const v of Object.values(impact)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(30);
    }
  });

  it("has priority thresholds", () => {
    expect(EVIDENCE_GAP_CONFIG.priority.highMin).toBeGreaterThan(
      EVIDENCE_GAP_CONFIG.priority.mediumMin
    );
  });
});

// ============================================================================
// Carrier Playbook Config
// ============================================================================

describe("Carrier Playbook Configuration", () => {
  it("has valid approval tiers", () => {
    expect(CARRIER_PLAYBOOK_CONFIG.approvalTiers.cooperative).toBeGreaterThan(
      CARRIER_PLAYBOOK_CONFIG.approvalTiers.moderate
    );
  });

  it("has minimum claim threshold", () => {
    expect(CARRIER_PLAYBOOK_CONFIG.minClaimsForPlaybook).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// Intelligence Labels
// ============================================================================

describe("Intelligence Labels", () => {
  it("has all required label keys", () => {
    expect(INTELLIGENCE_LABELS.carrierTitle).toBeDefined();
    expect(INTELLIGENCE_LABELS.carrierSubtitle).toBeDefined();
    expect(INTELLIGENCE_LABELS.simulationTitle).toBeDefined();
    expect(INTELLIGENCE_LABELS.stormGraphTitle).toBeDefined();
    expect(INTELLIGENCE_LABELS.alertTitle).toBeDefined();
    expect(typeof INTELLIGENCE_LABELS.carrierTitle).toBe("string");
  });
});

// ============================================================================
// Storm Graph Config
// ============================================================================

describe("Storm Graph Configuration", () => {
  it("has valid cluster settings", () => {
    expect(STORM_GRAPH_CONFIG.clusterRadiusMiles).toBeGreaterThan(0);
    expect(STORM_GRAPH_CONFIG.minClaimsForCluster).toBeGreaterThanOrEqual(2);
  });

  it("corroboration weights between 0 and 1", () => {
    for (const v of Object.values(STORM_GRAPH_CONFIG.corroboration)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
