/**
 * AI Photo Annotation API
 *
 * COMPREHENSIVE DAMAGE DETECTION FOR ALL CLAIM TYPES
 *
 * Supports:
 * - All roofing types: Asphalt, Metal, Tile (clay/concrete/Spanish), TPO, EPDM, Modified Bitumen, Slate, Wood Shake
 * - Hail damage: Impact marks, spatter patterns, dented metals, bruised shingles
 * - Wind damage: Lifted shingles, torn materials, displaced components
 * - Fire damage: Char patterns, smoke damage, heat warping
 * - Water damage: Staining, rot, mold indicators, ponding
 * - Siding damage: Vinyl, fiber cement, wood, aluminum, stucco
 * - HVAC damage: AC unit fins, condenser damage, ductwork
 * - Gutters & accessories: Dents, separation, bent hangers
 * - Thermal imaging: Hot spots, moisture intrusion, insulation gaps
 *
 * Returns annotations with IRC/IBC building code references ready for PhotoAnnotator.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { apiError } from "@/lib/apiError";
import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";

// Lazy singleton for OpenAI
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const RequestSchema = z.object({
  imageUrl: z.string().url(),
  photoId: z.string().optional(),
  includeSlopes: z.boolean().default(false),
  // Extended to support all roof and component types
  roofType: z
    .enum([
      "asphalt_shingle",
      "metal_standing_seam",
      "metal_corrugated",
      "metal_ribbed",
      "tile_clay",
      "tile_concrete",
      "tile_spanish",
      "tile_flat",
      "tpo",
      "epdm",
      "modified_bitumen",
      "built_up",
      "flat_membrane",
      "slate",
      "wood_shake",
      "wood_shingle",
      "synthetic_shake",
      "composite",
      "unknown",
    ])
    .default("asphalt_shingle"),
  // NEW: Specify component being analyzed (for non-roof photos)
  componentType: z
    .enum([
      "roof",
      "siding",
      "gutter",
      "hvac",
      "window",
      "screen",
      "fence",
      "deck",
      "soffit_fascia",
      "chimney",
      "skylight",
      "general",
    ])
    .default("roof"),
  // NEW: Specify claim type for specialized detection
  claimType: z.enum(["hail", "wind", "fire", "water", "storm", "general"]).default("general"),
  // NEW: Flag for thermal/infrared images
  isThermalImage: z.boolean().default(false),
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE IRC/IBC CODE MAPPING
// Covers ALL roofing types, components, and damage patterns
// ═══════════════════════════════════════════════════════════════════════════════
const IRC_CODE_MAP: Record<string, string> = {
  // ─── HAIL DAMAGE ────────────────────────────────────────────────────────────
  hail_impact: "shingle_damage",
  hail_bruise: "shingle_damage",
  hail_dent: "metal_damage",
  hail_spatter: "metal_damage",
  hail_crack: "tile_damage",
  hail_puncture: "membrane_damage",

  // ─── WIND DAMAGE ────────────────────────────────────────────────────────────
  wind_damage: "shingle_damage",
  wind_lifted: "shingle_damage",
  wind_torn: "shingle_damage",
  wind_creased: "shingle_damage",
  wind_displaced: "shingle_damage",

  // ─── ASPHALT SHINGLE SPECIFIC ───────────────────────────────────────────────
  missing_shingles: "shingle_damage",
  granule_loss: "shingle_damage",
  lifted_curled: "shingle_damage",
  cracked_broken: "shingle_damage",
  blistering: "shingle_damage",
  algae_staining: "shingle_damage",
  mechanical_damage: "shingle_damage",
  improper_nailing: "nail_pattern",
  exposed_nail: "nail_pattern",
  nail_pops: "nail_pattern",

  // ─── METAL ROOFING ──────────────────────────────────────────────────────────
  metal_dent: "metal_damage",
  metal_puncture: "metal_damage",
  metal_rust: "metal_damage",
  metal_corrosion: "metal_damage",
  seam_separation: "metal_damage",
  fastener_failure: "metal_damage",
  oil_canning: "metal_damage",
  coating_damage: "metal_damage",

  // ─── TILE ROOFING ───────────────────────────────────────────────────────────
  tile_crack: "tile_damage",
  tile_broken: "tile_damage",
  tile_displaced: "tile_damage",
  tile_missing: "tile_damage",
  tile_spalling: "tile_damage",
  tile_delamination: "tile_damage",
  mortar_deterioration: "tile_damage",

  // ─── FLAT/MEMBRANE ROOFING ──────────────────────────────────────────────────
  membrane_puncture: "membrane_damage",
  membrane_tear: "membrane_damage",
  membrane_blister: "membrane_damage",
  membrane_seam_failure: "membrane_damage",
  ponding_water: "drainage",
  alligatoring: "membrane_damage",

  // ─── WOOD SHAKE/SHINGLE ─────────────────────────────────────────────────────
  shake_split: "wood_damage",
  shake_rot: "wood_damage",
  shake_missing: "wood_damage",
  shake_warped: "wood_damage",
  shake_moss: "wood_damage",

  // ─── SLATE ──────────────────────────────────────────────────────────────────
  slate_crack: "slate_damage",
  slate_broken: "slate_damage",
  slate_displaced: "slate_damage",
  slate_delamination: "slate_damage",

  // ─── FLASHING & TRIM ────────────────────────────────────────────────────────
  flashing_damage: "flashing",
  flashing_lifted: "flashing",
  flashing_rust: "flashing",
  flashing_missing: "flashing",
  drip_edge_damage: "drip_edge",
  drip_edge_bent: "drip_edge",

  // ─── VENTILATION & PENETRATIONS ─────────────────────────────────────────────
  ventilation_damage: "ventilation",
  vent_boot_damage: "flashing",
  vent_dented: "ventilation",
  pipe_collar_damage: "flashing",
  skylight_damage: "skylight",
  chimney_damage: "chimney",

  // ─── UNDERLAYMENT & STRUCTURE ───────────────────────────────────────────────
  underlayment_exposed: "underlayment",
  decking_damage: "structural",
  structural_damage: "structural",
  sagging: "structural",

  // ─── ICE & WATER ────────────────────────────────────────────────────────────
  ice_dam: "ice_barrier",
  water_damage: "ice_barrier",
  water_intrusion: "water_damage",
  water_staining: "water_damage",
  mold_indicators: "water_damage",
  rot_damage: "water_damage",

  // ─── SIDING ─────────────────────────────────────────────────────────────────
  siding_crack: "siding_damage",
  siding_dent: "siding_damage",
  siding_hole: "siding_damage",
  siding_missing: "siding_damage",
  siding_warped: "siding_damage",
  siding_faded: "siding_damage",
  stucco_crack: "stucco_damage",
  stucco_spalling: "stucco_damage",

  // ─── GUTTERS & DOWNSPOUTS ───────────────────────────────────────────────────
  gutter_dent: "gutter_damage",
  gutter_separation: "gutter_damage",
  gutter_sagging: "gutter_damage",
  gutter_clogged: "gutter_damage",
  downspout_damage: "gutter_damage",
  gutter_hanger_damage: "gutter_damage",

  // ─── HVAC / AC UNITS ────────────────────────────────────────────────────────
  ac_fin_damage: "hvac_damage",
  condenser_dent: "hvac_damage",
  hvac_panel_damage: "hvac_damage",
  ductwork_damage: "hvac_damage",

  // ─── SCREENS & WINDOWS ──────────────────────────────────────────────────────
  screen_tear: "screen_damage",
  screen_dent: "screen_damage",
  screen_frame_bent: "screen_damage",
  window_crack: "window_damage",
  window_seal_failure: "window_damage",

  // ─── FENCE & DECK ───────────────────────────────────────────────────────────
  fence_damage: "fence_damage",
  deck_damage: "deck_damage",

  // ─── FIRE DAMAGE ────────────────────────────────────────────────────────────
  char_damage: "fire_damage",
  smoke_damage: "fire_damage",
  heat_warping: "fire_damage",
  melting: "fire_damage",

  // ─── THERMAL IMAGING PATTERNS ───────────────────────────────────────────────
  thermal_hotspot: "thermal_anomaly",
  thermal_moisture: "thermal_anomaly",
  thermal_insulation_gap: "thermal_anomaly",
  thermal_air_leak: "thermal_anomaly",

  // ─── LEGACY MAPPINGS ────────────────────────────────────────────────────────
  structural: "structural",
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE IRC/IBC CODE DEFINITIONS
// Full code references with titles for all damage types
// ═══════════════════════════════════════════════════════════════════════════════
const IRC_CODES: Record<string, { code: string; title: string }> = {
  // ─── ROOFING ────────────────────────────────────────────────────────────────
  shingle_damage: { code: "IRC R905.2.7", title: "Asphalt Shingle Application" },
  underlayment: { code: "IRC R905.1.1", title: "Underlayment Requirements" },
  flashing: { code: "IRC R905.2.8", title: "Flashing Requirements" },
  drip_edge: { code: "IRC R905.2.8.5", title: "Drip Edge" },
  ventilation: { code: "IRC R806.1", title: "Ventilation Required" },
  ice_barrier: { code: "IRC R905.2.7.1", title: "Ice Barrier" },
  nail_pattern: { code: "IRC R905.2.6", title: "Fastener Requirements" },
  structural: { code: "IRC R802.1", title: "Roof Framing Requirements" },
  drainage: { code: "IRC R903.4", title: "Roof Drainage" },

  // ─── METAL ROOFING ──────────────────────────────────────────────────────────
  metal_damage: { code: "IRC R905.10", title: "Metal Roof Shingles/Panels" },

  // ─── TILE ROOFING ───────────────────────────────────────────────────────────
  tile_damage: { code: "IRC R905.3", title: "Clay & Concrete Tile" },

  // ─── MEMBRANE/FLAT ROOFING ──────────────────────────────────────────────────
  membrane_damage: { code: "IRC R905.9/R905.11-13", title: "Membrane Roofing Systems" },

  // ─── WOOD ROOFING ───────────────────────────────────────────────────────────
  wood_damage: { code: "IRC R905.7-8", title: "Wood Shingles/Shakes" },

  // ─── SLATE ROOFING ──────────────────────────────────────────────────────────
  slate_damage: { code: "IRC R905.6", title: "Slate Shingles" },

  // ─── SKYLIGHTS ──────────────────────────────────────────────────────────────
  skylight: { code: "IRC R308.6", title: "Skylights and Sloped Glazing" },

  // ─── CHIMNEY ────────────────────────────────────────────────────────────────
  chimney: { code: "IRC R1003", title: "Masonry Chimneys" },

  // ─── WATER DAMAGE ───────────────────────────────────────────────────────────
  water_damage: { code: "IRC R703.1", title: "Weather Protection" },

  // ─── SIDING ─────────────────────────────────────────────────────────────────
  siding_damage: { code: "IRC R703.3-11", title: "Wall Covering Standards" },
  stucco_damage: { code: "IRC R703.7", title: "Stucco/Portland Cement Plaster" },

  // ─── GUTTERS ────────────────────────────────────────────────────────────────
  gutter_damage: { code: "IRC R903.4", title: "Roof Drainage" },

  // ─── HVAC ───────────────────────────────────────────────────────────────────
  hvac_damage: { code: "IRC M1401", title: "HVAC General Requirements" },

  // ─── SCREENS & WINDOWS ──────────────────────────────────────────────────────
  screen_damage: { code: "IRC R303.8", title: "Required Window Openings" },
  window_damage: { code: "IRC R308", title: "Glazing Requirements" },

  // ─── FENCE & DECK ───────────────────────────────────────────────────────────
  fence_damage: { code: "IBC 1607", title: "Guards & Barriers" },
  deck_damage: { code: "IRC R507", title: "Exterior Decks" },

  // ─── FIRE DAMAGE ────────────────────────────────────────────────────────────
  fire_damage: { code: "IBC Chapter 7", title: "Fire and Smoke Protection" },

  // ─── THERMAL ANALYSIS ───────────────────────────────────────────────────────
  thermal_anomaly: { code: "IRC N1102", title: "Building Thermal Envelope" },
};

interface DamageDetection {
  type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  description: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  ircCodeKey?: string;
  // NEW: Material identification
  materialIdentified?: string;
  materialBrand?: string;
  estimatedAge?: string;
}

interface MaterialAnalysis {
  primaryMaterial: string;
  materialSubtype?: string;
  estimatedBrand?: string;
  estimatedAge?: string;
  condition: "good" | "fair" | "poor" | "failed";
  colorDescription?: string;
}

interface AnnotationResponse {
  id: string;
  type: "ai_detection";
  x: number;
  y: number;
  width: number;
  height: number;
  damageType: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  ircCode?: string;
  caption: string;
  confidence: number;
  materialIdentified?: string;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId, userId } = auth;

  try {
    const body = await request.json();
    const validated = RequestSchema.parse(body);

    logger.info("[PHOTO_ANNOTATE]", {
      orgId,
      userId,
      photoId: validated.photoId,
      roofType: validated.roofType,
      componentType: validated.componentType,
      claimType: validated.claimType,
      isThermal: validated.isThermalImage,
    });

    const openai = getOpenAI();

    // Fetch and encode image
    const imageResponse = await fetch(validated.imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    // Determine content type
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    // Build comprehensive prompt for damage detection
    const prompt = buildAnnotationPrompt(
      validated.roofType,
      validated.includeSlopes,
      validated.componentType,
      validated.claimType,
      validated.isThermalImage
    );

    // Build specialized system prompt based on analysis type
    const systemPrompt = buildSystemPrompt(
      validated.componentType,
      validated.claimType,
      validated.isThermalImage
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content || "{}";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[PHOTO_ANNOTATE] No JSON in response", { content: content.substring(0, 200) });
      return NextResponse.json({
        success: true,
        annotations: [],
        slopeData: null,
        materialAnalysis: null,
        overallCaption: "No damage detected",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const detections = parsed.detections || [];
    const slopeData = parsed.slopeAnalysis || null;
    const materialAnalysis = parsed.materialAnalysis || null;

    // Convert detections to annotations format
    const annotations: AnnotationResponse[] = (detections as DamageDetection[]).map(
      (detection, index) => {
        const damageTypeKey = detection.type.toLowerCase().replace(/[^a-z_]/g, "_");
        const ircCodeKey = IRC_CODE_MAP[damageTypeKey] || determineCodeFromType(damageTypeKey);

        return {
          id: `ai-${validated.photoId || "photo"}-${Date.now()}-${index}`,
          type: "ai_detection" as const,
          x: detection.boundingBox.x,
          y: detection.boundingBox.y,
          width: detection.boundingBox.width,
          height: detection.boundingBox.height,
          damageType: formatDamageType(detection.type),
          severity: detection.severity,
          ircCode: ircCodeKey,
          caption: buildCaption(detection, ircCodeKey),
          confidence: detection.confidence,
          materialIdentified: detection.materialIdentified,
        };
      }
    );

    // Generate overall caption
    const overallCaption = generateOverallCaption(annotations, materialAnalysis);

    return NextResponse.json({
      success: true,
      annotations,
      slopeData,
      materialAnalysis,
      overallAssessment: parsed.overallAssessment || null,
      overallCaption,
      photoId: validated.photoId,
      componentType: validated.componentType,
      claimType: validated.claimType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", { errors: error.errors });
    }
    logger.error("[PHOTO_ANNOTATE] Error", { error });
    return apiError(500, "ANALYSIS_ERROR", "Failed to analyze photo");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT BUILDER - Specialized for different analysis types
// ═══════════════════════════════════════════════════════════════════════════════
function buildSystemPrompt(componentType: string, claimType: string, isThermal: boolean): string {
  if (isThermal) {
    return `You are an expert thermal imaging analyst for building inspections and insurance claims.
You analyze infrared/thermal images to identify:
- Heat anomalies indicating moisture intrusion
- Missing or damaged insulation (cold spots)
- Air leaks around windows, doors, and penetrations
- HVAC issues (blocked vents, duct leaks)
- Electrical hot spots
- Roof deck moisture under membrane roofing

Always provide precise bounding box locations for each anomaly found.
Temperature differential significance: >5°F difference often indicates a problem.`;
  }

  if (claimType === "fire") {
    return `You are an expert fire damage assessor for insurance claims.
You analyze photos to identify and document:
- Direct flame/char damage patterns
- Smoke damage (soot deposits, discoloration)
- Heat damage (warping, melting, discoloration without char)
- Water damage from fire suppression
- Structural compromise from fire
- Salvageable vs. total loss areas

Understand fire spread patterns and document origin indicators when visible.
Always be thorough but conservative - only identify damage you can clearly see.`;
  }

  if (claimType === "water") {
    return `You are an expert water damage assessor for insurance claims.
You analyze photos to identify and document:
- Active water intrusion points
- Water staining patterns (indicating source direction)
- Mold or mildew growth indicators
- Wood rot or deterioration
- Efflorescence on masonry
- Ponding or standing water
- Swelling, warping, or buckling materials
- Paint bubbling or peeling from moisture

Document the Category (clean/gray/black water indicators) when visible.
Always be thorough but conservative - only identify damage you can clearly see.`;
  }

  if (componentType === "siding") {
    return `You are an expert siding and exterior wall damage assessor for insurance claims.
You analyze photos to identify damage on:
- Vinyl siding: cracks, holes, warping, fading, detachment
- Fiber cement (Hardie): cracks, chips, delamination
- Wood siding: rot, cracks, warping, insect damage
- Aluminum siding: dents, punctures, oxidation
- Stucco: cracks (structural vs. cosmetic), spalling, water intrusion
- Brick veneer: mortar damage, spalling, cracks

Look for hail impact patterns: dents, holes, and "hail spatter" marks.
Understand IRC R703 exterior wall covering requirements.
Always be thorough but conservative - only identify damage you can clearly see.`;
  }

  if (componentType === "hvac") {
    return `You are an expert HVAC damage assessor for insurance claims.
You analyze photos to identify damage on:
- Condenser units: fin damage (count bent fins), cabinet dents, fan damage
- Compressor damage indicators
- Refrigerant line damage
- Ductwork: dents, disconnections, insulation damage
- Vents and grilles: bent fins, debris impact

Hail damage signature: Look for "spattering" patterns on painted surfaces and systematically bent/crushed fins.
Bent condenser fins reduce efficiency - document percentage of fin damage when estimable.
Always be thorough but conservative - only identify damage you can clearly see.`;
  }

  if (componentType === "gutter") {
    return `You are an expert gutter and drainage damage assessor for insurance claims.
You analyze photos to identify damage on:
- Gutters: dents, punctures, separation at seams, sagging
- Downspouts: dents, disconnections, crushed sections
- Gutter guards/screens: dents, tears, displacement
- Fascia and soffit: water damage, rot, detachment
- Splash blocks and drainage

Hail signature: Multiple small dents in a pattern across the gutter run.
Document slope issues affecting drainage.
Always be thorough but conservative - only identify damage you can clearly see.`;
  }

  // Default roofing expert
  return `You are an expert property damage assessor specializing in roofing and exterior damage for insurance claims.
You analyze photos to identify damage and provide precise bounding box locations.
You understand IRC building codes and can map damage types to applicable code sections.

DAMAGE DETECTION EXPERTISE:
- Hail damage: Impact marks, bruising, spatter patterns on all surfaces
- Wind damage: Lifted shingles, torn materials, creasing, displaced components  
- Storm damage: Combined wind/hail/debris patterns
- General wear: Age-related deterioration vs. storm damage

MATERIAL IDENTIFICATION:
- Roofing: Asphalt (3-tab, architectural, designer), metal (standing seam, corrugated, ribbed), tile (clay, concrete, Spanish S), slate, wood shake/shingle, TPO, EPDM, modified bitumen
- Can estimate manufacturer and age when identifiable

Always be thorough but conservative - only identify damage you can clearly see.
Distinguish between pre-existing conditions and recent storm damage when possible.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE PROMPT BUILDER
// Generates specialized prompts based on component, claim type, and analysis mode
// ═══════════════════════════════════════════════════════════════════════════════
function buildAnnotationPrompt(
  roofType: string,
  includeSlopes: boolean,
  componentType: string = "roof",
  claimType: string = "general",
  isThermalImage: boolean = false
): string {
  // Thermal imaging analysis prompt
  if (isThermalImage) {
    return buildThermalPrompt();
  }

  // Fire damage analysis prompt
  if (claimType === "fire") {
    return buildFireDamagePrompt();
  }

  // Water damage analysis prompt
  if (claimType === "water") {
    return buildWaterDamagePrompt();
  }

  // Component-specific prompts
  if (componentType === "siding") {
    return buildSidingPrompt(claimType);
  }
  if (componentType === "hvac") {
    return buildHVACPrompt(claimType);
  }
  if (componentType === "gutter") {
    return buildGutterPrompt(claimType);
  }
  if (componentType === "window" || componentType === "screen") {
    return buildWindowScreenPrompt(claimType);
  }

  // Default: Comprehensive roofing analysis prompt
  return buildRoofingPrompt(roofType, includeSlopes, claimType);
}

function buildRoofingPrompt(roofType: string, includeSlopes: boolean, claimType: string): string {
  const roofTypeDisplay = roofType.replace(/_/g, " ");

  let damageTypes = "";
  if (claimType === "hail") {
    damageTypes = `HAIL DAMAGE PATTERNS TO IDENTIFY:
- Hail impact marks/bruises on shingles (soft spots, indentations)
- Hail spatter patterns on metal surfaces (paint chips, bare metal exposure)
- Granule displacement/loss in impact pattern
- Fractured/cracked shingles from impact
- Dented or punctured metal components (vents, flashing, drip edge)
- Hail hits on exposed nail heads
- Damage to ridge caps and hip shingles
- Tile cracks or chips from hail impact
- Dents on roof jacks, pipe boots, and ventilation`;
  } else if (claimType === "wind") {
    damageTypes = `WIND DAMAGE PATTERNS TO IDENTIFY:
- Lifted/raised shingle edges or tabs
- Creased shingles (folded back then down)
- Missing shingles (document pattern of loss)
- Torn shingles or torn-off portions
- Displaced ridge caps
- Damaged or missing drip edge
- Lifted or displaced flashing
- Debris impact damage
- Tree/branch damage
- Damaged ventilation components`;
  } else {
    damageTypes = `DAMAGE PATTERNS TO IDENTIFY:
- Hail impacts: bruises, dents, granule loss in circular patterns
- Wind damage: lifted edges, creasing, missing material
- Missing or displaced shingles
- Granule loss (natural aging vs. storm damage)
- Lifted/curled shingles (cupping, clawing)
- Cracked or broken materials
- Flashing damage: lifted, missing, rusted, improperly sealed
- Underlayment exposure
- Ventilation damage: dented boots, cracked housings
- Drip edge damage: bent, missing, improperly installed
- Structural concerns: sagging, ponding areas
- Water damage indicators: staining, rot, algae
- Nail pops or exposed fasteners`;
  }

  let prompt = `Analyze this roofing photo comprehensively. 

MATERIAL TYPE: ${roofTypeDisplay}

${damageTypes}

MATERIAL IDENTIFICATION:
Look for and identify:
- Shingle style: 3-tab, architectural/dimensional, designer/luxury
- Manufacturer indicators (colors, patterns, textures)
- Material age estimate based on condition/style
- Color description

For each damage area found:
1. Identify the specific damage type
2. Assess severity: Low, Medium, High, or Critical
   - Low: Cosmetic, no immediate action needed
   - Medium: Functional impact, repairs recommended
   - High: Significant damage, repairs needed soon
   - Critical: Immediate attention required, water intrusion risk
3. Provide a bounding box as percentage coordinates (0-100)
4. Estimate confidence (0.0-1.0)
5. Brief description with specific observations

Return JSON in this exact format:
{
  "materialAnalysis": {
    "primaryMaterial": "string - e.g., 'Asphalt Shingle - Architectural'",
    "materialSubtype": "string - e.g., '3-tab' or 'dimensional' or 'standing seam'",
    "estimatedBrand": "string or null - e.g., 'GAF Timberline' if identifiable",
    "estimatedAge": "string - e.g., '10-15 years'",
    "condition": "good" | "fair" | "poor" | "failed",
    "colorDescription": "string - e.g., 'Weathered Wood brown/gray blend'"
  },
  "detections": [
    {
      "type": "string - damage type (use snake_case: hail_impact, wind_lifted, granule_loss, etc.)",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string - specific observation",
      "boundingBox": {
        "x": number (0-100, percentage from left),
        "y": number (0-100, percentage from top),
        "width": number (0-100, percentage width),
        "height": number (0-100, percentage height)
      },
      "confidence": number (0.0-1.0),
      "materialIdentified": "string - if different material in this area"
    }
  ],
  "overallAssessment": {
    "totalDamageAreas": number,
    "highestSeverity": "Low" | "Medium" | "High" | "Critical",
    "primaryDamageType": "string",
    "damagePattern": "string - e.g., 'Random hail impacts' or 'Wind damage on south exposure'",
    "recommendedAction": "string - e.g., 'Full replacement recommended' or 'Spot repairs needed'"
  }`;

  if (includeSlopes) {
    prompt += `,
  "slopeAnalysis": {
    "estimatedPitch": "string - e.g., '6:12' or '8:12'",
    "confidence": number,
    "roofPlanes": number,
    "complexity": "simple" | "moderate" | "complex"
  }`;
  }

  prompt += `
}

Be precise with bounding boxes. Only identify damage you can clearly see. 
If no damage is visible, return an empty detections array.
Distinguish between storm damage and pre-existing wear when possible.`;

  return prompt;
}

function buildThermalPrompt(): string {
  return `Analyze this thermal/infrared image for building anomalies.

THERMAL PATTERNS TO IDENTIFY:
- Hot spots: Electrical issues, HVAC problems, friction points
- Cold spots: Missing insulation, air infiltration
- Moisture signatures: Wet insulation, active leaks (appear as temperature differential)
- Air leaks: Around windows, doors, penetrations
- HVAC anomalies: Blocked ducts, equipment issues

For each anomaly found:
1. Identify the type of thermal anomaly
2. Assess severity based on temperature differential
3. Provide bounding box coordinates (0-100%)
4. Estimate confidence and describe likely cause

Return JSON:
{
  "materialAnalysis": {
    "primaryMaterial": "Thermal Image Analysis",
    "condition": "N/A"
  },
  "detections": [
    {
      "type": "thermal_hotspot" | "thermal_moisture" | "thermal_insulation_gap" | "thermal_air_leak",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string - describe the anomaly and likely cause",
      "boundingBox": { "x": number, "y": number, "width": number, "height": number },
      "confidence": number,
      "temperatureDifferential": "string - estimated temp difference if visible"
    }
  ],
  "overallAssessment": {
    "totalDamageAreas": number,
    "highestSeverity": "Low" | "Medium" | "High" | "Critical",
    "primaryDamageType": "string",
    "recommendedAction": "string"
  }
}`;
}

function buildFireDamagePrompt(): string {
  return `Analyze this photo for fire damage.

FIRE DAMAGE PATTERNS TO IDENTIFY:
- Direct flame/char damage: Blackened surfaces, complete combustion
- Heat damage: Melting, warping, discoloration without char
- Smoke damage: Soot deposits, smoke staining patterns
- Water damage from fire suppression
- Structural compromise: Weakened framing, collapsed areas
- Smoke line indicators (V-patterns pointing to origin)

For each damage area found:
1. Identify damage type (char_damage, smoke_damage, heat_warping, melting)
2. Assess severity (related to structural integrity and restoration potential)
3. Provide bounding box coordinates (0-100%)
4. Note if area appears salvageable vs. total loss

Return JSON:
{
  "materialAnalysis": {
    "primaryMaterial": "string - original material type if identifiable",
    "condition": "poor" | "failed"
  },
  "detections": [
    {
      "type": "char_damage" | "smoke_damage" | "heat_warping" | "melting" | "water_damage",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string - specific damage observation",
      "boundingBox": { "x": number, "y": number, "width": number, "height": number },
      "confidence": number,
      "salvageable": boolean
    }
  ],
  "overallAssessment": {
    "totalDamageAreas": number,
    "highestSeverity": "Critical",
    "primaryDamageType": "string",
    "originIndicators": "string - if any V-patterns or pour patterns visible",
    "recommendedAction": "string"
  }
}`;
}

function buildWaterDamagePrompt(): string {
  return `Analyze this photo for water damage.

WATER DAMAGE PATTERNS TO IDENTIFY:
- Active water intrusion: Dripping, pooling, wet surfaces
- Water staining: Tide marks, discoloration patterns
- Mold/mildew indicators: Dark spots, fuzzy growth, musty-looking areas
- Material deterioration: Warping, buckling, swelling
- Wood rot: Soft spots, discoloration, fungal growth
- Paint/finish failure: Bubbling, peeling, flaking
- Efflorescence: White mineral deposits on masonry
- Rust staining: From metal contact

For each damage area found:
1. Identify damage type and water category if determinable
2. Assess severity based on extent and duration indicators
3. Provide bounding box coordinates (0-100%)
4. Note if active leak vs. historical damage

Return JSON:
{
  "materialAnalysis": {
    "primaryMaterial": "string - affected material type",
    "condition": "fair" | "poor" | "failed"
  },
  "detections": [
    {
      "type": "water_intrusion" | "water_staining" | "mold_indicators" | "rot_damage" | "material_warping",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string - specific observation with duration estimate if possible",
      "boundingBox": { "x": number, "y": number, "width": number, "height": number },
      "confidence": number,
      "activeVsHistorical": "active" | "historical" | "unknown"
    }
  ],
  "overallAssessment": {
    "totalDamageAreas": number,
    "highestSeverity": "Low" | "Medium" | "High" | "Critical",
    "primaryDamageType": "string",
    "waterCategory": "Category 1 (Clean)" | "Category 2 (Gray)" | "Category 3 (Black)" | "Unknown",
    "recommendedAction": "string"
  }
}`;
}

function buildSidingPrompt(claimType: string): string {
  const hailSpecific =
    claimType === "hail"
      ? `
HAIL DAMAGE SIGNATURES:
- Vinyl: Cracks, holes, chips along exposure
- Fiber cement: Corner chips, cracks, divots
- Aluminum: Dents (check for hail pattern across runs)
- Wood: Dents, gouges, split grain from impacts
- Stucco: Chips, divots in pattern
Look for "hail spatter" on painted surfaces showing impact points.`
      : "";

  return `Analyze this siding/exterior wall photo.

IDENTIFY SIDING TYPE:
- Vinyl siding (lap, shake, board & batten)
- Fiber cement (Hardie board, lap, shake, panel)
- Wood siding (clapboard, shake, board & batten)
- Aluminum siding
- Stucco/EIFS
- Brick veneer

${hailSpecific}

DAMAGE PATTERNS TO IDENTIFY:
- Cracks (stress cracks, impact cracks, structural cracks)
- Holes or punctures
- Dents or indentations
- Warping or buckling
- Fading or discoloration
- Rot or deterioration (wood)
- Delamination (fiber cement)
- Mortar/pointing damage (brick)

Return JSON:
{
  "materialAnalysis": {
    "primaryMaterial": "string - siding type",
    "materialSubtype": "string - e.g., 'lap' or 'shake' style",
    "estimatedBrand": "string if identifiable",
    "condition": "good" | "fair" | "poor" | "failed",
    "colorDescription": "string"
  },
  "detections": [
    {
      "type": "siding_crack" | "siding_dent" | "siding_hole" | "siding_warped" | etc.",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string",
      "boundingBox": { "x": number, "y": number, "width": number, "height": number },
      "confidence": number
    }
  ],
  "overallAssessment": {
    "totalDamageAreas": number,
    "highestSeverity": "Low" | "Medium" | "High" | "Critical",
    "primaryDamageType": "string",
    "recommendedAction": "string"
  }
}`;
}

function buildHVACPrompt(claimType: string): string {
  return `Analyze this HVAC/AC unit photo for damage.

IDENTIFY EQUIPMENT TYPE:
- Condensing unit (residential split system)
- Package unit (rooftop)
- Mini-split outdoor unit
- Ductwork

HAIL DAMAGE SIGNATURES (common on AC units):
- Bent/crushed condenser fins (estimate percentage affected)
- Cabinet dents and dings
- Fan blade damage
- Hail spatter on painted surfaces (chips showing metal)
- Top grille damage

DAMAGE PATTERNS TO IDENTIFY:
- Fin damage: Bent, crushed, or matted fins
- Cabinet damage: Dents, punctures, rust
- Fan/blade damage: Bent, cracked, missing
- Coil damage: Visible damage to coils
- Refrigerant line damage
- Electrical component exposure
- Overall unit condition

Return JSON:
{
  "materialAnalysis": {
    "primaryMaterial": "HVAC Equipment",
    "materialSubtype": "string - unit type",
    "estimatedBrand": "string if visible",
    "estimatedAge": "string",
    "condition": "good" | "fair" | "poor" | "failed"
  },
  "detections": [
    {
      "type": "ac_fin_damage" | "condenser_dent" | "hvac_panel_damage" | etc.",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string - include fin damage % if applicable",
      "boundingBox": { "x": number, "y": number, "width": number, "height": number },
      "confidence": number,
      "finDamagePercent": number (0-100 if fin damage)
    }
  ],
  "overallAssessment": {
    "totalDamageAreas": number,
    "highestSeverity": "Low" | "Medium" | "High" | "Critical",
    "estimatedFinDamagePercent": number,
    "operationalImpact": "string - e.g., 'Reduced efficiency' or 'Non-operational'",
    "recommendedAction": "string"
  }
}`;
}

function buildGutterPrompt(claimType: string): string {
  return `Analyze this gutter/drainage system photo.

IDENTIFY GUTTER TYPE:
- K-style (ogee)
- Half-round
- Box gutter
- Material: Aluminum, vinyl, steel, copper

DAMAGE PATTERNS TO IDENTIFY:
- Dents (hail damage pattern across the run)
- Punctures or holes
- Seam separation
- Sagging sections (hanger damage)
- End cap damage
- Downspout damage (dents, disconnections)
- Gutter guard/screen damage
- Fascia/soffit damage behind gutters

Return JSON:
{
  "materialAnalysis": {
    "primaryMaterial": "string - gutter material",
    "materialSubtype": "string - gutter style",
    "condition": "good" | "fair" | "poor" | "failed",
    "colorDescription": "string"
  },
  "detections": [
    {
      "type": "gutter_dent" | "gutter_separation" | "gutter_sagging" | "downspout_damage",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string - include dent count if hail damage",
      "boundingBox": { "x": number, "y": number, "width": number, "height": number },
      "confidence": number
    }
  ],
  "overallAssessment": {
    "totalDamageAreas": number,
    "highestSeverity": "Low" | "Medium" | "High" | "Critical",
    "hailDentCount": number (if applicable),
    "drainageImpact": "string",
    "recommendedAction": "string"
  }
}`;
}

function buildWindowScreenPrompt(claimType: string): string {
  return `Analyze this window/screen photo for damage.

DAMAGE PATTERNS TO IDENTIFY:
Windows:
- Glass cracks (stress, impact, thermal)
- Seal failure (fogging between panes)
- Frame damage (dents, warping, rot)
- Weather stripping damage
- Hardware damage

Screens:
- Tears or holes
- Stretched/bulging mesh
- Frame dents or bends
- Corner damage
- Hail impacts (small holes or stretched mesh)

Return JSON:
{
  "materialAnalysis": {
    "primaryMaterial": "Window" | "Screen",
    "materialSubtype": "string - type details",
    "condition": "good" | "fair" | "poor" | "failed"
  },
  "detections": [
    {
      "type": "screen_tear" | "screen_dent" | "screen_frame_bent" | "window_crack" | "window_seal_failure",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string",
      "boundingBox": { "x": number, "y": number, "width": number, "height": number },
      "confidence": number
    }
  ],
  "overallAssessment": {
    "totalDamageAreas": number,
    "highestSeverity": "Low" | "Medium" | "High" | "Critical",
    "primaryDamageType": "string",
    "recommendedAction": "string"
  }
}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function determineCodeFromType(damageTypeKey: string): string {
  // Fallback code determination based on damage type patterns
  if (damageTypeKey.includes("metal") || damageTypeKey.includes("dent")) return "metal_damage";
  if (damageTypeKey.includes("tile")) return "tile_damage";
  if (damageTypeKey.includes("shake") || damageTypeKey.includes("wood")) return "wood_damage";
  if (damageTypeKey.includes("slate")) return "slate_damage";
  if (
    damageTypeKey.includes("membrane") ||
    damageTypeKey.includes("tpo") ||
    damageTypeKey.includes("epdm")
  )
    return "membrane_damage";
  if (damageTypeKey.includes("flash")) return "flashing";
  if (damageTypeKey.includes("vent")) return "ventilation";
  if (damageTypeKey.includes("gutter") || damageTypeKey.includes("downspout"))
    return "gutter_damage";
  if (damageTypeKey.includes("siding") || damageTypeKey.includes("stucco")) return "siding_damage";
  if (
    damageTypeKey.includes("hvac") ||
    damageTypeKey.includes("ac_") ||
    damageTypeKey.includes("condenser")
  )
    return "hvac_damage";
  if (damageTypeKey.includes("screen")) return "screen_damage";
  if (damageTypeKey.includes("window")) return "window_damage";
  if (
    damageTypeKey.includes("fire") ||
    damageTypeKey.includes("char") ||
    damageTypeKey.includes("smoke")
  )
    return "fire_damage";
  if (
    damageTypeKey.includes("water") ||
    damageTypeKey.includes("moisture") ||
    damageTypeKey.includes("mold")
  )
    return "water_damage";
  if (damageTypeKey.includes("thermal")) return "thermal_anomaly";
  return "shingle_damage"; // Default fallback
}

function formatDamageType(type: string): string {
  // Convert snake_case or other formats to Title Case
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildCaption(detection: DamageDetection, ircCodeKey: string): string {
  const ircInfo = IRC_CODES[ircCodeKey];
  let caption = `${formatDamageType(detection.type)} - ${detection.severity} severity. ${detection.description}`;

  if (ircInfo) {
    caption += ` Ref: ${ircInfo.code} (${ircInfo.title})`;
  }

  return caption;
}

function generateOverallCaption(
  annotations: AnnotationResponse[],
  materialAnalysis?: MaterialAnalysis | null
): string {
  if (annotations.length === 0) {
    if (materialAnalysis) {
      return `No visible damage detected. Material identified: ${materialAnalysis.primaryMaterial}. Condition: ${materialAnalysis.condition}.`;
    }
    return "No visible damage detected in this photo.";
  }

  const damageTypes = [...new Set(annotations.map((a) => a.damageType))];
  const severities = annotations.map((a) => a.severity);
  const highestSeverity = severities.includes("Critical")
    ? "Critical"
    : severities.includes("High")
      ? "High"
      : severities.includes("Medium")
        ? "Medium"
        : "Low";

  const ircCodes = [...new Set(annotations.map((a) => a.ircCode).filter(Boolean))];

  let caption = `AI detected ${annotations.length} damage area${annotations.length > 1 ? "s" : ""}.`;

  if (materialAnalysis?.primaryMaterial) {
    caption += ` Material: ${materialAnalysis.primaryMaterial}.`;
  }

  caption += ` Primary damage: ${damageTypes.slice(0, 3).join(", ")}.`;
  caption += ` Highest severity: ${highestSeverity}.`;

  if (ircCodes.length > 0) {
    const codeRefs = ircCodes
      .slice(0, 3)
      .map((key) => IRC_CODES[key!]?.code)
      .filter(Boolean);
    if (codeRefs.length > 0) {
      caption += ` Applicable codes: ${codeRefs.join(", ")}.`;
    }
  }

  return caption;
}
