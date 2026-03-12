/**
 * Template Registry — Complete Marketplace
 * 27 professional templates organized under 3 style categories:
 *   Insurance — Carrier-facing documentation
 *   Retail — Homeowner-facing documents
 *   Sales Material — Pre-sale and presentation docs
 *
 * Legacy `category` preserved for backward compatibility.
 * New `styleCategory` is the canonical UX grouping.
 *
 * Extended metadata powers the AI recommendation engine:
 *   supportedTrades, supportedDamageTypes, supportedIntents,
 *   supportedPropertyTypes, tone, capabilities, imageMapping,
 *   aiSelectionWeight, recommendedWhen, avoidWhen
 */

// ─── Style Categories (new top-level UX) ─────────────────────
export const STYLE_CATEGORIES = {
  INSURANCE: "Insurance",
  RETAIL: "Retail",
  SALES: "Sales Material",
} as const;

export type StyleCategory = (typeof STYLE_CATEGORIES)[keyof typeof STYLE_CATEGORIES];

// ─── Legacy Subcategories (preserved for backward compat / detail badges) ──
export const TEMPLATE_CATEGORIES = {
  ROOFING: "Roofing",
  RESTORATION: "Restoration",
  SUPPLEMENTS: "Supplements",
  RETAIL: "Retail & Quotes",
  LEGAL: "Legal & Appraisal",
  SPECIALTY: "Specialty Reports",
} as const;

// ─── Structured Classification Types ─────────────────────────
export type TradeType =
  | "roofing"
  | "restoration"
  | "windows"
  | "solar"
  | "paint"
  | "general_contracting"
  | "siding"
  | "gutters"
  | "hvac"
  | "plumbing"
  | "electrical"
  | "flooring"
  | "interior";

export type DamageType =
  | "hail"
  | "wind"
  | "water"
  | "fire"
  | "smoke"
  | "mold"
  | "lightning"
  | "wear"
  | "coating_failure"
  | "leak"
  | "storm"
  | "tornado"
  | "impact"
  | "structural";

export type JobIntent =
  | "claim_support"
  | "homeowner_estimate"
  | "sales_pitch"
  | "inspection_summary"
  | "supplement"
  | "rebuttal"
  | "invoice"
  | "comparison"
  | "warranty"
  | "authorization"
  | "maintenance"
  | "litigation"
  | "appraisal";

export type PropertyType = "residential" | "commercial" | "multi_family" | "industrial" | "mixed";

export type ToneType =
  | "technical"
  | "homeowner_friendly"
  | "persuasive"
  | "legal_supportive"
  | "premium";

// ─── Report Capability Flags ─────────────────────────────────
export interface TemplateCapabilities {
  pricingTables: boolean;
  lineItems: boolean;
  photoGallery: boolean;
  aiNarrative: boolean;
  scopeOfWork: boolean;
  claimLanguage: boolean;
  supplementLanguage: boolean;
  comparisonMatrix: boolean;
  signatureBlock: boolean;
  financingSection: boolean;
  beforeAfterLayout: boolean;
  executiveSummary: boolean;
  weatherVerification: boolean;
  codeCompliance: boolean;
}

// ─── Image Mapping ───────────────────────────────────────────
export interface TemplateImageMapping {
  /** Card thumbnail in marketplace */
  cardThumbnail: string;
  /** Preview hero image */
  previewHero: string;
  /** PDF cover/header image (if used) */
  pdfCoverImage: string;
  /** Category fallback if primary is missing */
  fallbackThumbnail: string;
  /** Visual theme notes for PDF styling */
  visualTheme: "evidence" | "polished" | "premium" | "technical" | "legal";
}

// ─── Template Definition ─────────────────────────────────────
export interface TemplateDefinition {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Top-level style bucket: Insurance | Retail | Sales Material */
  styleCategory: StyleCategory;
  /** Legacy subcategory for detail badges */
  category: string;
  tags: string[];
  thumbnailKey: string;
  previewMode: "claim" | "retail";
  intendedUse: string;
  version: string;
  /** Audience the report is built for */
  audience: "carrier" | "homeowner" | "prospect" | "contractor";
  /** Short "best for" tagline shown on cards */
  bestFor: string;

  // ── Extended metadata for AI recommendation engine ──
  /** Trades this template is relevant for */
  supportedTrades: TradeType[];
  /** Damage types this template handles */
  supportedDamageTypes: DamageType[];
  /** Job intents this template serves */
  supportedIntents: JobIntent[];
  /** Property types this template applies to */
  supportedPropertyTypes: PropertyType[];
  /** Document tone */
  tone: ToneType;
  /** Whether the report needs pricing/cost data */
  requiresPricing: boolean;
  /** Whether the report needs photos */
  requiresPhotos: boolean;
  /** Whether the report needs measurements */
  requiresMeasurements: boolean;
  /** Natural-language hint for when to recommend this template */
  recommendedWhen: string;
  /** Natural-language hint for when NOT to recommend this template */
  avoidWhen: string;
  /** Capability flags for section orchestration */
  capabilities: TemplateCapabilities;
  /** Image mapping for marketplace cards, previews, and PDF covers */
  imageMapping: TemplateImageMapping;
  /** AI selection weight — higher = preferred when scores tie (0–100) */
  aiSelectionWeight: number;
}

// ─── Style-based image fallbacks ─────────────────────────────
const STYLE_FALLBACK_IMAGES: Record<StyleCategory, string> = {
  [STYLE_CATEGORIES.INSURANCE]: "/template-thumbs/legal-appraisal.svg",
  [STYLE_CATEGORIES.RETAIL]: "/template-thumbs/general-contractor-estimate.svg",
  [STYLE_CATEGORIES.SALES]: "/template-thumbs/specialty-reports.svg",
};

/** Get the fallback thumbnail for a given style */
export function getStyleFallbackImage(style: StyleCategory): string {
  return STYLE_FALLBACK_IMAGES[style] || "/template-thumbs/general-contractor-estimate.svg";
}

/** Build image mapping for a template with fallback logic */
function img(
  slug: string,
  style: StyleCategory,
  theme: TemplateImageMapping["visualTheme"] = "technical"
): TemplateImageMapping {
  return {
    cardThumbnail: `/api/templates/${slug}/thumbnail`,
    previewHero: `/api/templates/${slug}/thumbnail`,
    pdfCoverImage: `/templates/${slug}/cover.png`,
    fallbackThumbnail: STYLE_FALLBACK_IMAGES[style],
    visualTheme: theme,
  };
}

/** Default capabilities — all false, override per template */
function caps(overrides: Partial<TemplateCapabilities> = {}): TemplateCapabilities {
  return {
    pricingTables: false,
    lineItems: false,
    photoGallery: false,
    aiNarrative: false,
    scopeOfWork: false,
    claimLanguage: false,
    supplementLanguage: false,
    comparisonMatrix: false,
    signatureBlock: false,
    financingSection: false,
    beforeAfterLayout: false,
    executiveSummary: false,
    weatherVerification: false,
    codeCompliance: false,
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════
// ALL TEMPLATES — 27 total (Vandalism & Break-In removed)
// Full metadata for AI recommendation engine + image mapping
// ═════════════════════════════════════════════════════════════

export const ALL_TEMPLATES: TemplateDefinition[] = [
  // ═══════════════════════════════════════════════════════════
  // INSURANCE — Carrier-Facing Documentation (15 templates)
  // ═══════════════════════════════════════════════════════════
  {
    id: "roof-damage-comp",
    slug: "comprehensive-roof-damage",
    title: "Comprehensive Roof Damage Report",
    description:
      "Complete roof inspection with weather verification, code compliance, and detailed scope. The gold standard for hail, wind, and storm claims.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.ROOFING,
    tags: ["roof", "storm", "hail", "wind", "inspection"],
    thumbnailKey: "templates/roof-damage-comp/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "2.0.0",
    audience: "carrier",
    bestFor: "Storm & hail damage claims",
    supportedTrades: ["roofing", "general_contracting"],
    supportedDamageTypes: ["hail", "wind", "storm", "impact"],
    supportedIntents: ["claim_support"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "technical",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Comprehensive storm or hail damage claim with field photos and measurements available",
    avoidWhen: "Retail-only estimates, no carrier involvement, no damage documentation",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      scopeOfWork: true,
      claimLanguage: true,
      executiveSummary: true,
      weatherVerification: true,
      codeCompliance: true,
    }),
    imageMapping: img("comprehensive-roof-damage", STYLE_CATEGORIES.INSURANCE, "evidence"),
    aiSelectionWeight: 90,
  },
  {
    id: "hail-certification",
    slug: "hail-damage-certification",
    title: "Hail Damage Certification",
    description:
      "Certified hail damage assessment with hailstone size verification and impact pattern analysis. HAAG-certified methodology for indisputable documentation.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.ROOFING,
    tags: ["hail", "certification", "roof", "storm"],
    thumbnailKey: "templates/hail-certification/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.5.0",
    audience: "carrier",
    bestFor: "Hail damage certification & carrier submission",
    supportedTrades: ["roofing"],
    supportedDamageTypes: ["hail", "impact"],
    supportedIntents: ["claim_support"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "technical",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Hail-specific claim requiring HAAG-style certified documentation with impact measurements",
    avoidWhen: "Non-hail damage, wind-only events, retail estimates",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      claimLanguage: true,
      executiveSummary: true,
      weatherVerification: true,
    }),
    imageMapping: img("hail-damage-certification", STYLE_CATEGORIES.INSURANCE, "evidence"),
    aiSelectionWeight: 85,
  },
  {
    id: "water-damage-assessment",
    slug: "water-damage-assessment",
    title: "Water Damage Assessment Report",
    description:
      "Comprehensive water intrusion report with moisture mapping, mold detection, and drying protocols. IICRC S500 compliant documentation.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.RESTORATION,
    tags: ["water", "moisture", "mold", "drying", "iicrc"],
    thumbnailKey: "templates/water-damage-assessment/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "2.0.0",
    audience: "carrier",
    bestFor: "Water intrusion & moisture claims",
    supportedTrades: ["restoration", "plumbing"],
    supportedDamageTypes: ["water", "mold", "leak"],
    supportedIntents: ["claim_support"],
    supportedPropertyTypes: ["residential", "commercial", "multi_family"],
    tone: "technical",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen: "Water damage or intrusion event with moisture readings and/or mold concerns",
    avoidWhen: "Dry damage, wind-only events, retail estimates without water involvement",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      scopeOfWork: true,
      claimLanguage: true,
      executiveSummary: true,
      beforeAfterLayout: true,
    }),
    imageMapping: img("water-damage-assessment", STYLE_CATEGORIES.INSURANCE, "evidence"),
    aiSelectionWeight: 85,
  },
  {
    id: "fire-smoke-damage",
    slug: "fire-smoke-damage",
    title: "Fire & Smoke Damage Report",
    description:
      "Fire damage assessment with smoke penetration analysis, structural integrity review, and content inventory documentation.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.RESTORATION,
    tags: ["fire", "smoke", "structural", "contents"],
    thumbnailKey: "templates/fire-smoke-damage/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.8.0",
    audience: "carrier",
    bestFor: "Fire & smoke damage claims",
    supportedTrades: ["restoration", "general_contracting"],
    supportedDamageTypes: ["fire", "smoke", "structural"],
    supportedIntents: ["claim_support"],
    supportedPropertyTypes: ["residential", "commercial", "multi_family", "industrial"],
    tone: "technical",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Fire or smoke damage event requiring structural assessment and content inventory",
    avoidWhen: "Non-fire damage, water-only events, retail estimates",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      scopeOfWork: true,
      claimLanguage: true,
      executiveSummary: true,
      beforeAfterLayout: true,
    }),
    imageMapping: img("fire-smoke-damage", STYLE_CATEGORIES.INSURANCE, "evidence"),
    aiSelectionWeight: 80,
  },
  {
    id: "wind-damage-assessment",
    slug: "wind-damage-assessment",
    title: "Wind Damage Assessment",
    description:
      "Wind and tornado damage report with structural analysis, debris impact assessment, and wind speed correlation.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.RESTORATION,
    tags: ["wind", "tornado", "structural", "debris"],
    thumbnailKey: "templates/wind-damage-assessment/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.5.0",
    audience: "carrier",
    bestFor: "Wind & tornado damage documentation",
    supportedTrades: ["roofing", "restoration", "general_contracting", "siding"],
    supportedDamageTypes: ["wind", "tornado", "structural", "impact"],
    supportedIntents: ["claim_support"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "technical",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Wind or tornado damage requiring structural analysis and wind speed verification",
    avoidWhen: "Hail-only events (use hail cert instead), retail estimates, non-wind damage",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      scopeOfWork: true,
      claimLanguage: true,
      executiveSummary: true,
      weatherVerification: true,
    }),
    imageMapping: img("wind-damage-assessment", STYLE_CATEGORIES.INSURANCE, "evidence"),
    aiSelectionWeight: 80,
  },
  {
    id: "mold-remediation",
    slug: "mold-remediation-protocol",
    title: "Mold Remediation Protocol",
    description:
      "Mold inspection and remediation protocol with air quality testing, containment procedures, and clearance testing plan. IICRC S520 compliant.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.RESTORATION,
    tags: ["mold", "remediation", "air-quality", "iicrc"],
    thumbnailKey: "templates/mold-remediation/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.6.0",
    audience: "carrier",
    bestFor: "Mold remediation & air quality claims",
    supportedTrades: ["restoration"],
    supportedDamageTypes: ["mold", "water"],
    supportedIntents: ["claim_support"],
    supportedPropertyTypes: ["residential", "commercial", "multi_family"],
    tone: "technical",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Mold discovered requiring remediation protocol with air quality testing documentation",
    avoidWhen: "No mold present, dry damage, exterior-only damage",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      scopeOfWork: true,
      claimLanguage: true,
      executiveSummary: true,
    }),
    imageMapping: img("mold-remediation-protocol", STYLE_CATEGORIES.INSURANCE, "technical"),
    aiSelectionWeight: 75,
  },
  {
    id: "lightning-strike",
    slug: "lightning-strike-assessment",
    title: "Lightning Strike Assessment",
    description:
      "Lightning damage evaluation including electrical system testing, surge damage documentation, and fire investigation.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.RESTORATION,
    tags: ["lightning", "electrical", "surge", "fire"],
    thumbnailKey: "templates/lightning-strike/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.2.0",
    audience: "carrier",
    bestFor: "Lightning & electrical surge claims",
    supportedTrades: ["restoration", "electrical", "roofing"],
    supportedDamageTypes: ["lightning", "fire", "structural"],
    supportedIntents: ["claim_support"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "technical",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: false,
    recommendedWhen:
      "Lightning strike event with electrical system damage or fire resulting from lightning",
    avoidWhen: "Non-electrical damage, standard storms without lightning evidence",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      claimLanguage: true,
      executiveSummary: true,
      weatherVerification: true,
    }),
    imageMapping: img("lightning-strike-assessment", STYLE_CATEGORIES.INSURANCE, "evidence"),
    aiSelectionWeight: 70,
  },
  {
    id: "weather-correlation",
    slug: "weather-correlation-premium",
    title: "Weather Correlation Report",
    description:
      "Advanced weather verification with NOAA data, storm tracking, and causation analysis. The strongest evidence you can attach to a claim.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.RESTORATION,
    tags: ["weather", "noaa", "storm", "verification"],
    thumbnailKey: "templates/weather-correlation-premium/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "2.2.0",
    audience: "carrier",
    bestFor: "Weather verification & causation proof",
    supportedTrades: ["roofing", "restoration", "general_contracting", "siding"],
    supportedDamageTypes: ["hail", "wind", "storm", "tornado", "lightning"],
    supportedIntents: ["claim_support", "supplement", "rebuttal"],
    supportedPropertyTypes: ["residential", "commercial", "multi_family", "industrial"],
    tone: "technical",
    requiresPricing: false,
    requiresPhotos: false,
    requiresMeasurements: false,
    recommendedWhen:
      "Carrier is disputing weather event causation — attach this as standalone evidence",
    avoidWhen: "Retail-only flows, no carrier dispute, no weather-related damage",
    capabilities: caps({
      aiNarrative: true,
      claimLanguage: true,
      executiveSummary: true,
      weatherVerification: true,
    }),
    imageMapping: img("weather-correlation-premium", STYLE_CATEGORIES.INSURANCE, "technical"),
    aiSelectionWeight: 80,
  },
  {
    id: "supplement-line-item",
    slug: "supplement-line-item-premium",
    title: "Line Item Supplement Request",
    description:
      "Detailed supplement documentation with line item justifications, supporting photos, and pricing comparisons for underpaid claims.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.SUPPLEMENTS,
    tags: ["supplement", "line-item", "justification", "pricing"],
    thumbnailKey: "templates/supplement-line-item-premium/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.9.0",
    audience: "carrier",
    bestFor: "Supplement requests & line item justification",
    supportedTrades: [
      "roofing",
      "restoration",
      "general_contracting",
      "siding",
      "gutters",
      "interior",
    ],
    supportedDamageTypes: ["hail", "wind", "water", "fire", "storm"],
    supportedIntents: ["supplement"],
    supportedPropertyTypes: ["residential", "commercial", "multi_family"],
    tone: "technical",
    requiresPricing: true,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Claim underpaid — need to submit supplement with line item justifications and cost comparisons",
    avoidWhen: "Initial claim submission, retail estimates, no pricing variance to dispute",
    capabilities: caps({
      pricingTables: true,
      lineItems: true,
      photoGallery: true,
      aiNarrative: true,
      claimLanguage: true,
      supplementLanguage: true,
      executiveSummary: true,
    }),
    imageMapping: img("supplement-line-item-premium", STYLE_CATEGORIES.INSURANCE, "technical"),
    aiSelectionWeight: 85,
  },
  {
    id: "carrier-rebuttal",
    slug: "carrier-rebuttal-premium",
    title: "Carrier Rebuttal Letter",
    description:
      "Professional carrier rebuttal with technical analysis, building code references, and expert opinions. Built to win disputes.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.SUPPLEMENTS,
    tags: ["carrier", "rebuttal", "letter", "expert"],
    thumbnailKey: "templates/carrier-rebuttal-premium/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "2.0.0",
    audience: "carrier",
    bestFor: "Carrier dispute rebuttals",
    supportedTrades: ["roofing", "restoration", "general_contracting"],
    supportedDamageTypes: ["hail", "wind", "water", "fire", "storm"],
    supportedIntents: ["rebuttal"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "legal_supportive",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: false,
    recommendedWhen:
      "Carrier denied or underpaid a claim and you need a formal rebuttal with technical references",
    avoidWhen: "Initial claim submission, supplement requests, retail estimates",
    capabilities: caps({
      aiNarrative: true,
      claimLanguage: true,
      executiveSummary: true,
      codeCompliance: true,
    }),
    imageMapping: img("carrier-rebuttal-premium", STYLE_CATEGORIES.INSURANCE, "legal"),
    aiSelectionWeight: 80,
  },
  {
    id: "depreciation-analysis",
    slug: "depreciation-analysis-premium",
    title: "Depreciation Analysis Report",
    description:
      "Detailed depreciation challenge with material lifecycle analysis and actual cash value review. Recover what your client is owed.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.SUPPLEMENTS,
    tags: ["depreciation", "acv", "rcv", "analysis"],
    thumbnailKey: "templates/depreciation-analysis-premium/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.7.0",
    audience: "carrier",
    bestFor: "Depreciation challenges & ACV recovery",
    supportedTrades: ["roofing", "restoration", "general_contracting"],
    supportedDamageTypes: ["hail", "wind", "water", "fire", "wear"],
    supportedIntents: ["supplement", "rebuttal"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "technical",
    requiresPricing: true,
    requiresPhotos: false,
    requiresMeasurements: false,
    recommendedWhen:
      "Carrier applied excessive depreciation — need ACV vs RCV analysis with material lifecycle data",
    avoidWhen: "No depreciation dispute, retail flows, initial claims",
    capabilities: caps({
      pricingTables: true,
      lineItems: true,
      aiNarrative: true,
      claimLanguage: true,
      supplementLanguage: true,
      executiveSummary: true,
      comparisonMatrix: true,
    }),
    imageMapping: img("depreciation-analysis-premium", STYLE_CATEGORIES.INSURANCE, "technical"),
    aiSelectionWeight: 75,
  },
  {
    id: "code-upgrade-justification",
    slug: "code-upgrade-justification",
    title: "Code Upgrade Justification",
    description:
      "Building code upgrade documentation with ordinance references and cost breakdowns. Required when repairs must meet current code.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.SUPPLEMENTS,
    tags: ["code", "upgrade", "ordinance", "compliance"],
    thumbnailKey: "templates/code-upgrade-justification/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.3.0",
    audience: "carrier",
    bestFor: "Code upgrade & ordinance compliance",
    supportedTrades: ["roofing", "general_contracting", "electrical", "plumbing", "hvac"],
    supportedDamageTypes: ["hail", "wind", "fire", "storm", "structural"],
    supportedIntents: ["supplement", "claim_support"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "legal_supportive",
    requiresPricing: true,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Repairs must meet current building code that differs from original construction — need ordinance justification",
    avoidWhen: "No code change required, retail estimates, no carrier involvement",
    capabilities: caps({
      pricingTables: true,
      lineItems: true,
      photoGallery: true,
      aiNarrative: true,
      claimLanguage: true,
      supplementLanguage: true,
      codeCompliance: true,
    }),
    imageMapping: img("code-upgrade-justification", STYLE_CATEGORIES.INSURANCE, "technical"),
    aiSelectionWeight: 70,
  },
  {
    id: "hidden-damage-report",
    slug: "hidden-damage-report",
    title: "Hidden Damage Disclosure",
    description:
      "Documentation of concealed damage discovered during repairs with scope revision justification. Critical for mid-job supplement approval.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.SUPPLEMENTS,
    tags: ["hidden", "concealed", "discovery", "scope"],
    thumbnailKey: "templates/hidden-damage-report/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.1.0",
    audience: "carrier",
    bestFor: "Hidden damage discovery documentation",
    supportedTrades: ["roofing", "restoration", "general_contracting", "interior"],
    supportedDamageTypes: ["water", "mold", "structural", "fire", "wind"],
    supportedIntents: ["supplement"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "technical",
    requiresPricing: true,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Concealed damage found during active repairs — need mid-job supplement documentation",
    avoidWhen: "Pre-repair assessment, initial claim submission, retail estimates",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      scopeOfWork: true,
      claimLanguage: true,
      supplementLanguage: true,
      executiveSummary: true,
      beforeAfterLayout: true,
    }),
    imageMapping: img("hidden-damage-report", STYLE_CATEGORIES.INSURANCE, "evidence"),
    aiSelectionWeight: 70,
  },
  {
    id: "bad-faith-documentation",
    slug: "bad-faith-documentation",
    title: "Bad Faith Documentation",
    description:
      "Comprehensive bad faith claim documentation with timeline, policy violations, and damages. Your strongest escalation tool.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.LEGAL,
    tags: ["bad-faith", "documentation", "policy", "violations"],
    thumbnailKey: "templates/bad-faith-documentation/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.2.0",
    audience: "carrier",
    bestFor: "Bad faith escalation & carrier pressure",
    supportedTrades: ["roofing", "restoration", "general_contracting"],
    supportedDamageTypes: ["hail", "wind", "water", "fire", "storm"],
    supportedIntents: ["rebuttal", "litigation"],
    supportedPropertyTypes: ["residential", "commercial", "multi_family"],
    tone: "legal_supportive",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: false,
    recommendedWhen:
      "Carrier acting in bad faith — need timeline of delays, denials, and policy violations documented",
    avoidWhen: "Amicable claim resolution, initial submission, retail flows",
    capabilities: caps({ aiNarrative: true, claimLanguage: true, executiveSummary: true }),
    imageMapping: img("bad-faith-documentation", STYLE_CATEGORIES.INSURANCE, "legal"),
    aiSelectionWeight: 65,
  },
  {
    id: "pre-litigation-demand",
    slug: "pre-litigation-demand",
    title: "Pre-Litigation Demand Letter",
    description:
      "Professional demand letter with detailed claim summary, documentation references, and settlement terms. The last step before legal action.",
    styleCategory: STYLE_CATEGORIES.INSURANCE,
    category: TEMPLATE_CATEGORIES.LEGAL,
    tags: ["demand", "letter", "litigation", "settlement"],
    thumbnailKey: "templates/pre-litigation-demand/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.0.0",
    audience: "carrier",
    bestFor: "Pre-litigation demands & settlement pressure",
    supportedTrades: ["roofing", "restoration", "general_contracting"],
    supportedDamageTypes: ["hail", "wind", "water", "fire", "storm"],
    supportedIntents: ["litigation", "rebuttal"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "legal_supportive",
    requiresPricing: true,
    requiresPhotos: false,
    requiresMeasurements: false,
    recommendedWhen:
      "All claim negotiation exhausted — formal demand letter before attorney referral",
    avoidWhen: "Active claim negotiation, initial submission, retail flows, supplement stage",
    capabilities: caps({
      aiNarrative: true,
      claimLanguage: true,
      executiveSummary: true,
      signatureBlock: true,
    }),
    imageMapping: img("pre-litigation-demand", STYLE_CATEGORIES.INSURANCE, "legal"),
    aiSelectionWeight: 60,
  },

  // ═══════════════════════════════════════════════════════════
  // RETAIL — Homeowner-Facing Documents (7 templates)
  // ═══════════════════════════════════════════════════════════
  {
    id: "contractor-estimate",
    slug: "contractor-estimate-premium",
    title: "Professional Contractor Estimate",
    description:
      "Branded retail estimate for residential and commercial projects with detailed line items, material options, and financing information.",
    styleCategory: STYLE_CATEGORIES.RETAIL,
    category: TEMPLATE_CATEGORIES.RETAIL,
    tags: ["estimate", "quote", "retail", "contractor"],
    thumbnailKey: "templates/contractor-estimate-premium/thumbnail.png",
    previewMode: "retail",
    intendedUse: "retail",
    version: "2.3.0",
    audience: "homeowner",
    bestFor: "Professional estimates & pricing",
    supportedTrades: [
      "roofing",
      "restoration",
      "general_contracting",
      "siding",
      "gutters",
      "windows",
      "paint",
      "hvac",
      "plumbing",
      "electrical",
      "flooring",
      "interior",
    ],
    supportedDamageTypes: ["hail", "wind", "water", "fire", "wear", "storm"],
    supportedIntents: ["homeowner_estimate", "invoice"],
    supportedPropertyTypes: ["residential", "commercial", "multi_family"],
    tone: "homeowner_friendly",
    requiresPricing: true,
    requiresPhotos: false,
    requiresMeasurements: true,
    recommendedWhen:
      "Homeowner needs a professional branded estimate with line items, material options, and clear pricing",
    avoidWhen: "Insurance claim documentation, carrier-facing reports, supplement requests",
    capabilities: caps({
      pricingTables: true,
      lineItems: true,
      photoGallery: true,
      aiNarrative: true,
      scopeOfWork: true,
      signatureBlock: true,
      financingSection: true,
      executiveSummary: true,
    }),
    imageMapping: img("contractor-estimate-premium", STYLE_CATEGORIES.RETAIL, "polished"),
    aiSelectionWeight: 95,
  },
  {
    id: "roof-replacement-quote",
    slug: "roof-replacement-quote",
    title: "Roof Replacement Quote",
    description:
      "Detailed roof replacement quote with material options, warranty comparison, and payment terms. Clean and easy to understand for homeowners.",
    styleCategory: STYLE_CATEGORIES.RETAIL,
    category: TEMPLATE_CATEGORIES.RETAIL,
    tags: ["roof", "replacement", "quote", "warranty"],
    thumbnailKey: "templates/roof-replacement-quote/thumbnail.png",
    previewMode: "retail",
    intendedUse: "retail",
    version: "1.8.0",
    audience: "homeowner",
    bestFor: "Roof replacement proposals",
    supportedTrades: ["roofing"],
    supportedDamageTypes: ["hail", "wind", "wear", "storm"],
    supportedIntents: ["homeowner_estimate"],
    supportedPropertyTypes: ["residential"],
    tone: "homeowner_friendly",
    requiresPricing: true,
    requiresPhotos: false,
    requiresMeasurements: true,
    recommendedWhen:
      "Roofing-specific replacement quote for homeowner with material options and warranty comparison",
    avoidWhen: "Non-roofing work, insurance claim documentation, multi-trade projects",
    capabilities: caps({
      pricingTables: true,
      lineItems: true,
      scopeOfWork: true,
      signatureBlock: true,
      financingSection: true,
      comparisonMatrix: true,
    }),
    imageMapping: img("roof-replacement-quote", STYLE_CATEGORIES.RETAIL, "polished"),
    aiSelectionWeight: 85,
  },
  {
    id: "maintenance-proposal",
    slug: "maintenance-proposal",
    title: "Preventive Maintenance Proposal",
    description:
      "Comprehensive maintenance plan proposal with inspection schedule, service agreement, and recurring revenue structure.",
    styleCategory: STYLE_CATEGORIES.RETAIL,
    category: TEMPLATE_CATEGORIES.RETAIL,
    tags: ["maintenance", "preventive", "service", "agreement"],
    thumbnailKey: "templates/maintenance-proposal/thumbnail.png",
    previewMode: "retail",
    intendedUse: "retail",
    version: "1.0.0",
    audience: "homeowner",
    bestFor: "Maintenance agreements & recurring service",
    supportedTrades: ["roofing", "hvac", "general_contracting", "gutters"],
    supportedDamageTypes: ["wear"],
    supportedIntents: ["maintenance", "homeowner_estimate"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "homeowner_friendly",
    requiresPricing: true,
    requiresPhotos: false,
    requiresMeasurements: false,
    recommendedWhen:
      "Selling a maintenance contract or service agreement to a homeowner or building owner",
    avoidWhen: "Active damage claims, one-time repairs, insurance documentation",
    capabilities: caps({
      pricingTables: true,
      scopeOfWork: true,
      signatureBlock: true,
      financingSection: true,
      executiveSummary: true,
    }),
    imageMapping: img("maintenance-proposal", STYLE_CATEGORIES.RETAIL, "polished"),
    aiSelectionWeight: 70,
  },
  {
    id: "repair-authorization",
    slug: "repair-authorization",
    title: "Repair Authorization Form",
    description:
      "Homeowner authorization form with scope description, pricing breakdown, and terms & conditions. Get signed approval fast.",
    styleCategory: STYLE_CATEGORIES.RETAIL,
    category: TEMPLATE_CATEGORIES.RETAIL,
    tags: ["authorization", "form", "repair", "agreement"],
    thumbnailKey: "templates/repair-authorization/thumbnail.png",
    previewMode: "retail",
    intendedUse: "retail",
    version: "1.2.0",
    audience: "homeowner",
    bestFor: "Repair authorizations & signed agreements",
    supportedTrades: [
      "roofing",
      "restoration",
      "general_contracting",
      "siding",
      "gutters",
      "windows",
      "paint",
      "hvac",
      "plumbing",
      "electrical",
      "flooring",
      "interior",
    ],
    supportedDamageTypes: ["hail", "wind", "water", "fire", "wear", "storm"],
    supportedIntents: ["authorization", "homeowner_estimate"],
    supportedPropertyTypes: ["residential", "commercial", "multi_family"],
    tone: "homeowner_friendly",
    requiresPricing: true,
    requiresPhotos: false,
    requiresMeasurements: false,
    recommendedWhen: "Need signed homeowner authorization to proceed with repair work",
    avoidWhen: "Still in estimate/proposal stage, insurance documentation, no agreement needed yet",
    capabilities: caps({ pricingTables: true, scopeOfWork: true, signatureBlock: true }),
    imageMapping: img("repair-authorization", STYLE_CATEGORIES.RETAIL, "polished"),
    aiSelectionWeight: 75,
  },
  {
    id: "warranty-certificate",
    slug: "warranty-certificate",
    title: "Workmanship Warranty Certificate",
    description:
      "Professional warranty certificate with coverage details, maintenance requirements, and workmanship guarantee. Builds long-term trust.",
    styleCategory: STYLE_CATEGORIES.RETAIL,
    category: TEMPLATE_CATEGORIES.RETAIL,
    tags: ["warranty", "certificate", "workmanship", "guarantee"],
    thumbnailKey: "templates/warranty-certificate/thumbnail.png",
    previewMode: "retail",
    intendedUse: "retail",
    version: "1.1.0",
    audience: "homeowner",
    bestFor: "Warranty certificates & guarantees",
    supportedTrades: [
      "roofing",
      "restoration",
      "general_contracting",
      "siding",
      "gutters",
      "windows",
      "paint",
      "hvac",
      "plumbing",
      "electrical",
      "flooring",
    ],
    supportedDamageTypes: [],
    supportedIntents: ["warranty"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "homeowner_friendly",
    requiresPricing: false,
    requiresPhotos: false,
    requiresMeasurements: false,
    recommendedWhen: "Job complete — need to issue a professional workmanship warranty certificate",
    avoidWhen: "Pre-repair stage, estimate/proposal stage, insurance documentation",
    capabilities: caps({ signatureBlock: true, executiveSummary: true }),
    imageMapping: img("warranty-certificate", STYLE_CATEGORIES.RETAIL, "polished"),
    aiSelectionWeight: 65,
  },
  {
    id: "appraisal-umpire",
    slug: "appraisal-umpire-report",
    title: "Appraisal & Umpire Report",
    description:
      "Independent appraisal report for dispute resolution with detailed scope analysis and valuation. Professional documentation for the appraisal process.",
    styleCategory: STYLE_CATEGORIES.RETAIL,
    category: TEMPLATE_CATEGORIES.LEGAL,
    tags: ["appraisal", "umpire", "dispute", "valuation"],
    thumbnailKey: "templates/appraisal-umpire/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.5.0",
    audience: "homeowner",
    bestFor: "Appraisal disputes & valuations",
    supportedTrades: ["roofing", "restoration", "general_contracting"],
    supportedDamageTypes: ["hail", "wind", "water", "fire", "storm"],
    supportedIntents: ["appraisal"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "legal_supportive",
    requiresPricing: true,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Claim in appraisal process — need professional valuation report for umpire or panel",
    avoidWhen: "Pre-appraisal negotiation, retail estimates, initial claims",
    capabilities: caps({
      pricingTables: true,
      lineItems: true,
      photoGallery: true,
      aiNarrative: true,
      executiveSummary: true,
      comparisonMatrix: true,
    }),
    imageMapping: img("appraisal-umpire-report", STYLE_CATEGORIES.RETAIL, "legal"),
    aiSelectionWeight: 70,
  },
  {
    id: "expert-witness",
    slug: "expert-witness-report",
    title: "Expert Witness Report",
    description:
      "Litigation support report with technical analysis, causation opinion, and professional credentials. Court-ready documentation.",
    styleCategory: STYLE_CATEGORIES.RETAIL,
    category: TEMPLATE_CATEGORIES.LEGAL,
    tags: ["expert", "witness", "litigation", "testimony"],
    thumbnailKey: "templates/expert-witness/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.4.0",
    audience: "homeowner",
    bestFor: "Expert witness & litigation support",
    supportedTrades: ["roofing", "restoration", "general_contracting"],
    supportedDamageTypes: ["hail", "wind", "water", "fire", "storm", "structural"],
    supportedIntents: ["litigation"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "legal_supportive",
    requiresPricing: true,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Litigation in progress — need court-ready expert witness report with technical opinions",
    avoidWhen: "Pre-litigation stage, retail estimates, initial claims, supplement requests",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      executiveSummary: true,
      signatureBlock: true,
    }),
    imageMapping: img("expert-witness-report", STYLE_CATEGORIES.RETAIL, "legal"),
    aiSelectionWeight: 60,
  },

  // ═══════════════════════════════════════════════════════════
  // SALES MATERIAL — Pre-Sale & Presentation Docs (5 templates)
  // ═══════════════════════════════════════════════════════════
  {
    id: "initial-claim-inspection",
    slug: "initial-claim-inspection",
    title: "Initial Claim Inspection Report",
    description:
      "First-visit inspection report with property condition, damage identification, and recommended next steps. The report that wins the contract.",
    styleCategory: STYLE_CATEGORIES.SALES,
    category: TEMPLATE_CATEGORIES.SPECIALTY,
    tags: ["inspection", "initial", "claim", "assessment"],
    thumbnailKey: "templates/initial-claim-inspection/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.8.0",
    audience: "prospect",
    bestFor: "First-visit inspection leave-behinds",
    supportedTrades: ["roofing", "restoration", "general_contracting", "siding"],
    supportedDamageTypes: ["hail", "wind", "water", "storm", "impact"],
    supportedIntents: ["inspection_summary", "sales_pitch"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "persuasive",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: false,
    recommendedWhen:
      "First visit to a property — need a professional leave-behind that builds trust and wins the contract",
    avoidWhen: "Already have the contract, carrier-facing documentation, formal estimates",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      scopeOfWork: true,
      executiveSummary: true,
      beforeAfterLayout: true,
    }),
    imageMapping: img("initial-claim-inspection", STYLE_CATEGORIES.SALES, "premium"),
    aiSelectionWeight: 90,
  },
  {
    id: "roof-inspection-premium",
    slug: "roofing-inspection-premium",
    title: "Premium Roofing Inspection",
    description:
      "Professional roof inspection report with thermal imaging, moisture detection, and code compliance verification. The leave-behind that wins the job.",
    styleCategory: STYLE_CATEGORIES.SALES,
    category: TEMPLATE_CATEGORIES.ROOFING,
    tags: ["roof", "inspection", "thermal", "moisture"],
    thumbnailKey: "templates/roofing-inspection-premium/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "2.1.0",
    audience: "prospect",
    bestFor: "Inspection leave-behinds & trust building",
    supportedTrades: ["roofing"],
    supportedDamageTypes: ["hail", "wind", "wear", "leak", "storm"],
    supportedIntents: ["inspection_summary", "sales_pitch"],
    supportedPropertyTypes: ["residential", "commercial"],
    tone: "premium",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Roofing-specific inspection with thermal or moisture data — premium leave-behind for prospects",
    avoidWhen: "Non-roofing work, carrier-facing claims, formal estimates",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      executiveSummary: true,
      beforeAfterLayout: true,
      codeCompliance: true,
    }),
    imageMapping: img("roofing-inspection-premium", STYLE_CATEGORIES.SALES, "premium"),
    aiSelectionWeight: 85,
  },
  {
    id: "roof-coating-analysis",
    slug: "roof-coating-analysis",
    title: "Roof Coating System Analysis",
    description:
      "Detailed analysis of roof coating systems including adhesion testing, thickness measurements, and warranty compliance. Shows expertise that closes deals.",
    styleCategory: STYLE_CATEGORIES.SALES,
    category: TEMPLATE_CATEGORIES.ROOFING,
    tags: ["roof", "coating", "commercial", "warranty"],
    thumbnailKey: "templates/roof-coating-analysis/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.0.0",
    audience: "prospect",
    bestFor: "Commercial coating proposals",
    supportedTrades: ["roofing"],
    supportedDamageTypes: ["coating_failure", "wear", "leak"],
    supportedIntents: ["sales_pitch", "comparison"],
    supportedPropertyTypes: ["commercial", "industrial"],
    tone: "premium",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Commercial roof coating opportunity — need analysis showing coating system condition and comparison options",
    avoidWhen: "Residential roofing, insurance claims, non-coating roof work",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      executiveSummary: true,
      comparisonMatrix: true,
    }),
    imageMapping: img("roof-coating-analysis", STYLE_CATEGORIES.SALES, "premium"),
    aiSelectionWeight: 70,
  },
  {
    id: "flat-roof-assessment",
    slug: "flat-roof-assessment",
    title: "Commercial Flat Roof Assessment",
    description:
      "Commercial flat roof evaluation with core sampling, moisture scans, and membrane integrity testing. Position yourself as the expert.",
    styleCategory: STYLE_CATEGORIES.SALES,
    category: TEMPLATE_CATEGORIES.ROOFING,
    tags: ["commercial", "flat-roof", "membrane", "moisture"],
    thumbnailKey: "templates/flat-roof-assessment/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.3.0",
    audience: "prospect",
    bestFor: "Commercial property assessments",
    supportedTrades: ["roofing"],
    supportedDamageTypes: ["leak", "wear", "water", "coating_failure"],
    supportedIntents: ["inspection_summary", "sales_pitch"],
    supportedPropertyTypes: ["commercial", "industrial"],
    tone: "premium",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Commercial flat roof — need professional assessment with core sampling or moisture data",
    avoidWhen: "Residential steep-slope roofing, insurance claims, formal estimates",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      executiveSummary: true,
      beforeAfterLayout: true,
    }),
    imageMapping: img("flat-roof-assessment", STYLE_CATEGORIES.SALES, "premium"),
    aiSelectionWeight: 70,
  },
  {
    id: "commercial-property",
    slug: "commercial-property-assessment",
    title: "Commercial Property Assessment",
    description:
      "Professional commercial property damage assessment and repair scope for multi-unit and business properties. Win larger commercial accounts.",
    styleCategory: STYLE_CATEGORIES.SALES,
    category: TEMPLATE_CATEGORIES.RESTORATION,
    tags: ["commercial", "property", "multi-unit", "business"],
    thumbnailKey: "templates/commercial-property/thumbnail.png",
    previewMode: "claim",
    intendedUse: "claim",
    version: "1.4.0",
    audience: "prospect",
    bestFor: "Commercial property pitches",
    supportedTrades: ["roofing", "restoration", "general_contracting", "siding", "windows"],
    supportedDamageTypes: ["hail", "wind", "water", "fire", "storm", "structural"],
    supportedIntents: ["inspection_summary", "sales_pitch"],
    supportedPropertyTypes: ["commercial", "multi_family", "industrial", "mixed"],
    tone: "premium",
    requiresPricing: false,
    requiresPhotos: true,
    requiresMeasurements: true,
    recommendedWhen:
      "Multi-unit or commercial property assessment — position your company for a larger account",
    avoidWhen: "Single-family residential, insurance claim documentation, retail estimates",
    capabilities: caps({
      photoGallery: true,
      aiNarrative: true,
      scopeOfWork: true,
      executiveSummary: true,
      beforeAfterLayout: true,
    }),
    imageMapping: img("commercial-property-assessment", STYLE_CATEGORIES.SALES, "premium"),
    aiSelectionWeight: 75,
  },
];

// ─── Helpers ─────────────────────────────────────────────────

/** Get template by ID */
export function getTemplateById(id: string): TemplateDefinition | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

/** Get template by slug */
export function getTemplateBySlug(slug: string): TemplateDefinition | undefined {
  return ALL_TEMPLATES.find((t) => t.slug === slug);
}

/** Get templates by legacy category */
export function getTemplatesByCategory(category: string): TemplateDefinition[] {
  return ALL_TEMPLATES.filter((t) => t.category === category);
}

/** Get templates by style category (Insurance / Retail / Sales Material) */
export function getTemplatesByStyle(style: StyleCategory): TemplateDefinition[] {
  return ALL_TEMPLATES.filter((t) => t.styleCategory === style);
}

/** Get all unique legacy categories */
export function getAllCategories(): string[] {
  return Object.values(TEMPLATE_CATEGORIES);
}

/** Get all style categories */
export function getAllStyles(): StyleCategory[] {
  return Object.values(STYLE_CATEGORIES);
}

/** Get style category counts */
export function getStyleCounts(): Record<StyleCategory, number> {
  return {
    [STYLE_CATEGORIES.INSURANCE]: ALL_TEMPLATES.filter(
      (t) => t.styleCategory === STYLE_CATEGORIES.INSURANCE
    ).length,
    [STYLE_CATEGORIES.RETAIL]: ALL_TEMPLATES.filter(
      (t) => t.styleCategory === STYLE_CATEGORIES.RETAIL
    ).length,
    [STYLE_CATEGORIES.SALES]: ALL_TEMPLATES.filter(
      (t) => t.styleCategory === STYLE_CATEGORIES.SALES
    ).length,
  };
}

/** Get templates matching specific trade */
export function getTemplatesForTrade(trade: TradeType): TemplateDefinition[] {
  return ALL_TEMPLATES.filter((t) => t.supportedTrades.includes(trade));
}

/** Get templates matching specific damage type */
export function getTemplatesForDamage(damage: DamageType): TemplateDefinition[] {
  return ALL_TEMPLATES.filter((t) => t.supportedDamageTypes.includes(damage));
}

/** Get templates matching specific intent */
export function getTemplatesForIntent(intent: JobIntent): TemplateDefinition[] {
  return ALL_TEMPLATES.filter((t) => t.supportedIntents.includes(intent));
}

/** Check if a template has a specific capability */
export function templateHasCapability(
  templateId: string,
  capability: keyof TemplateCapabilities
): boolean {
  const t = getTemplateById(templateId);
  return t?.capabilities[capability] ?? false;
}
