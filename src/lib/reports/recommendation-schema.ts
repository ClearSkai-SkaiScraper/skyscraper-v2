import { z } from "zod";

/**
 * AI Template Recommendation Engine — Schemas
 *
 * Defines request/response contracts for the recommendation API.
 * The engine scores every template against user context and returns
 * ranked results with rationale explanations.
 */

// ─── Request Schema ──────────────────────────────────────────

export const RecommendationRequestSchema = z.object({
  /** Which style the user already picked (Insurance / Retail / Sales Material) */
  styleCategory: z
    .enum(["Insurance", "Retail", "Sales Material"])
    .optional()
    .describe("If provided, only templates in this style are scored"),

  /** Trade the contractor operates in */
  trade: z
    .enum([
      "roofing",
      "restoration",
      "windows",
      "solar",
      "paint",
      "general_contracting",
      "siding",
      "gutters",
      "hvac",
      "plumbing",
      "electrical",
      "flooring",
      "interior",
    ])
    .optional(),

  /** Type of damage being documented */
  damageType: z
    .enum([
      "hail",
      "wind",
      "water",
      "fire",
      "smoke",
      "mold",
      "lightning",
      "wear",
      "coating_failure",
      "leak",
      "storm",
      "tornado",
      "impact",
      "structural",
    ])
    .optional(),

  /** What the user intends to do with the document */
  intent: z
    .enum([
      "claim_support",
      "homeowner_estimate",
      "sales_pitch",
      "inspection_summary",
      "supplement",
      "rebuttal",
      "invoice",
      "comparison",
      "warranty",
      "authorization",
      "maintenance",
      "litigation",
      "appraisal",
    ])
    .optional(),

  /** Property type */
  propertyType: z
    .enum(["residential", "commercial", "multi_family", "industrial", "mixed"])
    .optional(),

  /** Does the user have photos available? */
  hasPhotos: z.boolean().optional(),

  /** Does the user have measurements? */
  hasMeasurements: z.boolean().optional(),

  /** Does the user have pricing data? */
  hasPricing: z.boolean().optional(),

  /** Free-text description of the job / situation */
  jobDescription: z.string().max(500).optional(),

  /** Claim ID — if set, engine can pull context from the claim */
  claimId: z.string().optional(),

  /** Max results to return */
  limit: z.number().int().min(1).max(10).default(5),
});

export type RecommendationRequest = z.infer<typeof RecommendationRequestSchema>;

// ─── Scored Template Result ──────────────────────────────────

export const ScoredTemplateSchema = z.object({
  /** Template ID from the registry */
  templateId: z.string(),
  /** Template slug for URL routing */
  slug: z.string(),
  /** Template title */
  title: z.string(),
  /** Template description */
  description: z.string(),
  /** Style category */
  styleCategory: z.string(),
  /** Audience */
  audience: z.string(),
  /** Best-for tagline */
  bestFor: z.string(),

  /** Total recommendation score (0–100) */
  score: z.number().min(0).max(100),

  /** Human-readable rationale for why this template was recommended */
  rationale: z.string(),

  /** Individual dimension scores (for UI breakdown) */
  scoreBreakdown: z.object({
    tradeMatch: z.number().min(0).max(100),
    damageMatch: z.number().min(0).max(100),
    intentMatch: z.number().min(0).max(100),
    propertyMatch: z.number().min(0).max(100),
    dataReadiness: z.number().min(0).max(100),
    aiWeight: z.number().min(0).max(100),
  }),

  /** Which requirements the user doesn't yet meet */
  missingInputs: z.array(z.string()),

  /** Thumbnail URL */
  thumbnailUrl: z.string(),
});

export type ScoredTemplate = z.infer<typeof ScoredTemplateSchema>;

// ─── Response Schema ─────────────────────────────────────────

export const RecommendationResponseSchema = z.object({
  /** Ranked template recommendations */
  recommendations: z.array(ScoredTemplateSchema),

  /** The top pick */
  topPick: ScoredTemplateSchema.nullable(),

  /** Total templates considered */
  totalConsidered: z.number(),

  /** Style category filter applied */
  filteredByStyle: z.string().nullable(),

  /** Processing time in ms */
  processingTimeMs: z.number(),

  /** Engine version for cache-busting */
  engineVersion: z.string(),
});

export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;

// ─── Preview Template Options (lighter endpoint) ─────────────

export const PreviewOptionsRequestSchema = z.object({
  styleCategory: z.enum(["Insurance", "Retail", "Sales Material"]),
  trade: z
    .enum([
      "roofing",
      "restoration",
      "windows",
      "solar",
      "paint",
      "general_contracting",
      "siding",
      "gutters",
      "hvac",
      "plumbing",
      "electrical",
      "flooring",
      "interior",
    ])
    .optional(),
  limit: z.number().int().min(1).max(20).default(10),
});

export type PreviewOptionsRequest = z.infer<typeof PreviewOptionsRequestSchema>;

export const PreviewOptionSchema = z.object({
  templateId: z.string(),
  slug: z.string(),
  title: z.string(),
  bestFor: z.string(),
  audience: z.string(),
  thumbnailUrl: z.string(),
  supportedTrades: z.array(z.string()),
  supportedDamageTypes: z.array(z.string()),
});

export type PreviewOption = z.infer<typeof PreviewOptionSchema>;

// ─── Validate Generation Inputs ──────────────────────────────

export const ValidateInputsRequestSchema = z.object({
  templateId: z.string(),
  hasPhotos: z.boolean().default(false),
  hasMeasurements: z.boolean().default(false),
  hasPricing: z.boolean().default(false),
  hasWeatherData: z.boolean().default(false),
  hasClaimData: z.boolean().default(false),
});

export type ValidateInputsRequest = z.infer<typeof ValidateInputsRequestSchema>;

export const ValidationResultSchema = z.object({
  templateId: z.string(),
  templateTitle: z.string(),
  isReady: z.boolean(),
  /** 0–100 readiness score */
  readinessScore: z.number(),
  /** What's missing */
  missingRequired: z.array(
    z.object({
      field: z.string(),
      label: z.string(),
      importance: z.enum(["required", "recommended", "optional"]),
    })
  ),
  /** Suggestions to improve the report */
  suggestions: z.array(z.string()),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;
