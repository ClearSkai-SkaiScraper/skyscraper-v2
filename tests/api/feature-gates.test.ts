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
    it("free plan has basic_reports", () => {
      expect(hasFeature("free", "basic_reports")).toBe(true);
    });

    it("free plan does NOT have ai_tools", () => {
      expect(hasFeature("free", "ai_tools")).toBe(false);
    });

    it("solo plan includes all free features plus its own", () => {
      expect(hasFeature("solo", "basic_reports")).toBe(true);
      expect(hasFeature("solo", "ai_tools")).toBe(true);
    });

    it("business plan has team_management", () => {
      expect(hasFeature("business", "team_management")).toBe(true);
    });

    it("enterprise plan has all features", () => {
      const allFeatures: FeatureKey[] = [
        "basic_reports",
        "ai_tools",
        "team_management",
        "api_access",
        "custom_branding",
        "advanced_analytics",
        "priority_support",
        "sso",
        "white_label",
        "dedicated_account_manager",
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
    it("basic_reports minimum plan is free", () => {
      expect(getMinPlanForFeature("basic_reports")).toBe("free");
    });

    it("ai_tools minimum plan is solo", () => {
      expect(getMinPlanForFeature("ai_tools")).toBe("solo");
    });

    it("team_management minimum plan is business", () => {
      expect(getMinPlanForFeature("team_management")).toBe("business");
    });

    it("sso minimum plan is enterprise", () => {
      expect(getMinPlanForFeature("sso")).toBe("enterprise");
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
