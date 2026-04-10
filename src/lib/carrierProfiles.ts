// Simple seeded carrier profiles and helpers (applyCarrierProfile + ACV/RCV math)
export type CarrierProfile = {
  name: string;
  estimate_terms?: string;
  doc_requirements?: string[];
  acv_label?: string;
  rcv_label?: string;
  wording_overrides?: Record<string, string>;
  photo_captions_required?: boolean;
  line_item_rounding?: "nearest_dollar" | "cent";
  depreciation_rule?: "linear" | "custom";
  depreciation_percent_per_year?: number; // used for linear fallback
};

export const DEFAULT_PROFILES: CarrierProfile[] = [
  {
    name: "Farmers",
    estimate_terms: "Line-item detail required; photos must include overviews + closeups.",
    doc_requirements: ["WeatherVerification", "CodeCompliance", "PhotoLog"],
    acv_label: "Actual Cash Value",
    rcv_label: "Replacement Cost Value",
    wording_overrides: {
      deductible: "Policy Deductible",
      supplement: "Request for Additional Line Items",
    },
    photo_captions_required: true,
    line_item_rounding: "nearest_dollar",
    depreciation_rule: "linear",
    depreciation_percent_per_year: 2,
  },
  {
    name: "State Farm",
    estimate_terms: "State Farm format friendly; ensure line-item descriptions are explicit.",
    doc_requirements: ["WeatherVerification", "Estimate", "PhotoLog"],
    acv_label: "ACV",
    rcv_label: "RCV",
    line_item_rounding: "nearest_dollar",
    depreciation_rule: "linear",
    depreciation_percent_per_year: 2,
  },
  {
    name: "Allstate",
    estimate_terms: "Allstate requires clear notes for supplement process.",
    doc_requirements: ["WeatherVerification", "PhotoLog"],
    acv_label: "Actual Cash Value",
    rcv_label: "Replacement Cost Value",
    line_item_rounding: "nearest_dollar",
    depreciation_rule: "linear",
    depreciation_percent_per_year: 2,
  },
];

export function findCarrierProfile(name?: string): CarrierProfile | undefined {
  if (!name) return undefined;
  return DEFAULT_PROFILES.find((p) => p.name.toLowerCase() === name.toLowerCase());
}

/**
 * applyCarrierProfile
 * - shallowly injects carrier profile labels and required docs into a renderContext
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyCarrierProfile(renderContext: any, profile?: CarrierProfile) {
  if (!profile) return renderContext;
  const ctx = { ...(renderContext || {}) };
  ctx.carrierProfile = profile;
  ctx.claim = ctx.claim || {};
  ctx.claim.acv_label = profile.acv_label || ctx.claim.acv_label || "ACV";
  ctx.claim.rcv_label = profile.rcv_label || ctx.claim.rcv_label || "RCV";
  ctx.__required_docs = profile.doc_requirements || ctx.__required_docs || [];
  return ctx;
}

/**
 * computeDepreciation
 * A simple linear depreciation fallback: depreciation = replacementCost * (rate * years)
 * Returns { acv, rcv, depreciationAmount }
 */
export function computeACVandRCV(opts: {
  replacementCostCents: number;
  ageYears?: number;
  percentPerYear?: number;
}) {
  const { replacementCostCents, ageYears = 0, percentPerYear = 2 } = opts;
  const rate = Math.max(0, percentPerYear) / 100;
  const depreciationFraction = Math.min(1, rate * Math.max(0, ageYears));
  const depreciationAmount = Math.round(replacementCostCents * depreciationFraction);
  const acv = Math.max(0, replacementCostCents - depreciationAmount);
  const rcv = replacementCostCents;
  return { acv, rcv, depreciationAmount };
}

const carrierProfiles = {
  DEFAULT_PROFILES,
  findCarrierProfile,
  applyCarrierProfile,
  computeACVandRCV,
};
export default carrierProfiles;
