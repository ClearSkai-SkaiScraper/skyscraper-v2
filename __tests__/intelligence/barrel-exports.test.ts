/**
 * Integration tests for Intelligence Layer data structures
 *
 * Tests exported types, barrel exports, and dataset builder shapes.
 * These are compile-time + runtime shape assertions.
 */

import React from "react";
import { describe, expect, it } from "vitest";

// Ensure React is available globally for JSX components loaded in tests
globalThis.React = React;

// Barrel export tests — verify that all expected symbols are importable
describe("Barrel exports - intelligence", () => {
  it("exports all expected intelligence components", async () => {
    const mod = await import("@/components/intelligence/index");
    expect(mod.UnifiedClaimIntelligencePanel).toBeDefined();
    expect(mod.ValidationReportPanel).toBeDefined();
    expect(mod.IntelligenceErrorBoundary).toBeDefined();
    expect(mod.withIntelligenceErrorBoundary).toBeDefined();
    expect(mod.EvidenceGapWidget).toBeDefined();
  });
});

describe("Barrel exports - carrier", () => {
  it("exports all expected carrier components", async () => {
    const mod = await import("@/components/carrier/index");
    expect(mod.CarrierIntelligencePanel).toBeDefined();
    expect(mod.CarrierPlaybookPanel).toBeDefined();
  });
});

describe("Barrel exports - simulation", () => {
  it("exports all expected simulation components", async () => {
    const mod = await import("@/components/simulation/index");
    expect(mod.ClaimSimulationDashboard).toBeDefined();
    expect(mod.SimulationHistoryTracker).toBeDefined();
    expect(mod.SimulationComparison).toBeDefined();
  });
});

describe("Barrel exports - storm", () => {
  it("exports all expected storm components", async () => {
    const mod = await import("@/components/storm/index");
    expect(mod.StormAlertPanel).toBeDefined();
  });
});

describe("Barrel exports - claimiq", () => {
  it("exports all expected claimiq components", async () => {
    const mod = await import("@/components/claimiq/index");
    expect(mod.ClaimIQAnalyticsDashboard).toBeDefined();
    expect(mod.AutopilotResolutionPanel).toBeDefined();
  });
});

// Dataset builder shape tests
describe("Dataset builder types", () => {
  it("buildFeatureToggles returns expected shape", async () => {
    const { buildFeatureToggles } = await import("@/lib/intelligence/dataset-builders");
    const toggles = buildFeatureToggles();

    // Core features
    expect(typeof toggles.supplementSummary).toBe("boolean");
    expect(typeof toggles.weatherAnalysis).toBe("boolean");
    expect(typeof toggles.codeCitations).toBe("boolean");

    // Documentation features
    expect(typeof toggles.photoAnnotations).toBe("boolean");
    expect(typeof toggles.damageDocumentation).toBe("boolean");

    // Financial
    expect(typeof toggles.financialAnalysisEnabled).toBe("boolean");
    expect(typeof toggles.depreciationBreakdown).toBe("boolean");
  });

  it("buildFeatureToggles respects overrides", async () => {
    const { buildFeatureToggles } = await import("@/lib/intelligence/dataset-builders");

    const defaultToggles = buildFeatureToggles();
    const customToggles = buildFeatureToggles({ colorBoards: true, aerialImagery: true });

    expect(defaultToggles.colorBoards).toBe(false);
    expect(customToggles.colorBoards).toBe(true);
    expect(customToggles.aerialImagery).toBe(true);
    // Other defaults unchanged
    expect(customToggles.supplementSummary).toBe(defaultToggles.supplementSummary);
  });
});

// Carrier engine barrel exports
describe("Barrel exports - carrier lib", () => {
  it("exports carrier engine functions", async () => {
    const mod = await import("@/lib/carrier/index");
    expect(mod.buildCarrierPlaybooks).toBeDefined();
    expect(mod.getCarrierPlaybook).toBeDefined();
    expect(typeof mod.buildCarrierPlaybooks).toBe("function");
    expect(typeof mod.getCarrierPlaybook).toBe("function");
  });
});
