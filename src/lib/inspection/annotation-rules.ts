/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANNOTATION SHAPE & SUPPRESSION RULES
 *
 * Sprint Items 2.2 + 2.3
 *
 * 1. Shape selection logic — determines circle vs rectangle vs outline
 * 2. Suppression rules — filters out low-quality or non-claim annotations
 *
 * Used by: evidence-grouping.ts, damage-report/route.ts, PhotoAnnotator.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { AnnotationShapeType, DamageCategory, RawAnnotation } from "@/types/annotations";

// ─── Shape Selection Rules ───────────────────────────────────────────────────

/**
 * Point impacts — rendered as circles.
 * Small, discrete damage marks from hail, nails, punctures.
 */
const CIRCLE_PATTERNS: string[] = [
  "hail_impact",
  "hail_bruise",
  "hail_dent",
  "hail_spatter",
  "nail_pops",
  "exposed_nail",
  "granule_loss",
  "metal_dent",
  "metal_puncture",
  "stucco_divot",
  "stucco_spalling",
  "tile_spalling",
  "membrane_puncture",
  "ac_fin_damage",
  "condenser_dent",
  "mailbox_dent",
  "electrical_box_dent",
  "meter_box_dent",
  "soft_metal_dent",
  "aluminum_dent",
  "copper_dent",
  "lead_dent",
  "gutter_dent",
  "downspout_dent",
  "screen_dent",
  "garage_door_dent",
  "light_fixture_damage",
  "blistering",
];

/**
 * Linear/area defects — rendered as rectangles.
 * Cracks, gaps, lifted material, seam failures.
 */
const RECTANGLE_PATTERNS: string[] = [
  "wind_lifted",
  "wind_torn",
  "wind_creased",
  "wind_displaced",
  "cracked_broken",
  "tile_crack",
  "stucco_crack",
  "flashing_damage",
  "flashing_lifted",
  "flashing_missing",
  "drip_edge_damage",
  "drip_edge_bent",
  "seam_separation",
  "membrane_seam_failure",
  "membrane_tear",
  "siding_crack",
  "siding_missing",
  "siding_warped",
  "window_crack",
  "window_seal_failure",
  "trim_cracking",
  "trim_damage",
  "casing_damage",
  "gutter_separation",
  "downspout_disconnected",
  "ceiling_crack",
  "wall_crack",
  "shake_split",
  "slate_crack",
  "slate_broken",
  "fastener_failure",
  "pipe_collar_damage",
  "chimney_damage",
];

/**
 * Field conditions — rendered as dashed outlines.
 * Large-area conditions like staining, moss, ponding, widespread damage.
 */
const OUTLINE_PATTERNS: string[] = [
  "algae_staining",
  "water_staining",
  "ceiling_stain",
  "ponding_water",
  "shake_moss",
  "paint_peeling",
  "paint_chipping",
  "paint_bubbling",
  "paint_failure",
  "moisture_damage",
  "wood_rot",
  "rot_damage",
  "material_warping",
  "oil_canning",
  "mold_indicators",
  "thermal_hotspot",
  "thermal_moisture",
  "thermal_insulation_gap",
  "thermal_air_leak",
  "alligatoring",
  "char_damage",
  "smoke_damage",
  "heat_warping",
  "melting",
  "sagging",
  "coating_damage",
  "metal_corrosion",
  "metal_rust",
  "flashing_rust",
  "tile_delamination",
  "slate_delamination",
  "stucco_delamination",
  "mortar_deterioration",
  "siding_faded",
];

/**
 * Non-damage labels that should be suppressed.
 * These are scene elements, not damage findings.
 */
const NON_DAMAGE_LABELS: string[] = [
  "roof",
  "sky",
  "tree",
  "shadow",
  "person",
  "vehicle",
  "car",
  "truck",
  "grass",
  "sidewalk",
  "driveway",
  "road",
  "cloud",
  "building",
  "hand",
  "finger",
  "tool",
  "ladder",
  "equipment",
  "background",
  "unknown",
  "other",
  "none",
  "normal",
  "no_damage",
  "undamaged",
  "good_condition",
];

// ─── Shape Selection ─────────────────────────────────────────────────────────

/**
 * Determine the annotation shape type based on damage type, defect size, and component.
 *
 * Rules:
 * - Circle = point impacts (hail, nails, punctures, dents)
 * - Rectangle = linear defects (cracks, lifted edges, seam failures)
 * - Outline = field conditions (staining, moss, ponding, large-area damage)
 *
 * Falls back to rectangle if no match (conservative default).
 */
export function selectAnnotationShape(
  damageType: string,
  defectSize?: { w: number; h: number },
  _component?: string
): AnnotationShapeType {
  const dt = damageType.toLowerCase();

  // Check explicit patterns first
  if (CIRCLE_PATTERNS.some((p) => dt.includes(p) || dt === p)) return "circle";
  if (OUTLINE_PATTERNS.some((p) => dt.includes(p) || dt === p)) return "outline";
  if (RECTANGLE_PATTERNS.some((p) => dt.includes(p) || dt === p)) return "rectangle";

  // Size-based heuristic: very small defects → circle, very large → outline
  if (defectSize) {
    const area = defectSize.w * defectSize.h;
    if (area < 0.005) return "circle"; // < 0.5% of image area
    if (area > 0.15) return "outline"; // > 15% of image area
  }

  // Keyword fallbacks
  if (
    dt.includes("dent") ||
    dt.includes("impact") ||
    dt.includes("puncture") ||
    dt.includes("spot")
  ) {
    return "circle";
  }
  if (
    dt.includes("stain") ||
    dt.includes("moss") ||
    dt.includes("rust") ||
    dt.includes("corrosion")
  ) {
    return "outline";
  }

  return "rectangle";
}

// ─── Damage Category Classification ──────────────────────────────────────────

/**
 * Classify damage as functional, cosmetic, structural, or safety.
 * Functional damage gets 1.5x boost in claim-worthiness scoring.
 */
export function classifyDamageCategory(damageType: string): DamageCategory {
  const dt = damageType.toLowerCase();

  // Safety concerns — immediate hazard
  if (
    dt.includes("fire") ||
    dt.includes("electrical") ||
    dt.includes("structural") ||
    dt.includes("sagging")
  ) {
    return "safety";
  }

  // Structural — affects load-bearing or structural integrity
  if (dt.includes("decking") || dt.includes("framing") || dt.includes("deflection")) {
    return "structural";
  }

  // Functional — affects water intrusion, weather barrier, performance
  if (
    dt.includes("water") ||
    dt.includes("moisture") ||
    dt.includes("leak") ||
    dt.includes("rot") ||
    dt.includes("mold") ||
    dt.includes("lifted") ||
    dt.includes("torn") ||
    dt.includes("missing") ||
    dt.includes("puncture") ||
    dt.includes("tear") ||
    dt.includes("seam") ||
    dt.includes("flashing") ||
    dt.includes("membrane") ||
    dt.includes("seal_failure") ||
    dt.includes("wind") ||
    dt.includes("granule_loss") ||
    dt.includes("hail_impact") ||
    dt.includes("hail_bruise") ||
    dt.includes("underlayment") ||
    dt.includes("exposed_nail") ||
    dt.includes("cracked_broken")
  ) {
    return "functional";
  }

  // Everything else is cosmetic
  return "cosmetic";
}

// ─── Component Weight for Claim-Worthiness ───────────────────────────────────

/**
 * Get claim-worthiness weight multiplier based on building component.
 *
 * Roof primary (1.0x) > siding/exterior (0.9x) > HVAC (0.85x) >
 * roof collateral (0.8x) > interior (0.7x) > gutter (0.6x) > soft metals (0.5x)
 */
export function getComponentWeight(damageType: string): number {
  const dt = damageType.toLowerCase();

  // Roof primary — highest claim value
  if (
    dt.includes("shingle") ||
    dt.includes("tile_") ||
    dt.includes("metal_roof") ||
    dt.includes("membrane") ||
    dt.includes("shake") ||
    dt.includes("slate") ||
    dt.includes("flashing") ||
    dt.includes("drip_edge") ||
    dt.includes("ventilation") ||
    dt.includes("underlayment") ||
    dt.includes("nail") ||
    dt.includes("ice_dam")
  ) {
    return 1.0;
  }

  // Siding/exterior — high value
  if (dt.includes("siding") || dt.includes("stucco") || dt.includes("paint")) {
    return 0.9;
  }

  // HVAC
  if (
    dt.includes("hvac") ||
    dt.includes("condenser") ||
    dt.includes("ac_fin") ||
    dt.includes("ductwork")
  ) {
    return 0.85;
  }

  // Roof collateral (chimney, skylight, etc.)
  if (
    dt.includes("chimney") ||
    dt.includes("skylight") ||
    dt.includes("pipe_collar") ||
    dt.includes("vent_boot")
  ) {
    return 0.8;
  }

  // Windows/doors
  if (
    dt.includes("window") ||
    dt.includes("screen") ||
    dt.includes("garage_door") ||
    dt.includes("door")
  ) {
    return 0.75;
  }

  // Interior
  if (
    dt.includes("ceiling") ||
    dt.includes("wall_crack") ||
    dt.includes("floor") ||
    dt.includes("drywall") ||
    dt.includes("interior")
  ) {
    return 0.7;
  }

  // Gutter/downspout
  if (
    dt.includes("gutter") ||
    dt.includes("downspout") ||
    dt.includes("fascia") ||
    dt.includes("soffit")
  ) {
    return 0.6;
  }

  // Soft metals / collateral damage indicators
  if (
    dt.includes("soft_metal") ||
    dt.includes("mailbox") ||
    dt.includes("meter") ||
    dt.includes("electrical_box")
  ) {
    return 0.5;
  }

  // Exterior furniture/other
  if (
    dt.includes("furniture") ||
    dt.includes("awning") ||
    dt.includes("fence") ||
    dt.includes("deck")
  ) {
    return 0.55;
  }

  return 0.7; // Default
}

// ─── Annotation Suppression ──────────────────────────────────────────────────

export interface SuppressionResult {
  /** Should this annotation be suppressed? */
  suppressed: boolean;
  /** Reason for suppression (for debugging) */
  reason: string | null;
}

/**
 * Determine if an annotation should be suppressed from the report.
 *
 * Suppression reasons:
 * 1. Confidence < 0.25 (too uncertain)
 * 2. Non-damage label (sky, tree, person, etc.)
 * 3. Duplicate of higher-confidence sibling (IoU > 0.5)
 * 4. Too small to be meaningful (< 0.1% of image)
 */
export function shouldSuppressAnnotation(
  annotation: RawAnnotation,
  allAnnotations: RawAnnotation[]
): SuppressionResult {
  const dt = (annotation.damageType || annotation.type || "").toLowerCase();

  // Rule 1: Non-damage label
  if (NON_DAMAGE_LABELS.some((label) => dt === label || dt.includes(label))) {
    return { suppressed: true, reason: `non-damage label: ${dt}` };
  }

  // Rule 2: Confidence too low
  const confidence = annotation.confidence ?? 0.5;
  if (confidence < 0.25) {
    return { suppressed: true, reason: `confidence too low: ${(confidence * 100).toFixed(0)}%` };
  }

  // Rule 3: Too small (< 0.1% of image area)
  const w = annotation.width || 0;
  const h = annotation.height || 0;
  if (w > 0 && h > 0) {
    // Normalize to 0-1 space for comparison
    const normW = w > 10 ? w / 800 : w > 1 ? w / 100 : w;
    const normH = h > 10 ? h / 600 : h > 1 ? h / 100 : h;
    if (normW * normH < 0.001) {
      return {
        suppressed: true,
        reason: `too small: ${(normW * normH * 100).toFixed(3)}% of image`,
      };
    }
  }

  // Rule 4: Duplicate of higher-confidence sibling
  for (const other of allAnnotations) {
    if (other === annotation) continue;
    const otherConf = other.confidence ?? 0.5;
    if (otherConf <= confidence) continue; // Only suppress if sibling is better

    // Quick IoU check (rough, unnormalized)
    const overlap = roughIoU(annotation, other);
    if (overlap > 0.5) {
      return {
        suppressed: true,
        reason: `duplicate of higher-confidence detection (IoU=${overlap.toFixed(2)}, other conf=${(otherConf * 100).toFixed(0)}%)`,
      };
    }
  }

  return { suppressed: false, reason: null };
}

/**
 * Filter annotations, returning only non-suppressed ones.
 * Attaches suppressionReason to filtered-out annotations for debugging.
 */
export function filterAnnotations(annotations: RawAnnotation[]): {
  kept: RawAnnotation[];
  suppressed: Array<RawAnnotation & { suppressionReason: string }>;
} {
  const kept: RawAnnotation[] = [];
  const suppressed: Array<RawAnnotation & { suppressionReason: string }> = [];

  for (const ann of annotations) {
    const result = shouldSuppressAnnotation(ann, annotations);
    if (result.suppressed) {
      suppressed.push({ ...ann, suppressionReason: result.reason! });
    } else {
      kept.push(ann);
    }
  }

  return { kept, suppressed };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Rough IoU calculation that handles mixed coordinate systems.
 * Good enough for suppression checks (not pixel-perfect).
 */
function roughIoU(a: RawAnnotation, b: RawAnnotation): number {
  // Normalize both to approximate 0-1 space
  const norm = (v: number, ref: number, isPct?: boolean) => {
    if (isPct) return v / 100;
    if (v > 10) return v / ref;
    return v;
  };

  const ax = norm(a.x, 800, a.isPercentage);
  const ay = norm(a.y, 600, a.isPercentage);
  const aw = norm(a.width || 0.05 * 800, 800, a.isPercentage);
  const ah = norm(a.height || 0.05 * 600, 600, a.isPercentage);

  const bx = norm(b.x, 800, b.isPercentage);
  const by = norm(b.y, 600, b.isPercentage);
  const bw = norm(b.width || 0.05 * 800, 800, b.isPercentage);
  const bh = norm(b.height || 0.05 * 600, 600, b.isPercentage);

  const x1 = Math.max(ax, bx);
  const y1 = Math.max(ay, by);
  const x2 = Math.min(ax + aw, bx + bw);
  const y2 = Math.min(ay + ah, by + bh);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (intersection === 0) return 0;

  const areaA = aw * ah;
  const areaB = bw * bh;
  return intersection / (areaA + areaB - intersection);
}

/**
 * Check if an annotation represents non-claim-worthy "overview" evidence.
 * Used for photo-level context scoring.
 */
export function isOverviewAnnotation(annotation: RawAnnotation): boolean {
  const dt = (annotation.damageType || "").toLowerCase();
  // Large bounding boxes covering >40% of image are likely overview markers
  const w = annotation.width || 0;
  const h = annotation.height || 0;
  const normW = w > 10 ? w / 800 : w > 1 ? w / 100 : w;
  const normH = h > 10 ? h / 600 : h > 1 ? h / 100 : h;
  if (normW * normH > 0.4) return true;

  // Labels indicating overview context
  if (dt.includes("overview") || dt.includes("wide_angle") || dt.includes("context")) return true;

  return false;
}
