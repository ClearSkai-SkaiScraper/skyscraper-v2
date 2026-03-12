/**
 * AI Template Recommendation Engine — Scoring Service
 *
 * Pure-logic scoring: no DB calls, no AI calls.
 * Takes a RecommendationRequest + template registry → returns scored results.
 *
 * Scoring dimensions (each 0–100, weighted):
 *   1. Trade match        — 25%
 *   2. Damage type match  — 20%
 *   3. Intent match       — 25%
 *   4. Property type match — 10%
 *   5. Data readiness     — 10%
 *   6. AI selection weight — 10%
 *
 * Total score = weighted sum, clamped to 0–100.
 */

import {
  ALL_TEMPLATES,
  getTemplatesByStyle,
  type DamageType,
  type JobIntent,
  type PropertyType,
  type StyleCategory,
  type TemplateDefinition,
  type TradeType,
} from "@/lib/templates/templateRegistry";

import type {
  RecommendationRequest,
  RecommendationResponse,
  ScoredTemplate,
  ValidateInputsRequest,
  ValidationResult,
} from "@/lib/reports/recommendation-schema";

// ─── Weight Configuration ────────────────────────────────────

const WEIGHTS = {
  tradeMatch: 0.25,
  damageMatch: 0.2,
  intentMatch: 0.25,
  propertyMatch: 0.1,
  dataReadiness: 0.1,
  aiWeight: 0.1,
} as const;

const ENGINE_VERSION = "1.0.0";

// ─── Score Helpers ───────────────────────────────────────────

function scoreArrayMatch<T>(supported: T[], requested: T | undefined): number {
  if (!requested) return 50; // neutral — no signal
  if (supported.length === 0) return 30; // template is universal, mild penalty
  return supported.includes(requested) ? 100 : 0;
}

function scoreDataReadiness(template: TemplateDefinition, req: RecommendationRequest): number {
  let score = 100;
  let penalties = 0;
  let checks = 0;

  if (template.requiresPhotos) {
    checks++;
    if (req.hasPhotos === false) penalties++;
  }
  if (template.requiresMeasurements) {
    checks++;
    if (req.hasMeasurements === false) penalties++;
  }
  if (template.requiresPricing) {
    checks++;
    if (req.hasPricing === false) penalties++;
  }

  if (checks === 0) return 100;
  score = Math.round(((checks - penalties) / checks) * 100);
  return Math.max(0, score);
}

function getMissingInputs(template: TemplateDefinition, req: RecommendationRequest): string[] {
  const missing: string[] = [];
  if (template.requiresPhotos && req.hasPhotos === false) {
    missing.push("Photos required");
  }
  if (template.requiresMeasurements && req.hasMeasurements === false) {
    missing.push("Measurements required");
  }
  if (template.requiresPricing && req.hasPricing === false) {
    missing.push("Pricing data required");
  }
  return missing;
}

function buildRationale(
  template: TemplateDefinition,
  breakdown: ScoredTemplate["scoreBreakdown"],
  req: RecommendationRequest
): string {
  const parts: string[] = [];

  if (breakdown.tradeMatch === 100 && req.trade) {
    parts.push(`Perfect match for ${req.trade} work`);
  }
  if (breakdown.damageMatch === 100 && req.damageType) {
    parts.push(`designed for ${req.damageType} damage`);
  }
  if (breakdown.intentMatch === 100 && req.intent) {
    parts.push(`built for ${req.intent.replace(/_/g, " ")}`);
  }
  if (breakdown.dataReadiness === 100) {
    parts.push("all required data available");
  } else if (breakdown.dataReadiness < 50) {
    parts.push("some required data is missing");
  }

  if (parts.length === 0) {
    parts.push(template.bestFor);
  }

  return parts.join("; ") + ".";
}

// ─── Main Scoring Function ───────────────────────────────────

function scoreTemplate(template: TemplateDefinition, req: RecommendationRequest): ScoredTemplate {
  const tradeMatch = scoreArrayMatch(template.supportedTrades, req.trade as TradeType);
  const damageMatch = scoreArrayMatch(template.supportedDamageTypes, req.damageType as DamageType);
  const intentMatch = scoreArrayMatch(template.supportedIntents, req.intent as JobIntent);
  const propertyMatch = scoreArrayMatch(
    template.supportedPropertyTypes,
    req.propertyType as PropertyType
  );
  const dataReadiness = scoreDataReadiness(template, req);
  const aiWeight = template.aiSelectionWeight;

  const totalScore = Math.round(
    tradeMatch * WEIGHTS.tradeMatch +
      damageMatch * WEIGHTS.damageMatch +
      intentMatch * WEIGHTS.intentMatch +
      propertyMatch * WEIGHTS.propertyMatch +
      dataReadiness * WEIGHTS.dataReadiness +
      aiWeight * WEIGHTS.aiWeight
  );

  const breakdown = {
    tradeMatch,
    damageMatch,
    intentMatch,
    propertyMatch,
    dataReadiness,
    aiWeight,
  };

  return {
    templateId: template.id,
    slug: template.slug,
    title: template.title,
    description: template.description,
    styleCategory: template.styleCategory,
    audience: template.audience,
    bestFor: template.bestFor,
    score: Math.min(100, Math.max(0, totalScore)),
    rationale: buildRationale(template, breakdown, req),
    scoreBreakdown: breakdown,
    missingInputs: getMissingInputs(template, req),
    thumbnailUrl: template.imageMapping.cardThumbnail,
  };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Score and rank all templates against the given request context.
 * Returns a RecommendationResponse with sorted results.
 */
export function recommendTemplates(req: RecommendationRequest): RecommendationResponse {
  const start = performance.now();

  // Filter by style if provided
  let candidates: TemplateDefinition[];
  if (req.styleCategory) {
    candidates = getTemplatesByStyle(req.styleCategory as StyleCategory);
  } else {
    candidates = [...ALL_TEMPLATES];
  }

  const totalConsidered = candidates.length;

  // Score all candidates
  const scored = candidates
    .map((t) => scoreTemplate(t, req))
    .sort((a, b) => b.score - a.score)
    .slice(0, req.limit ?? 5);

  const processingTimeMs = Math.round(performance.now() - start);

  return {
    recommendations: scored,
    topPick: scored.length > 0 ? scored[0] : null,
    totalConsidered,
    filteredByStyle: req.styleCategory ?? null,
    processingTimeMs,
    engineVersion: ENGINE_VERSION,
  };
}

/**
 * Get quick-preview options for a style category with optional trade filter.
 * Lighter than full recommendation — no scoring, just filtered list.
 */
export function previewTemplateOptions(
  styleCategory: StyleCategory,
  trade?: TradeType,
  limit = 10
) {
  let templates = getTemplatesByStyle(styleCategory);

  if (trade) {
    const tradeFiltered = templates.filter((t) => t.supportedTrades.includes(trade));
    // Fall back to all if trade filter returns nothing
    if (tradeFiltered.length > 0) templates = tradeFiltered;
  }

  return templates.slice(0, limit).map((t) => ({
    templateId: t.id,
    slug: t.slug,
    title: t.title,
    bestFor: t.bestFor,
    audience: t.audience,
    thumbnailUrl: t.imageMapping.cardThumbnail,
    supportedTrades: t.supportedTrades,
    supportedDamageTypes: t.supportedDamageTypes,
  }));
}

/**
 * Validate whether the user has all required inputs for a given template.
 */
export function validateGenerationInputs(req: ValidateInputsRequest): ValidationResult {
  const template = ALL_TEMPLATES.find((t) => t.id === req.templateId);

  if (!template) {
    return {
      templateId: req.templateId,
      templateTitle: "Unknown Template",
      isReady: false,
      readinessScore: 0,
      missingRequired: [
        {
          field: "templateId",
          label: "Template not found in registry",
          importance: "required",
        },
      ],
      suggestions: ["Select a valid template from the marketplace."],
    };
  }

  const missing: ValidationResult["missingRequired"] = [];
  const suggestions: string[] = [];

  // Required checks
  if (template.requiresPhotos && !req.hasPhotos) {
    missing.push({
      field: "photos",
      label: "Field photos",
      importance: "required",
    });
    suggestions.push("Upload damage photos from the field for a stronger report.");
  }

  if (template.requiresMeasurements && !req.hasMeasurements) {
    missing.push({
      field: "measurements",
      label: "Property measurements",
      importance: "required",
    });
    suggestions.push("Add roof or property measurements for accurate scope calculations.");
  }

  if (template.requiresPricing && !req.hasPricing) {
    missing.push({
      field: "pricing",
      label: "Pricing / line item data",
      importance: "required",
    });
    suggestions.push("Enter pricing or import an estimate for cost breakdowns.");
  }

  // Recommended checks
  if (template.capabilities.weatherVerification && !req.hasWeatherData) {
    missing.push({
      field: "weather",
      label: "Weather verification data",
      importance: "recommended",
    });
    suggestions.push("Run a weather report to strengthen causation evidence.");
  }

  if (template.capabilities.claimLanguage && !req.hasClaimData) {
    missing.push({
      field: "claim",
      label: "Claim details (carrier, policy, dates)",
      importance: "recommended",
    });
    suggestions.push("Add claim details for carrier-specific language in the report.");
  }

  // Photo gallery recommended even if not required
  if (template.capabilities.photoGallery && !req.hasPhotos && !template.requiresPhotos) {
    missing.push({
      field: "photos",
      label: "Photos (optional but recommended)",
      importance: "optional",
    });
    suggestions.push("Adding photos will significantly improve report quality.");
  }

  // Calculate readiness
  const requiredCount = missing.filter((m) => m.importance === "required").length;
  const totalRequired = [
    template.requiresPhotos,
    template.requiresMeasurements,
    template.requiresPricing,
  ].filter(Boolean).length;

  const readinessScore =
    totalRequired === 0 ? 100 : Math.round(((totalRequired - requiredCount) / totalRequired) * 100);

  return {
    templateId: template.id,
    templateTitle: template.title,
    isReady: requiredCount === 0,
    readinessScore,
    missingRequired: missing,
    suggestions,
  };
}

/**
 * Get a quick "best match" for a given intent + trade combo.
 * Returns the single highest-scoring template ID or null.
 */
export function quickMatch(
  intent: JobIntent,
  trade?: TradeType,
  styleCategory?: StyleCategory
): string | null {
  const result = recommendTemplates({
    intent,
    trade,
    styleCategory,
    limit: 1,
  });
  return result.topPick?.templateId ?? null;
}
