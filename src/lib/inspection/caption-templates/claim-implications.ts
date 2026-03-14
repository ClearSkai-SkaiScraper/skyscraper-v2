/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CLAIM IMPLICATION TEMPLATES
 *
 * Sprint Item 3.3 — Professional insurance claim language patterns.
 *
 * Each template is tagged with:
 * - damageTypes: which damage types it applies to
 * - components: which building components it applies to
 * - confidenceLevel: how strong the assertion is
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type ConfidenceLevel = "strong" | "moderate" | "supporting";

export interface ClaimImplicationTemplate {
  /** The claim implication text with {PLACEHOLDERS} */
  text: string;
  /** Damage types this template applies to */
  damageTypes: string[];
  /** Building components this template applies to */
  components: string[];
  /** Strength of the assertion */
  confidenceLevel: ConfidenceLevel;
}

// ─── Weather Barrier Templates ───────────────────────────────────────────────

const WEATHER_BARRIER_TEMPLATES: ClaimImplicationTemplate[] = [
  {
    text: "This condition compromises the weather-tight integrity of the {COMPONENT}, creating a direct pathway for moisture intrusion to the substrate and structural members below.",
    damageTypes: [
      "hail_impact",
      "wind_lifted",
      "wind_torn",
      "cracked_broken",
      "missing_shingles",
      "membrane_puncture",
      "membrane_tear",
    ],
    components: ["shingle", "tile", "metal_roof", "membrane", "shake", "slate", "flashing"],
    confidenceLevel: "strong",
  },
  {
    text: "The breach in the weather-resistant barrier at this location will allow progressive moisture penetration, leading to accelerated deterioration of the underlayment and roof deck if not remediated.",
    damageTypes: [
      "hail_impact",
      "wind_lifted",
      "cracked_broken",
      "flashing_damage",
      "flashing_lifted",
    ],
    components: ["shingle", "tile", "flashing", "drip_edge"],
    confidenceLevel: "strong",
  },
  {
    text: "Exposed substrate at this damage point is subject to UV degradation and moisture absorption, reducing the remaining service life of the surrounding roofing materials.",
    damageTypes: ["granule_loss", "hail_bruise", "coating_damage"],
    components: ["shingle", "metal_roof"],
    confidenceLevel: "moderate",
  },
];

// ─── Spot Repair Inadequacy Templates ────────────────────────────────────────

const SPOT_REPAIR_TEMPLATES: ClaimImplicationTemplate[] = [
  {
    text: "Spot repair of this damage is not feasible as the surrounding {COMPONENT} material has been compromised by impact vibration and stress fracturing beyond the visible damage boundary.",
    damageTypes: ["hail_impact", "hail_bruise", "tile_crack", "stucco_spalling"],
    components: ["shingle", "tile", "stucco"],
    confidenceLevel: "strong",
  },
  {
    text: "Partial replacement creates a color mismatch and differential weathering line that will accelerate failure at the repair boundary. Full course replacement is the accepted industry standard.",
    damageTypes: ["hail_impact", "wind_lifted", "cracked_broken", "missing_shingles"],
    components: ["shingle", "siding", "tile"],
    confidenceLevel: "moderate",
  },
  {
    text: "Removal of damaged {COMPONENT} units will disturb the fastening pattern of adjacent materials, requiring replacement of the surrounding area to maintain wind resistance and manufacturer specifications.",
    damageTypes: ["missing_shingles", "cracked_broken", "wind_torn"],
    components: ["shingle", "siding", "tile"],
    confidenceLevel: "strong",
  },
];

// ─── Code Compliance Templates ───────────────────────────────────────────────

const CODE_COMPLIANCE_TEMPLATES: ClaimImplicationTemplate[] = [
  {
    text: "Per {IRC_CODE}, this condition requires full replacement of the affected {COMPONENT} to restore code compliance and weather protection.",
    damageTypes: ["*"],
    components: ["*"],
    confidenceLevel: "strong",
  },
  {
    text: "Building code {IRC_CODE} mandates restoration to pre-loss condition. The documented damage constitutes a code violation that must be remediated through professional repair or replacement.",
    damageTypes: ["*"],
    components: ["*"],
    confidenceLevel: "strong",
  },
  {
    text: "Current condition fails to meet the minimum performance requirements established by {IRC_CODE}. Remediation is required to restore the {COMPONENT} to code-compliant status.",
    damageTypes: ["structural", "water_intrusion", "fire_damage"],
    components: ["*"],
    confidenceLevel: "strong",
  },
];

// ─── Causation Templates ─────────────────────────────────────────────────────

const CAUSATION_TEMPLATES: ClaimImplicationTemplate[] = [
  {
    text: "The observed damage pattern is consistent with {EVENT_TYPE} impact and is not attributable to normal wear, deferred maintenance, or pre-existing conditions based on surrounding material condition assessment.",
    damageTypes: ["hail_impact", "hail_bruise", "hail_dent", "wind_lifted", "wind_torn"],
    components: ["*"],
    confidenceLevel: "strong",
  },
  {
    text: "Impact distribution pattern and damage density are consistent with the reported {EVENT_TYPE} event. Soft metal testing confirms storm trajectory and intensity.",
    damageTypes: ["hail_impact", "hail_dent", "soft_metal_dent"],
    components: ["shingle", "soft_metal", "metal_roof", "gutter"],
    confidenceLevel: "strong",
  },
  {
    text: "The direction of material displacement aligns with documented {EVENT_TYPE} wind direction, supporting storm-related causation for this damage.",
    damageTypes: ["wind_lifted", "wind_torn", "wind_displaced", "wind_creased"],
    components: ["shingle", "siding", "flashing"],
    confidenceLevel: "moderate",
  },
];

// ─── Warranty Templates ──────────────────────────────────────────────────────

const WARRANTY_TEMPLATES: ClaimImplicationTemplate[] = [
  {
    text: "Manufacturer warranty is voided when {DAMAGE_TYPE} damage is present, as the product can no longer perform to its rated specifications for weather resistance and service life.",
    damageTypes: ["granule_loss", "hail_impact", "cracked_broken", "seal_failure"],
    components: ["shingle", "window"],
    confidenceLevel: "moderate",
  },
  {
    text: "The documented damage exceeds the manufacturer's acceptable defect threshold per ARMA standards, requiring full system replacement to restore warranty coverage.",
    damageTypes: ["hail_impact", "granule_loss", "blistering"],
    components: ["shingle"],
    confidenceLevel: "moderate",
  },
];

// ─── Water Damage Templates ──────────────────────────────────────────────────

const WATER_DAMAGE_TEMPLATES: ClaimImplicationTemplate[] = [
  {
    text: "Active moisture intrusion at this location will cause progressive deterioration of structural members and may create conditions for microbial growth if not remediated within 48 hours per IICRC S500 standards.",
    damageTypes: [
      "water_staining",
      "water_intrusion",
      "moisture_damage",
      "rot_damage",
      "mold_indicators",
    ],
    components: ["interior", "ceiling", "wall"],
    confidenceLevel: "strong",
  },
  {
    text: "The moisture path traced from this point of entry indicates potential concealed damage to framing, insulation, and interior finishes that requires invasive inspection and probable remediation.",
    damageTypes: ["water_intrusion", "ceiling_stain", "wall_crack"],
    components: ["interior", "ceiling", "wall"],
    confidenceLevel: "moderate",
  },
];

// ─── Soft Metal / Evidence Templates ─────────────────────────────────────────

const EVIDENCE_TEMPLATES: ClaimImplicationTemplate[] = [
  {
    text: "Soft metal denting per HAAG methodology provides forensic confirmation of hail event occurrence and impact intensity. This finding supports the causation argument for all storm-related damage documented in this report.",
    damageTypes: ["soft_metal_dent", "mailbox_dent", "meter_box_dent", "aluminum_dent"],
    components: ["soft_metal", "mailbox", "meter_box"],
    confidenceLevel: "strong",
  },
  {
    text: "Impact density on collateral items establishes the storm's damage footprint across the property, corroborating the primary damage findings on the {COMPONENT}.",
    damageTypes: ["soft_metal_dent", "gutter_dent", "downspout_dent", "ac_fin_damage"],
    components: ["soft_metal", "gutter", "downspout", "hvac"],
    confidenceLevel: "supporting",
  },
];

// ─── All Templates Combined ──────────────────────────────────────────────────

export const ALL_CLAIM_TEMPLATES: ClaimImplicationTemplate[] = [
  ...WEATHER_BARRIER_TEMPLATES,
  ...SPOT_REPAIR_TEMPLATES,
  ...CODE_COMPLIANCE_TEMPLATES,
  ...CAUSATION_TEMPLATES,
  ...WARRANTY_TEMPLATES,
  ...WATER_DAMAGE_TEMPLATES,
  ...EVIDENCE_TEMPLATES,
];

// ─── Template Selection ──────────────────────────────────────────────────────

/**
 * Find the best claim implication template for a given damage type and component.
 */
export function selectClaimImplication(
  damageType: string,
  component: string,
  options?: {
    eventType?: string;
    ircCode?: string;
    confidenceLevel?: ConfidenceLevel;
    variationIndex?: number;
  }
): string {
  const dt = damageType.toLowerCase();
  const comp = component.toLowerCase();

  // Find matching templates
  const matches = ALL_CLAIM_TEMPLATES.filter((t) => {
    const typeMatch =
      t.damageTypes.includes("*") || t.damageTypes.some((d) => dt.includes(d) || d.includes(dt));
    const compMatch =
      t.components.includes("*") || t.components.some((c) => comp.includes(c) || c.includes(comp));
    const confMatch = !options?.confidenceLevel || t.confidenceLevel === options.confidenceLevel;
    return typeMatch && compMatch && confMatch;
  });

  if (matches.length === 0) {
    // Fallback to general template
    return `This damage requires professional repair or replacement of the affected ${component} to restore the building to its pre-loss condition in accordance with applicable building codes.`;
  }

  const idx = (options?.variationIndex ?? 0) % matches.length;
  let text = matches[idx].text;

  // Replace placeholders
  text = text.replace(/\{COMPONENT\}/g, component);
  text = text.replace(/\{EVENT_TYPE\}/g, options?.eventType || "storm");
  text = text.replace(/\{IRC_CODE\}/g, options?.ircCode || "applicable building code");
  text = text.replace(/\{DAMAGE_TYPE\}/g, damageType.replace(/_/g, " "));

  return text;
}

/**
 * Generate a claim implication paragraph combining observation + code + impact.
 */
export function generateClaimImplicationParagraph(
  damageType: string,
  component: string,
  options?: {
    eventType?: string;
    ircCode?: string;
    severity?: string;
    variationIndex?: number;
  }
): string {
  const severity = options?.severity?.toLowerCase() || "moderate";
  const isHigh = ["critical", "severe", "high"].includes(severity);

  // Get strong template for high severity, moderate otherwise
  const implication = selectClaimImplication(damageType, component, {
    ...options,
    confidenceLevel: isHigh ? "strong" : "moderate",
  });

  return implication;
}
