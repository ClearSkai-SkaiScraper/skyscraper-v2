/**
 * CANONICAL ROOFING CONSTANTS
 * ─────────────────────────────────────────────────────────
 * Single source of truth for roof pitches, materials, and conditions.
 * All UI components, estimator pages, intake forms, and inspection forms
 * MUST reference these constants instead of defining their own lists.
 *
 * @see MASTER_HARDENING_AUDIT.md — EST-001, EST-002, DL-001, DL-002
 */

// ─── Roof Pitch ──────────────────────────────────────────

/** Every valid roof pitch in X/12 format */
export const ROOF_PITCHES = [
  "0/12", // Dead flat (commercial)
  "1/12", // Low-slope commercial
  "2/12",
  "3/12",
  "4/12", // Most common residential minimum
  "5/12",
  "6/12", // Common residential
  "7/12",
  "8/12",
  "9/12",
  "10/12",
  "11/12",
  "12/12", // 45° — steep
  "14/12", // Mansard
  "16/12", // A-frame
  "18/12", // Very steep specialty
] as const;

export type RoofPitch = (typeof ROOF_PITCHES)[number];

/** Map category labels to pitch ranges for backwards compatibility */
export const PITCH_CATEGORIES: Record<string, RoofPitch[]> = {
  flat: ["0/12", "1/12"],
  "low-slope": ["2/12", "3/12"],
  moderate: ["4/12", "5/12", "6/12"],
  steep: ["7/12", "8/12", "9/12"],
  "very-steep": ["10/12", "11/12", "12/12", "14/12", "16/12", "18/12"],
};

/** Pitch multiplier for waste/difficulty — used by estimator engine */
export const PITCH_MULTIPLIERS: Record<string, number> = {
  "0/12": 1.0,
  "1/12": 1.0,
  "2/12": 1.0,
  "3/12": 1.0,
  "4/12": 1.05,
  "5/12": 1.05,
  "6/12": 1.1,
  "7/12": 1.15,
  "8/12": 1.2,
  "9/12": 1.25,
  "10/12": 1.3,
  "11/12": 1.35,
  "12/12": 1.4,
  "14/12": 1.5,
  "16/12": 1.6,
  "18/12": 1.75,
};

/** Dropdown options for UI selects */
export const PITCH_OPTIONS = ROOF_PITCHES.map((p) => ({
  value: p,
  label: p,
}));

// ─── Roof Materials ──────────────────────────────────────

/** Canonical material type values — ONE format, used everywhere */
export const ROOF_MATERIALS = [
  "asphalt-3tab",
  "asphalt-architectural",
  "asphalt-designer",
  "metal-standing-seam",
  "metal-corrugated",
  "metal-stone-coated",
  "tile-concrete",
  "tile-clay",
  "tile-synthetic",
  "slate-natural",
  "slate-synthetic",
  "wood-shake",
  "wood-shingle",
  "tpo",
  "epdm",
  "pvc-membrane",
  "built-up",
  "modified-bitumen",
] as const;

export type RoofMaterial = (typeof ROOF_MATERIALS)[number];

/** Human-readable labels for each material */
export const MATERIAL_LABELS: Record<RoofMaterial, string> = {
  "asphalt-3tab": "3-Tab Asphalt Shingle",
  "asphalt-architectural": "Architectural Shingle",
  "asphalt-designer": "Designer / Premium Shingle",
  "metal-standing-seam": "Metal Standing Seam",
  "metal-corrugated": "Metal Corrugated",
  "metal-stone-coated": "Stone-Coated Metal",
  "tile-concrete": "Concrete Tile",
  "tile-clay": "Clay Tile",
  "tile-synthetic": "Synthetic Tile",
  "slate-natural": "Natural Slate",
  "slate-synthetic": "Synthetic Slate",
  "wood-shake": "Wood Shake",
  "wood-shingle": "Wood Shingle",
  tpo: "TPO (Thermoplastic)",
  epdm: "EPDM (Rubber)",
  "pvc-membrane": "PVC Membrane",
  "built-up": "Built-Up Roofing (BUR)",
  "modified-bitumen": "Modified Bitumen",
};

/** Material category groupings for UI */
export const MATERIAL_CATEGORIES = {
  "Asphalt Shingles": ["asphalt-3tab", "asphalt-architectural", "asphalt-designer"],
  Metal: ["metal-standing-seam", "metal-corrugated", "metal-stone-coated"],
  Tile: ["tile-concrete", "tile-clay", "tile-synthetic"],
  Slate: ["slate-natural", "slate-synthetic"],
  Wood: ["wood-shake", "wood-shingle"],
  "Flat/Low-Slope": ["tpo", "epdm", "pvc-membrane", "built-up", "modified-bitumen"],
} as const;

/** Dropdown options for UI selects */
export const MATERIAL_OPTIONS = ROOF_MATERIALS.map((m) => ({
  value: m,
  label: MATERIAL_LABELS[m],
}));

/**
 * Legacy value mapping — convert old inconsistent values to canonical format.
 * Use when reading data from DB or external sources that may use old formats.
 */
export const MATERIAL_LEGACY_MAP: Record<string, RoofMaterial> = {
  // Step4_RoofDetails format
  "asphalt-3tab": "asphalt-3tab",
  "asphalt-architectural": "asphalt-architectural",
  metal: "metal-standing-seam",
  tile: "tile-concrete",
  slate: "slate-natural",
  wood: "wood-shake",
  tpo: "tpo",
  epdm: "epdm",
  // Inspection Overview format
  "asphalt-shingle": "asphalt-architectural",
  flat: "tpo",
  "wood-shake": "wood-shake",
  // Other legacy formats
  wood_shake: "wood-shake",
  "3tab": "asphalt-3tab",
  architectural: "asphalt-architectural",
  designer: "asphalt-designer",
};

/** Resolve any material value to canonical format */
export function normalizeMaterial(value: string): RoofMaterial | null {
  if (ROOF_MATERIALS.includes(value as RoofMaterial)) return value as RoofMaterial;
  return MATERIAL_LEGACY_MAP[value] ?? null;
}

// ─── Roof Condition ──────────────────────────────────────

/** Canonical condition scale — superset of all lists in the codebase */
export const ROOF_CONDITIONS = ["excellent", "good", "fair", "poor", "critical"] as const;

export type RoofCondition = (typeof ROOF_CONDITIONS)[number];

export const CONDITION_OPTIONS = ROOF_CONDITIONS.map((c) => ({
  value: c,
  label: c.charAt(0).toUpperCase() + c.slice(1),
}));
