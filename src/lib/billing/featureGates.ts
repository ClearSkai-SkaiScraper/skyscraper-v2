/**
 * ============================================================================
 * Feature Gates — Centralised feature → plan mapping
 * ============================================================================
 *
 * Single source of truth for which features are available on which plans.
 * Used by both server-side checks and the client-side usePlan() hook.
 *
 * Philosophy: "$80/seat/month. Active subscription = unlimited everything."
 * Feature gates exist only for upsell nudges and graceful degradation,
 * NOT hard blocks. See billing/guard.ts for the actual paywall.
 */

export type PlanSlug = "free" | "solo" | "business" | "enterprise";

export type FeatureKey =
  | "ai_assistant"
  | "ai_damage_analysis"
  | "advanced_reports"
  | "pdf_export"
  | "custom_branding"
  | "api_access"
  | "integrations"
  | "team_seats"
  | "client_portal"
  | "message_center"
  | "pipeline"
  | "weather_verification"
  | "priority_support"
  | "white_label";

/**
 * Map each plan slug to its allowed features.
 * "enterprise" gets everything.
 */
const PLAN_FEATURES: Record<PlanSlug, Set<FeatureKey>> = {
  free: new Set<FeatureKey>(["pipeline", "message_center", "client_portal"]),
  solo: new Set<FeatureKey>([
    "pipeline",
    "message_center",
    "client_portal",
    "ai_assistant",
    "ai_damage_analysis",
    "advanced_reports",
    "pdf_export",
    "weather_verification",
  ]),
  business: new Set<FeatureKey>([
    "pipeline",
    "message_center",
    "client_portal",
    "ai_assistant",
    "ai_damage_analysis",
    "advanced_reports",
    "pdf_export",
    "weather_verification",
    "custom_branding",
    "team_seats",
    "integrations",
    "priority_support",
  ]),
  enterprise: new Set<FeatureKey>([
    "pipeline",
    "message_center",
    "client_portal",
    "ai_assistant",
    "ai_damage_analysis",
    "advanced_reports",
    "pdf_export",
    "weather_verification",
    "custom_branding",
    "team_seats",
    "integrations",
    "priority_support",
    "api_access",
    "white_label",
  ]),
};

/**
 * Minimum plan required for a feature — used for upsell messaging.
 */
const FEATURE_MIN_PLAN: Record<FeatureKey, PlanSlug> = {
  ai_assistant: "solo",
  ai_damage_analysis: "solo",
  advanced_reports: "solo",
  pdf_export: "solo",
  custom_branding: "business",
  api_access: "enterprise",
  integrations: "business",
  team_seats: "business",
  client_portal: "free",
  message_center: "free",
  pipeline: "free",
  weather_verification: "solo",
  priority_support: "business",
  white_label: "enterprise",
};

/**
 * Check whether a plan has access to a feature.
 */
export function hasFeature(plan: PlanSlug, feature: FeatureKey): boolean {
  return PLAN_FEATURES[plan]?.has(feature) ?? false;
}

/**
 * Get the minimum plan required for a feature (for upsell copy).
 */
export function getMinPlanForFeature(feature: FeatureKey): PlanSlug {
  return FEATURE_MIN_PLAN[feature];
}

/**
 * Get all features for a plan.
 */
export function getFeaturesForPlan(plan: PlanSlug): FeatureKey[] {
  return Array.from(PLAN_FEATURES[plan] ?? []);
}

/**
 * Human-readable plan names for UI display.
 */
export const PLAN_DISPLAY_NAMES: Record<PlanSlug, string> = {
  free: "Free",
  solo: "Solo",
  business: "Business",
  enterprise: "Enterprise",
};
