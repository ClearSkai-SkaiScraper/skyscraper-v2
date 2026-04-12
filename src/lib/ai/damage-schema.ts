/**
 * AI Damage Analysis Schema
 *
 * Structured output schema for OpenAI Vision API damage detection.
 * Used to parse and validate AI responses for roof/property damage.
 *
 * @see https://platform.openai.com/docs/guides/structured-outputs
 */

import { z } from "zod";

// =============================================================================
// DAMAGE ITEM SCHEMA
// =============================================================================

export const DamageTypeEnum = z.enum([
  "hail", // Hail impact damage
  "wind", // Wind damage (lifted shingles, debris)
  "impact", // Physical impact (branches, objects)
  "thermal", // Heat/thermal damage
  "age", // Age-related wear
  "installation", // Installation defects
  "granule_loss", // Granule displacement / bare spots
  "bruising", // Soft spots on shingles
  "nail_pop", // Exposed fasteners
  "lifted_tab", // Lifted / curled / cupped tabs
  "curling", // Shingle curling
  "cupping", // Shingle cupping
  "creasing", // Wind crease / fold marks
  "wind_crease", // Wind-specific creasing
  "puncture", // Punctured membrane or material
  "erosion", // Surface erosion
  "delamination", // Layer separation
  "blistering", // Surface blistering
  "algae_stain", // Algae growth staining
  "moss_growth", // Moss accumulation
  "ponding", // Standing water evidence
  "ice_dam_evidence", // Ice dam indicators
  "thermal_shock", // Thermal expansion damage
  "UV_degradation", // UV-related deterioration
  "unknown", // Cannot determine cause
]);

export const ComponentEnum = z.enum([
  "shingle",
  "tile",
  "metal_panel",
  "flashing",
  "underlayment",
  "fascia",
  "soffit",
  "gutter",
  "downspout",
  "skylight",
  "chimney",
  "hvac",
  "siding",
  "window",
  "door",
  "ridge_cap",
  "starter_strip",
  "drip_edge",
  "rake_edge",
  "valley",
  "hip",
  "eave",
  "pipe_boot",
  "roof_vent",
  "turbine_vent",
  "power_vent",
  "chimney_flashing",
  "step_flashing",
  "counter_flashing",
  "skylight_curb",
  "satellite_mount",
  "ac_condenser",
  "fence_panel",
  "fence_post",
  "gate",
  "mailbox",
  "outdoor_lighting",
  "stucco",
  "other",
]);

export const SeverityEnum = z.enum([
  "none", // No damage detected
  "minor", // Cosmetic or minimal damage
  "moderate", // Functional damage requiring repair
  "severe", // Structural damage requiring replacement
]);

export const QuadrantEnum = z.enum(["NW", "NE", "SW", "SE", "center"]);

export const WeatherEventEnum = z.enum(["hail", "wind", "debris", "water", "ice", "UV", "age"]);

export const MeasurementsSchema = z.object({
  width_inches: z.number().nullable().optional().describe("Estimated width in inches"),
  height_inches: z.number().nullable().optional().describe("Estimated height in inches"),
  diameter_inches: z
    .number()
    .nullable()
    .optional()
    .describe("Estimated diameter in inches (for hail impacts)"),
  depth_estimate: z.string().nullable().optional().describe("Estimated depth description"),
});

export const DamageItemSchema = z.object({
  type: DamageTypeEnum,
  location: z
    .string()
    .describe(
      "Specific location on structure (e.g. 'north-facing slope', 'ridge cap', 'left fascia')"
    )
    .default("unknown"),
  component: ComponentEnum,
  indicators: z
    .array(z.string())
    .describe(
      "Observable indicators (e.g. ['missing granules', 'exposed nail heads', 'cracked seal'])"
    )
    .default([]),
  estimated_severity: SeverityEnum,
  confidence: z.number().min(0).max(1).describe("AI confidence score for this damage item (0-1)"),
  notes: z.string().optional().describe("Additional context or observations"),
  quadrant: QuadrantEnum.optional().describe("Spatial quadrant: NW, NE, SW, SE, center"),
  weatherEvent: WeatherEventEnum.optional().describe(
    "Weather event attribution: hail, wind, debris, water, ice, UV, age"
  ),
  measurements: MeasurementsSchema.optional().describe("Estimated dimensions of the damage area"),
});

export type DamageItem = z.infer<typeof DamageItemSchema>;

// =============================================================================
// DAMAGE REPORT SCHEMA (Full Analysis)
// =============================================================================

export const DamageReportSchema = z.object({
  summary: z.string().describe("Brief overview of damage findings (2-3 sentences)"),
  items: z.array(DamageItemSchema).describe("List of individual damage items detected"),
  overall_severity: SeverityEnum.describe("Overall damage severity across all items"),
  overall_confidence: z.number().min(0).max(1).describe("Overall confidence in analysis (0-1)"),
  recommendations: z.array(z.string()).optional().describe("Recommended next steps or actions"),
  photo_quality_notes: z
    .string()
    .optional()
    .describe("Notes about photo quality, lighting, angles that affected analysis"),
});

export type DamageReport = z.infer<typeof DamageReportSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate a damage report from AI response
 * @throws ZodError if validation fails
 */
export function validateDamageReport(data: unknown): DamageReport {
  return DamageReportSchema.parse(data);
}

/**
 * Safe validation that returns success/error object
 */
export function safeParseDamageReport(data: unknown) {
  return DamageReportSchema.safeParse(data);
}

/**
 * Get human-readable severity label
 */
export function getSeverityLabel(severity: z.infer<typeof SeverityEnum>): string {
  const labels: Record<typeof severity, string> = {
    none: "No Damage",
    minor: "Minor Damage",
    moderate: "Moderate Damage",
    severe: "Severe Damage",
  };
  return labels[severity];
}

/**
 * Get severity color (Tailwind CSS classes)
 */
export function getSeverityColor(severity: z.infer<typeof SeverityEnum>): string {
  const colors: Record<typeof severity, string> = {
    none: "text-green-600 bg-green-50",
    minor: "text-yellow-600 bg-yellow-50",
    moderate: "text-orange-600 bg-orange-50",
    severe: "text-red-600 bg-red-50",
  };
  return colors[severity];
}

/**
 * Get component display name
 */
export function getComponentLabel(component: z.infer<typeof ComponentEnum>): string {
  const labels: Record<typeof component, string> = {
    shingle: "Shingle",
    tile: "Tile",
    metal_panel: "Metal Panel",
    flashing: "Flashing",
    underlayment: "Underlayment",
    fascia: "Fascia",
    soffit: "Soffit",
    gutter: "Gutter",
    downspout: "Downspout",
    skylight: "Skylight",
    chimney: "Chimney",
    hvac: "HVAC",
    siding: "Siding",
    window: "Window",
    door: "Door",
    ridge_cap: "Ridge Cap",
    starter_strip: "Starter Strip",
    drip_edge: "Drip Edge",
    rake_edge: "Rake Edge",
    valley: "Valley",
    hip: "Hip",
    eave: "Eave",
    pipe_boot: "Pipe Boot",
    roof_vent: "Roof Vent",
    turbine_vent: "Turbine Vent",
    power_vent: "Power Vent",
    chimney_flashing: "Chimney Flashing",
    step_flashing: "Step Flashing",
    counter_flashing: "Counter Flashing",
    skylight_curb: "Skylight Curb",
    satellite_mount: "Satellite Mount",
    ac_condenser: "AC Condenser",
    fence_panel: "Fence Panel",
    fence_post: "Fence Post",
    gate: "Gate",
    mailbox: "Mailbox",
    outdoor_lighting: "Outdoor Lighting",
    stucco: "Stucco",
    other: "Other",
  };
  return labels[component];
}

/**
 * Get damage type display name
 */
export function getDamageTypeLabel(type: z.infer<typeof DamageTypeEnum>): string {
  const labels: Record<typeof type, string> = {
    hail: "Hail Damage",
    wind: "Wind Damage",
    impact: "Impact Damage",
    thermal: "Thermal Damage",
    age: "Age-Related Wear",
    installation: "Installation Defect",
    granule_loss: "Granule Loss",
    bruising: "Bruising / Soft Spots",
    nail_pop: "Nail Pop",
    lifted_tab: "Lifted Tab",
    curling: "Shingle Curling",
    cupping: "Shingle Cupping",
    creasing: "Creasing",
    wind_crease: "Wind Crease",
    puncture: "Puncture",
    erosion: "Erosion",
    delamination: "Delamination",
    blistering: "Blistering",
    algae_stain: "Algae Stain",
    moss_growth: "Moss Growth",
    ponding: "Ponding",
    ice_dam_evidence: "Ice Dam Evidence",
    thermal_shock: "Thermal Shock",
    UV_degradation: "UV Degradation",
    unknown: "Unknown Cause",
  };
  return labels[type];
}

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

export const EXAMPLE_DAMAGE_REPORT: DamageReport = {
  summary:
    "Moderate hail damage detected on north-facing slope with multiple impact points. Several shingles show granule loss and exposed mat. Flashing integrity compromised at ridge cap.",
  items: [
    {
      type: "hail",
      location: "north-facing slope, upper section",
      component: "shingle",
      indicators: ["circular impact marks", "granule loss", "exposed mat"],
      estimated_severity: "moderate",
      confidence: 0.92,
      notes: "Multiple impact points consistent with 1-1.5 inch hail",
    },
    {
      type: "hail",
      location: "ridge cap",
      component: "flashing",
      indicators: ["denting", "paint damage"],
      estimated_severity: "minor",
      confidence: 0.78,
    },
  ],
  overall_severity: "moderate",
  overall_confidence: 0.87,
  recommendations: [
    "Recommend full roof inspection",
    "Document all impact points for insurance claim",
    "Check interior for water intrusion",
  ],
  photo_quality_notes:
    "Good lighting and angle. Could benefit from closer shots of individual damage points.",
};
