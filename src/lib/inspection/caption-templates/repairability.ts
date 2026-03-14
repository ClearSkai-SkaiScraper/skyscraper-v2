/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REPAIRABILITY CONCERN TEMPLATES
 *
 * Sprint Item 3.4 — Professional language explaining why spot repair
 * is inadequate and system/course replacement is necessary.
 *
 * Only included when:
 * - claimWorthinessScore > 0.6
 * - severity >= "moderate"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface RepairabilityTemplate {
  /** Template text with {PLACEHOLDERS} */
  text: string;
  /** Damage types this applies to */
  damageTypes: string[];
  /** Building components this applies to */
  components: string[];
  /** Minimum severity for this template */
  minSeverity: "minor" | "moderate" | "severe";
}

// ─── Color Match / Aesthetic Templates ───────────────────────────────────────

const COLOR_MATCH_TEMPLATES: RepairabilityTemplate[] = [
  {
    text: "Color match degradation between existing and replacement {COMPONENT} prevents seamless repair. UV exposure and environmental weathering create visible color differentials that cannot be adequately addressed through spot replacement alone.",
    damageTypes: [
      "hail_impact",
      "cracked_broken",
      "missing_shingles",
      "siding_crack",
      "siding_missing",
    ],
    components: ["shingle", "siding", "tile"],
    minSeverity: "moderate",
  },
  {
    text: "Manufacturer batch variation and field aging make color matching of replacement {COMPONENT} impractical. Industry standard practice requires full plane or course replacement to maintain uniform appearance.",
    damageTypes: ["hail_impact", "wind_torn", "missing_shingles"],
    components: ["shingle", "siding"],
    minSeverity: "moderate",
  },
];

// ─── Material Integrity Templates ────────────────────────────────────────────

const MATERIAL_INTEGRITY_TEMPLATES: RepairabilityTemplate[] = [
  {
    text: "Adjacent {COMPONENT} material is beyond serviceable life per manufacturer specifications. Storm damage has accelerated the deterioration timeline, making partial repair inadvisable as surrounding materials will continue to fail.",
    damageTypes: ["hail_impact", "wind_lifted", "granule_loss", "cracked_broken"],
    components: ["shingle", "tile", "shake", "membrane"],
    minSeverity: "moderate",
  },
  {
    text: "Impact stress extends beyond the visible damage boundary into surrounding {COMPONENT} material. Micro-fracturing and bond compromise in adjacent areas will manifest as premature failures if left unremediated.",
    damageTypes: ["hail_impact", "hail_bruise", "tile_crack", "stucco_spalling"],
    components: ["shingle", "tile", "stucco"],
    minSeverity: "severe",
  },
];

// ─── Fastening Pattern Templates ─────────────────────────────────────────────

const FASTENING_TEMPLATES: RepairabilityTemplate[] = [
  {
    text: "Removal of damaged {COMPONENT} units will compromise the surrounding fastening pattern, requiring replacement of adjacent material to restore the manufacturer's specified wind resistance rating.",
    damageTypes: ["missing_shingles", "cracked_broken", "wind_torn", "wind_displaced"],
    components: ["shingle", "tile", "metal_roof", "siding"],
    minSeverity: "moderate",
  },
  {
    text: "Shingle interlock and seal strip adhesion are disrupted at the repair boundary. Re-nailing and re-sealing cannot restore the original wind uplift resistance per ASTM D7158 standards.",
    damageTypes: ["wind_lifted", "wind_creased", "missing_shingles"],
    components: ["shingle"],
    minSeverity: "moderate",
  },
];

// ─── Industry Standard Templates ─────────────────────────────────────────────

const INDUSTRY_STANDARD_TEMPLATES: RepairabilityTemplate[] = [
  {
    text: "HAAG Engineering classifies this as functional damage requiring system replacement rather than cosmetic repair. The damaged {COMPONENT} can no longer perform its intended weather protection function.",
    damageTypes: ["hail_impact", "hail_bruise", "wind_lifted", "cracked_broken"],
    components: ["shingle", "tile", "metal_roof", "membrane"],
    minSeverity: "moderate",
  },
  {
    text: "Per industry best practices, stepped repair of {COMPONENT} creates differential weathering at the transition line that accelerates future failure. Continuous replacement of the affected area is the accepted remediation approach.",
    damageTypes: ["*"],
    components: ["shingle", "siding", "tile"],
    minSeverity: "moderate",
  },
];

// ─── Stucco / Masonry Templates ──────────────────────────────────────────────

const STUCCO_TEMPLATES: RepairabilityTemplate[] = [
  {
    text: "Stucco repairs require proper three-coat application over new lath per IRC R703.7. The impact vibration has destabilized the bond of surrounding stucco to the lath substrate, requiring expanded repair area.",
    damageTypes: ["stucco_crack", "stucco_spalling", "stucco_divot", "stucco_delamination"],
    components: ["stucco"],
    minSeverity: "moderate",
  },
  {
    text: "Patch repair of stucco creates visible texture and color discontinuities that do not meet acceptable aesthetic standards. Full wall section re-application is required per industry practice.",
    damageTypes: ["stucco_crack", "stucco_spalling"],
    components: ["stucco"],
    minSeverity: "minor",
  },
];

// ─── HVAC Templates ──────────────────────────────────────────────────────────

const HVAC_TEMPLATES: RepairabilityTemplate[] = [
  {
    text: "Fin straightening is effective for damage affecting less than 15% of the condenser coil face area. The documented damage density exceeds this threshold, making coil or unit replacement the cost-effective remediation.",
    damageTypes: ["ac_fin_damage", "condenser_dent", "hvac_panel_damage"],
    components: ["hvac", "condenser"],
    minSeverity: "moderate",
  },
];

// ─── Water Damage Templates ──────────────────────────────────────────────────

const WATER_REPAIR_TEMPLATES: RepairabilityTemplate[] = [
  {
    text: "Moisture-affected materials cannot be dried in place once substrate saturation has occurred. Complete removal, drying of the cavity, and replacement with new materials is required per IICRC S500 Category 2/3 water damage protocol.",
    damageTypes: ["water_intrusion", "moisture_damage", "rot_damage", "mold_indicators"],
    components: ["interior", "ceiling", "wall", "floor"],
    minSeverity: "moderate",
  },
];

// ─── All Templates ───────────────────────────────────────────────────────────

export const ALL_REPAIRABILITY_TEMPLATES: RepairabilityTemplate[] = [
  ...COLOR_MATCH_TEMPLATES,
  ...MATERIAL_INTEGRITY_TEMPLATES,
  ...FASTENING_TEMPLATES,
  ...INDUSTRY_STANDARD_TEMPLATES,
  ...STUCCO_TEMPLATES,
  ...HVAC_TEMPLATES,
  ...WATER_REPAIR_TEMPLATES,
];

// ─── Severity Ordering ───────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  minor: 1,
  moderate: 2,
  severe: 3,
  critical: 3,
  high: 3,
  medium: 2,
  low: 1,
};

// ─── Template Selection ──────────────────────────────────────────────────────

/**
 * Should repairability language be included for this finding?
 * Only when claim-worthiness > 0.6 and severity >= moderate.
 */
export function shouldIncludeRepairability(
  claimWorthinessScore: number,
  severity: string
): boolean {
  return claimWorthinessScore > 0.6 && (SEVERITY_ORDER[severity.toLowerCase()] ?? 1) >= 2;
}

/**
 * Select the best repairability concern template for a damage/component combo.
 */
export function selectRepairabilityConcern(
  damageType: string,
  component: string,
  severity: string,
  options?: { variationIndex?: number }
): string | null {
  const dt = damageType.toLowerCase();
  const comp = component.toLowerCase();
  const sevLevel = SEVERITY_ORDER[severity.toLowerCase()] ?? 1;

  const matches = ALL_REPAIRABILITY_TEMPLATES.filter((t) => {
    const typeMatch =
      t.damageTypes.includes("*") || t.damageTypes.some((d) => dt.includes(d) || d.includes(dt));
    const compMatch =
      t.components.includes("*") || t.components.some((c) => comp.includes(c) || c.includes(comp));
    const sevMatch = sevLevel >= (SEVERITY_ORDER[t.minSeverity] ?? 1);
    return typeMatch && compMatch && sevMatch;
  });

  if (matches.length === 0) return null;

  const idx = (options?.variationIndex ?? 0) % matches.length;
  let text = matches[idx].text;

  text = text.replace(/\{COMPONENT\}/g, component);
  return text;
}
