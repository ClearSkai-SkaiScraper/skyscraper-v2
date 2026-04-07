/**
 * Feature Gates & Billing Guard Tests (Sprint 7)
 *
 * Validates the featureGates system, plan hierarchy,
 * and billing guard logic.
 */

import { describe, expect, it } from "vitest";

import {
  getFeaturesForPlan,
  getMinPlanForFeature,
  hasFeature,
  PLAN_DISPLAY_NAMES,
  type FeatureKey,
  type PlanSlug,
} from "@/lib/billing/featureGates";

// ═════════════════════════════════════════════════════════════════════
//  Feature gate logic
// ═════════════════════════════════════════════════════════════════════
describe("featureGates", () => {
  describe("hasFeature", () => {
    it("free plan has pipeline", () => {
      expect(hasFeature("free", "pipeline")).toBe(true);
    });

    it("free plan does NOT have ai_assistant", () => {
      expect(hasFeature("free", "ai_assistant")).toBe(false);
    });

    it("solo plan includes all free features plus its own", () => {
      expect(hasFeature("solo", "pipeline")).toBe(true);
      expect(hasFeature("solo", "ai_assistant")).toBe(true);
    });

    it("business plan has team_seats", () => {
      expect(hasFeature("business", "team_seats")).toBe(true);
    });

    it("enterprise plan has all features", () => {
      const allFeatures: FeatureKey[] = [
        "ai_assistant",
        "ai_damage_analysis",
        "advanced_reports",
        "pdf_export",
        "custom_branding",
        "api_access",
        "integrations",
        "team_seats",
        "client_portal",
        "message_center",
        "pipeline",
        "weather_verification",
        "priority_support",
        "white_label",
      ];

      for (const feature of allFeatures) {
        expect(hasFeature("enterprise", feature)).toBe(true);
      }
    });

    it("handles unknown features gracefully", () => {
      expect(hasFeature("solo", "nonexistent_feature" as FeatureKey)).toBe(false);
    });
  });

  describe("getMinPlanForFeature", () => {
    it("pipeline minimum plan is free", () => {
      expect(getMinPlanForFeature("pipeline")).toBe("free");
    });

    it("ai_assistant minimum plan is solo", () => {
      expect(getMinPlanForFeature("ai_assistant")).toBe("solo");
    });

    it("team_seats minimum plan is business", () => {
      expect(getMinPlanForFeature("team_seats")).toBe("business");
    });

    it("white_label minimum plan is enterprise", () => {
      expect(getMinPlanForFeature("white_label")).toBe("enterprise");
    });
  });

  describe("getFeaturesForPlan", () => {
    it("returns array of features for a plan", () => {
      const soloFeatures = getFeaturesForPlan("solo");
      expect(Array.isArray(soloFeatures)).toBe(true);
      expect(soloFeatures.length).toBeGreaterThan(0);
    });

    it("higher plans have more features than lower plans", () => {
      const freeCount = getFeaturesForPlan("free").length;
      const soloCount = getFeaturesForPlan("solo").length;
      const businessCount = getFeaturesForPlan("business").length;
      const enterpriseCount = getFeaturesForPlan("enterprise").length;

      expect(soloCount).toBeGreaterThanOrEqual(freeCount);
      expect(businessCount).toBeGreaterThanOrEqual(soloCount);
      expect(enterpriseCount).toBeGreaterThanOrEqual(businessCount);
    });
  });

  describe("PLAN_DISPLAY_NAMES", () => {
    it("has display names for all plan slugs", () => {
      const expectedPlans: PlanSlug[] = ["free", "solo", "business", "enterprise"];
      for (const plan of expectedPlans) {
        expect(PLAN_DISPLAY_NAMES[plan]).toBeDefined();
        expect(typeof PLAN_DISPLAY_NAMES[plan]).toBe("string");
      }
    });
  });
});
