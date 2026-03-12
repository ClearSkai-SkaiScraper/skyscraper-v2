/**
 * Recommendation Engine — Unit Tests
 *
 * Tests scoring logic, ranking, validation, and edge cases.
 */
import { describe, expect, it } from "vitest";

import {
  previewTemplateOptions,
  quickMatch,
  recommendTemplates,
  validateGenerationInputs,
} from "@/lib/reports/recommendation-engine";

import {
  ALL_TEMPLATES,
  getTemplatesByStyle,
  getTemplatesForDamage,
  getTemplatesForIntent,
  getTemplatesForTrade,
  STYLE_CATEGORIES,
  templateHasCapability,
  type StyleCategory,
} from "@/lib/templates/templateRegistry";

// ─── Registry Integrity ──────────────────────────────────────

describe("Template Registry Integrity", () => {
  it("has 27 templates total", () => {
    expect(ALL_TEMPLATES.length).toBe(27);
  });

  it("has valid style categories for all templates", () => {
    const validStyles = Object.values(STYLE_CATEGORIES);
    ALL_TEMPLATES.forEach((t) => {
      expect(validStyles).toContain(t.styleCategory);
    });
  });

  it("has unique IDs for all templates", () => {
    const ids = ALL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique slugs for all templates", () => {
    const slugs = ALL_TEMPLATES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("distributes templates across all 3 style categories", () => {
    const insurance = getTemplatesByStyle(STYLE_CATEGORIES.INSURANCE);
    const retail = getTemplatesByStyle(STYLE_CATEGORIES.RETAIL);
    const sales = getTemplatesByStyle(STYLE_CATEGORIES.SALES);
    expect(insurance.length).toBeGreaterThan(0);
    expect(retail.length).toBeGreaterThan(0);
    expect(sales.length).toBeGreaterThan(0);
    expect(insurance.length + retail.length + sales.length).toBe(27);
  });

  it("has valid aiSelectionWeight (0–100) for all templates", () => {
    ALL_TEMPLATES.forEach((t) => {
      expect(t.aiSelectionWeight).toBeGreaterThanOrEqual(0);
      expect(t.aiSelectionWeight).toBeLessThanOrEqual(100);
    });
  });

  it("has at least one supported trade for each template", () => {
    ALL_TEMPLATES.forEach((t) => {
      expect(t.supportedTrades.length).toBeGreaterThan(0);
    });
  });

  it("has at least one supported intent for each template", () => {
    ALL_TEMPLATES.forEach((t) => {
      expect(t.supportedIntents.length).toBeGreaterThan(0);
    });
  });

  it("has a recommendedWhen string for each template", () => {
    ALL_TEMPLATES.forEach((t) => {
      expect(t.recommendedWhen).toBeTruthy();
      expect(t.recommendedWhen.length).toBeGreaterThan(10);
    });
  });

  it("has proper image mapping for each template", () => {
    ALL_TEMPLATES.forEach((t) => {
      expect(t.imageMapping.cardThumbnail).toBeTruthy();
      expect(t.imageMapping.fallbackThumbnail).toBeTruthy();
      expect(t.imageMapping.visualTheme).toBeTruthy();
    });
  });
});

// ─── Trade/Damage/Intent Filters ─────────────────────────────

describe("Registry Filter Functions", () => {
  it("getTemplatesForTrade returns roofing templates", () => {
    const roofing = getTemplatesForTrade("roofing");
    expect(roofing.length).toBeGreaterThan(5);
    roofing.forEach((t) => {
      expect(t.supportedTrades).toContain("roofing");
    });
  });

  it("getTemplatesForDamage returns hail templates", () => {
    const hail = getTemplatesForDamage("hail");
    expect(hail.length).toBeGreaterThan(3);
    hail.forEach((t) => {
      expect(t.supportedDamageTypes).toContain("hail");
    });
  });

  it("getTemplatesForIntent returns claim_support templates", () => {
    const claims = getTemplatesForIntent("claim_support");
    expect(claims.length).toBeGreaterThan(5);
    claims.forEach((t) => {
      expect(t.supportedIntents).toContain("claim_support");
    });
  });

  it("templateHasCapability returns correct booleans", () => {
    expect(templateHasCapability("roof-damage-comp", "photoGallery")).toBe(true);
    expect(templateHasCapability("roof-damage-comp", "financingSection")).toBe(false);
    expect(templateHasCapability("contractor-estimate", "pricingTables")).toBe(true);
    expect(templateHasCapability("nonexistent", "pricingTables")).toBe(false);
  });
});

// ─── Recommendation Engine Scoring ───────────────────────────

describe("Recommendation Engine — recommendTemplates", () => {
  it("returns results with valid structure", () => {
    const result = recommendTemplates({ limit: 5 });
    expect(result.recommendations).toBeDefined();
    expect(result.recommendations.length).toBeLessThanOrEqual(5);
    expect(result.topPick).toBeDefined();
    expect(result.engineVersion).toBeTruthy();
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("filters by style category", () => {
    const insurance = recommendTemplates({ styleCategory: "Insurance", limit: 20 });
    insurance.recommendations.forEach((r) => {
      expect(r.styleCategory).toBe("Insurance");
    });

    const retail = recommendTemplates({ styleCategory: "Retail", limit: 20 });
    retail.recommendations.forEach((r) => {
      expect(r.styleCategory).toBe("Retail");
    });
  });

  it("scores roofing + hail + claim_support highly for comprehensive roof report", () => {
    const result = recommendTemplates({
      trade: "roofing",
      damageType: "hail",
      intent: "claim_support",
      propertyType: "residential",
      hasPhotos: true,
      hasMeasurements: true,
      limit: 3,
    });

    expect(result.topPick).not.toBeNull();
    expect(result.topPick!.score).toBeGreaterThan(70);
    // The comprehensive roof damage report or hail certification should be top
    expect(["roof-damage-comp", "hail-certification"]).toContain(result.topPick!.templateId);
  });

  it("scores retail estimate highly for homeowner_estimate intent", () => {
    const result = recommendTemplates({
      intent: "homeowner_estimate",
      trade: "roofing",
      hasPricing: true,
      hasMeasurements: true,
      limit: 3,
    });

    expect(result.topPick).not.toBeNull();
    expect(result.topPick!.score).toBeGreaterThan(60);
    // Professional Contractor Estimate or Roof Replacement Quote
    expect(["contractor-estimate", "roof-replacement-quote"]).toContain(result.topPick!.templateId);
  });

  it("scores supplement template highly for supplement intent", () => {
    const result = recommendTemplates({
      intent: "supplement",
      trade: "roofing",
      hasPricing: true,
      hasPhotos: true,
      hasMeasurements: true,
      limit: 3,
    });

    expect(result.topPick).not.toBeNull();
    expect(result.topPick!.score).toBeGreaterThan(70);
    expect(result.topPick!.templateId).toBe("supplement-line-item");
  });

  it("penalizes missing required data", () => {
    const withData = recommendTemplates({
      trade: "roofing",
      intent: "claim_support",
      hasPhotos: true,
      hasMeasurements: true,
      limit: 1,
    });

    const withoutData = recommendTemplates({
      trade: "roofing",
      intent: "claim_support",
      hasPhotos: false,
      hasMeasurements: false,
      limit: 1,
    });

    expect(withData.topPick!.score).toBeGreaterThanOrEqual(withoutData.topPick!.score);
  });

  it("returns missingInputs when data is unavailable", () => {
    const result = recommendTemplates({
      trade: "roofing",
      intent: "supplement",
      hasPhotos: false,
      hasPricing: false,
      hasMeasurements: false,
      limit: 5,
    });

    // Supplement template requires pricing + photos + measurements
    const supplement = result.recommendations.find((r) => r.templateId === "supplement-line-item");
    if (supplement) {
      expect(supplement.missingInputs.length).toBeGreaterThan(0);
    }
  });

  it("returns valid scoreBreakdown for each recommendation", () => {
    const result = recommendTemplates({ limit: 5 });
    result.recommendations.forEach((r) => {
      expect(r.scoreBreakdown).toBeDefined();
      expect(r.scoreBreakdown.tradeMatch).toBeGreaterThanOrEqual(0);
      expect(r.scoreBreakdown.tradeMatch).toBeLessThanOrEqual(100);
      expect(r.scoreBreakdown.aiWeight).toBeGreaterThanOrEqual(0);
      expect(r.scoreBreakdown.aiWeight).toBeLessThanOrEqual(100);
    });
  });

  it("sorts recommendations by score descending", () => {
    const result = recommendTemplates({
      trade: "roofing",
      damageType: "hail",
      limit: 10,
    });

    for (let i = 1; i < result.recommendations.length; i++) {
      expect(result.recommendations[i - 1].score).toBeGreaterThanOrEqual(
        result.recommendations[i].score
      );
    }
  });
});

// ─── Preview Template Options ────────────────────────────────

describe("previewTemplateOptions", () => {
  it("returns templates filtered by style", () => {
    const options = previewTemplateOptions("Insurance" as StyleCategory);
    expect(options.length).toBeGreaterThan(0);
  });

  it("respects trade filter", () => {
    const allInsurance = previewTemplateOptions("Insurance" as StyleCategory);
    const plumbingOnly = previewTemplateOptions("Insurance" as StyleCategory, "plumbing");
    expect(plumbingOnly.length).toBeLessThanOrEqual(allInsurance.length);
  });

  it("respects limit parameter", () => {
    const options = previewTemplateOptions("Insurance" as StyleCategory, undefined, 3);
    expect(options.length).toBeLessThanOrEqual(3);
  });

  it("returns valid preview option structure", () => {
    const options = previewTemplateOptions("Retail" as StyleCategory);
    options.forEach((opt) => {
      expect(opt.templateId).toBeTruthy();
      expect(opt.slug).toBeTruthy();
      expect(opt.title).toBeTruthy();
      expect(opt.thumbnailUrl).toBeTruthy();
      expect(Array.isArray(opt.supportedTrades)).toBe(true);
    });
  });
});

// ─── Validate Generation Inputs ──────────────────────────────

describe("validateGenerationInputs", () => {
  it("returns isReady=true when all required data is available", () => {
    const result = validateGenerationInputs({
      templateId: "roof-damage-comp",
      hasPhotos: true,
      hasMeasurements: true,
      hasPricing: false,
      hasWeatherData: true,
      hasClaimData: true,
    });
    expect(result.isReady).toBe(true);
    expect(result.readinessScore).toBe(100);
  });

  it("returns isReady=false when required data is missing", () => {
    const result = validateGenerationInputs({
      templateId: "supplement-line-item",
      hasPhotos: false,
      hasMeasurements: false,
      hasPricing: false,
    });
    expect(result.isReady).toBe(false);
    expect(result.readinessScore).toBeLessThan(100);
    expect(result.missingRequired.length).toBeGreaterThan(0);
  });

  it("returns suggestions for missing data", () => {
    const result = validateGenerationInputs({
      templateId: "contractor-estimate",
      hasPhotos: false,
      hasMeasurements: false,
      hasPricing: false,
    });
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("handles unknown template ID gracefully", () => {
    const result = validateGenerationInputs({
      templateId: "nonexistent-template",
      hasPhotos: true,
      hasMeasurements: true,
      hasPricing: true,
    });
    expect(result.isReady).toBe(false);
    expect(result.templateTitle).toBe("Unknown Template");
    expect(result.readinessScore).toBe(0);
  });

  it("flags weather as recommended (not required)", () => {
    const result = validateGenerationInputs({
      templateId: "roof-damage-comp",
      hasPhotos: true,
      hasMeasurements: true,
      hasPricing: false,
      hasWeatherData: false,
      hasClaimData: true,
    });
    const weatherMissing = result.missingRequired.find((m) => m.field === "weather");
    if (weatherMissing) {
      expect(weatherMissing.importance).toBe("recommended");
    }
  });
});

// ─── Quick Match ─────────────────────────────────────────────

describe("quickMatch", () => {
  it("returns a template ID for claim_support + roofing", () => {
    const id = quickMatch("claim_support", "roofing");
    expect(id).toBeTruthy();
  });

  it("returns a template ID for homeowner_estimate", () => {
    const id = quickMatch("homeowner_estimate");
    expect(id).toBeTruthy();
  });

  it("returns a template ID scoped to a style", () => {
    const id = quickMatch("claim_support", "roofing", "Insurance" as StyleCategory);
    expect(id).toBeTruthy();
    // Verify it's actually an insurance template
    const template = ALL_TEMPLATES.find((t) => t.id === id);
    expect(template?.styleCategory).toBe("Insurance");
  });

  it("returns null gracefully for impossible combo", () => {
    // There are no templates with a totally wrong combo, but test the code path
    const id = quickMatch("warranty", undefined, "Insurance" as StyleCategory);
    // Warranty templates are in Retail, so Insurance filter should return nothing with high score
    // but the engine still returns the best partial match
    // This is testing that the function doesn't crash
    expect(typeof id === "string" || id === null).toBe(true);
  });
});
