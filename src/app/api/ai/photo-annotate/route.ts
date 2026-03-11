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
  imageUrl: z.string().min(1),
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
  stucco_damage: "stucco_damage",
  stucco_divot: "stucco_damage",
  stucco_delamination: "stucco_damage",

  // ─── PAINT / SURFACE DAMAGE ─────────────────────────────────────────────────
  paint_chipping: "siding_damage",
  paint_peeling: "water_damage",
  paint_spatter: "siding_damage",
  paint_bubbling: "water_damage",
  surface_spatter: "siding_damage",

  // ─── GARAGE DOOR ────────────────────────────────────────────────────────────
  garage_door_dent: "garage_door_damage",
  garage_door_panel: "garage_door_damage",
  garage_door_paint: "garage_door_damage",
  garage_door_seal: "garage_door_damage",

  // ─── MOISTURE / WOOD DAMAGE ─────────────────────────────────────────────────
  moisture_damage: "water_damage",
  wood_rot: "water_damage",
  material_warping: "water_damage",
  paint_failure: "water_damage",

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

  // ─── GARAGE DOOR ────────────────────────────────────────────────────────────
  garage_door_damage: { code: "IRC R309.1", title: "Garage Door Opening/Protection" },

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
    return `You are a HAAG Engineering certified water damage assessor for insurance claims.
You analyze photos to identify and document ALL water damage indicators with IICRC S500 standards.

WATER DAMAGE IDENTIFICATION (be thorough — look for ALL signs):
- Active water intrusion points (dripping, running water)
- Water staining patterns on walls, ceilings, floors (indicating source direction)
- Mold or mildew growth indicators (dark spots, fuzzy growth, discoloration)
- Wood rot or deterioration (soft spots, darkened wood, fungal growth, splitting)
- Paint bubbling, peeling, or flaking from moisture underneath
- Efflorescence on masonry (white mineral deposits = water migration)
- Ponding or standing water
- Swelling, warping, or buckling of materials (floors, walls, trim)
- Baseboard separation from walls (swelling indicator)
- Drywall sagging or crumbling
- Carpet/flooring discoloration or warping
- Rust staining from metal contact with moisture
- Musty-looking areas suggesting hidden moisture

WOOD & WALL DAMAGE (often missed — look carefully):
- Wood trim/baseboards: swelling, discoloration, softness, paint failure
- Wall surfaces: water lines, staining, bubbling paint, crumbling drywall
- Ceiling: sagging, brown stains, ring patterns, drip marks
- Subfloor: warping visible through flooring, soft spots
- Framing: visible rot, dark discoloration, fungal growth
- Exterior wood: paint peeling, wood grain raising, checking, splitting

Document the IICRC Water Category when visible:
- Category 1 (Clean): From supply lines, rain
- Category 2 (Gray): Washing machine, dishwasher, toilet overflow (no feces)
- Category 3 (Black): Sewage, ground water, river flooding

BOUNDING BOX ACCURACY:
- Coordinates: 0-100 percentages, 0,0 = TOP-LEFT
- Mark EACH damaged area separately with tight boxes
- Scan entire image systematically

Always be thorough — document EVERY sign of water intrusion or moisture damage.
Paint peeling on walls = water damage that must be documented.`;
  }

  if (componentType === "siding") {
    return `You are a HAAG Engineering certified siding and exterior wall damage assessor for insurance claims.
You analyze photos to identify damage on ALL exterior surfaces including siding, stucco, garage doors, trim, and fascia.

CRITICAL BOUNDING BOX ACCURACY:
- Coordinates are 0-100 percentages where 0,0 is TOP-LEFT
- y=0 is the TOP of the image, y=100 is the BOTTOM
- Place boxes EXACTLY where you see damage, not at the bottom by default
- If paint chips are in the MIDDLE of the photo, use y values around 40-60
- If damage is near the TOP, use y values around 10-30
- Each bounding box should TIGHTLY wrap the specific damage
- Mark EACH individual hit separately — do not group into one big box

IDENTIFY MATERIAL TYPE:
- Vinyl siding (lap, shake, board & batten, Dutch lap)
- Fiber cement (Hardie board, lap, shake, panel, Artisan)
- Wood siding (clapboard, shake, board & batten, tongue & groove)
- Aluminum siding (horizontal, vertical)
- Stucco / EIFS (synthetic stucco)
- Brick veneer
- Stone veneer
- Metal panels
- Garage door (steel, aluminum, wood, composite, fiberglass)

HAIL DAMAGE SIGNATURES (per HAAG standards — use "hail_impact" NOT "crack"):
- Vinyl: Cracks, holes, chips along exposure line, fracture marks
- Fiber cement: Corner chips, edge spalling, divots, cracks from impact
- Aluminum: Dents in random pattern across runs (HAIL, not "dent")
- Wood: Dents, gouges, split grain from impacts
- Stucco/EIFS: Circular chips, divots, spalling in random pattern = HAIL
- Garage doors: Panel dents (random = hail, concentrated = impact)
- ALL painted surfaces: SPATTER MARKS — random circular paint chips exposing substrate

CRITICAL - TRIM AND FASCIA DAMAGE (commonly missed):
- Painted wood trim/fascia: Paint CHIPPING in circular patterns = HAIL SIGNATURE
- Wind trim/J-channel: Dents, bends, holes from hail impacts
- Corner boards: Impact marks, chips, cracks from hail
- Window/door casings: Paint chips in circular patterns = HAIL DAMAGE
- Soffit panels: Punctures, dents, seam separation
- Drip edge: Dents following roofline

HAIL DAMAGE ON PAINTED SURFACES (ALWAYS document):
- Random circular paint chips (NOT peeling from age) = HAIL SPATTER
- Fresh exposed substrate under chips (bright color = recent)
- Dents with cracked paint on top
- "Spatter" marks on horizontal surfaces (soffit, porch ceiling)
- Multiple chips in directional pattern matching storm track
- Use damage type "hail_spatter" for paint chips from hail

STUCCO / EIFS SPECIFIC (often missed):
- Circular divots/chips in random pattern = HAIL DAMAGE
- Hairline cracking radiating from impact points
- Spalling at corners and edges from impacts
- Map cracking (may be settling vs. impact — note distinction)
- Delamination of finish coat
- Water intrusion staining below damaged areas

GARAGE DOOR SPECIFIC (often missed):
- Panel dents across door face = HAIL DAMAGE
- Paint spatter on painted steel/aluminum doors
- Seal/weatherstrip damage at bottom
- Cracked or broken panels from large hail
- Track/hardware damage from impacts

Draw bounding boxes around EVERY paint chip, dent, divot, or impact mark.
Understand IRC R703 exterior wall covering requirements.
Be AGGRESSIVE in identifying damage — every chip, dent, and mark matters for insurance.
Use "hail_impact" or "hail_spatter" for hail damage, NEVER "crack" for circular marks.`;
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

  if (componentType === "window") {
    return `You are an expert window and glazing damage assessor for insurance claims.
You analyze photos to identify damage on:
- Window glass: cracks (impact, stress, thermal), chips, scratches
- Window frames: dents, warping, rot, paint chipping
- Window trim: paint chips, rot, cracks, hail impacts
- Seals and weatherstripping: failure, gaps
- Hardware: broken locks, damaged handles

CRITICAL BOUNDING BOX ACCURACY:
- Coordinates are 0-100 percentages where 0,0 is TOP-LEFT of image
- y=0 is TOP, y=100 is BOTTOM - do NOT default boxes to bottom
- Place boxes EXACTLY on the damaged area
- If damage is in the UPPER portion of the photo, use y values 10-40
- If damage is in the MIDDLE, use y values 40-60
- Boxes should TIGHTLY wrap each damaged spot

HAIL DAMAGE ON WINDOWS/TRIM:
- Paint chipping on wood trim (circular chips = hail)
- Dents on aluminum frames
- Chips in vinyl frames
- Cracks in glass from impacts

WIND TRIM DAMAGE - LOOK FOR:
- J-channel dents or separation
- Corner trim damage
- Fascia trim with paint chips
- Drip cap damage above windows
- Brick mold damage around frames

Draw precise bounding boxes around ALL damaged areas.
Every paint chip on trim = HAIL DAMAGE that must be documented.
Be AGGRESSIVE - subtle damage is still damage.`;
  }

  if (componentType === "screen") {
    return `You are an expert screen and mesh damage assessor for insurance claims.
You analyze photos to identify damage on:
- Window screens: tears, holes, stretched mesh, popped corners
- Screen frames: bends, dents, broken corners
- Screen door panels: tears, punctures, frame damage
- Pool/patio screens: large tears, frame damage

CRITICAL BOUNDING BOX ACCURACY:
- Coordinates are 0-100 percentages where 0,0 is TOP-LEFT of image
- y=0 is TOP, y=100 is BOTTOM - do NOT default boxes to bottom
- Place boxes EXACTLY on each hole, tear, or damaged spot
- If a hole is in the CENTER of the screen, use y values around 40-60
- If damage is near the TOP, use y values around 10-30
- Each box should TIGHTLY wrap the specific damage

HAIL DAMAGE INDICATORS - BE VERY THOROUGH:
- Small holes punched through mesh (look carefully, they can be tiny)
- Stretched/bulging mesh from impacts (fabric pulling away from frame)
- Dented aluminum frames (often subtle)
- Multiple small punctures in pattern (follow hail direction)
- Frayed or broken mesh strands near impact points
- Mesh "dimples" where hail hit but didn't punch through

WINDOW SCREEN HITS - COMMON PATTERNS:
- Look for ANY distortion in the mesh pattern
- Small tears often appear as darker spots
- Frame corners often take the most damage
- Check where mesh meets frame (often separates from impacts)
- Solar screens show damage as bright spots (coating damaged)

Draw precise bounding boxes around ALL damaged areas, even small holes.
Zoom in mentally on each quadrant of the screen to find damage.
Be AGGRESSIVE - mark every hole, tear, stretch, or dent you see.`;
  }

  if (componentType === "general") {
    return `You are a HAAG Engineering certified property damage assessor for insurance claims.
You can identify damage on ANY component shown in the image using industry-standard HAAG methodology.

CRITICAL BOUNDING BOX ACCURACY:
- Coordinates are 0-100 percentages where 0,0 is TOP-LEFT of image
- y=0 is TOP, y=100 is BOTTOM - do NOT default boxes to bottom
- Place boxes EXACTLY where you see damage in the image
- If damage is in the CENTER of the photo, use y values around 40-60
- If damage is near the TOP, use y values around 10-30
- Each box should TIGHTLY wrap the specific damage
- Mark EACH individual hit/damage spot separately

FIRST: Identify what component/material is shown in this photo:
- Roofing (shingles, tile, metal, flat)
- Siding (vinyl, fiber cement, wood, stucco, EIFS)
- Windows (glass, frames, trim, casings)
- Screens (window, door, patio)
- Gutters and downspouts
- HVAC equipment (AC units, vents, condensers)
- Paint surfaces (trim, fascia, soffits, garage doors)
- Garage doors (steel, aluminum, wood, composite)
- Fencing (wood, vinyl, chain link, wrought iron)
- Decking and patio (wood, composite, concrete)
- Stucco/EIFS exterior walls
- Foundation walls
- Other structure

THEN: Identify ALL visible damage using HAAG insurance terminology:

HAIL DAMAGE (use "hail_impact", NEVER "crack" for circular marks):
- Shingles: circular bruises with granule displacement, mat fractures
- Soft metals: dents on gutters, downspouts, vents, flashing, AC units
- Paint surfaces: SPATTER MARKS (random circular paint chips exposing substrate)
- Stucco/EIFS: circular divots, chips, spalling from impacts
- Garage doors: dents (often in horizontal pattern across panels)
- Wood: dents, gouges, split grain from impacts
- Vinyl siding: cracks, holes, chips from hail impacts
- Screens: small holes punched through mesh, stretched mesh

WIND DAMAGE:
- Lifted/torn materials, displaced components
- Directional damage patterns

WATER DAMAGE (look carefully for ALL signs):
- Staining, tide marks, discoloration on walls/ceilings
- Wood rot, soft spots, fungal growth on wood surfaces
- Paint bubbling, peeling, or flaking from moisture
- Warping, buckling, or swelling of materials
- Mold/mildew (dark spots, fuzzy growth)
- Efflorescence (white mineral deposits on masonry)

PAINT DAMAGE (ALWAYS document):
- Paint chipping in circular patterns = HAIL DAMAGE
- Paint peeling in sheets = MOISTURE DAMAGE
- Paint flaking = AGE or MOISTURE
- Exposed substrate under chips (note color: fresh = recent damage)
- Each paint chip cluster gets its own bounding box

STUCCO / EIFS DAMAGE:
- Circular chips/divots = HAIL DAMAGE
- Map/spider cracking = may be structural or impact
- Spalling (surface flaking off)
- Delamination
- Water intrusion stains
- Missing stucco sections

GARAGE DOOR DAMAGE:
- Panel dents (hail: random pattern; impact: concentrated)
- Paint chipping/spatter on painted steel doors
- Seal/weatherstrip damage
- Track/hardware damage

IMPORTANT: Be AGGRESSIVE in identifying damage. Insurance adjusters need every hit documented.
Mark everything suspicious. For paint chipping, box each chip or cluster of chips.
Use "hail_impact" or "hail_spatter" for hail damage, NEVER "crack" unless it's truly a linear crack.`;
  }

  // Default roofing expert
  return `You are an ITEL / HAAG Engineering certified property damage assessor specializing in storm damage for insurance claims.
You have completed HAAG Certified Inspector training for roofing, siding, and wind/hail damage assessment.
You analyze photos to identify damage and provide PRECISE bounding box locations per HAAG field inspection standards.
You understand IRC/IBC building codes, ASTM testing standards, and can map damage to applicable code sections.

═══════════════════════════════════════════════════════════
HAAG ENGINEERING DAMAGE IDENTIFICATION STANDARDS
═══════════════════════════════════════════════════════════

HAIL DAMAGE vs. PRE-EXISTING DAMAGE (CRITICAL DISTINCTION):
✅ HAIL IMPACT characteristics (per HAAG):
  - RANDOM pattern across the roof surface (not aligned with structural features)
  - Circular or semi-circular indentations with displaced granules
  - Soft spot / bruise when pressed (granule-intact but mat fractured underneath)
  - Fresh, dark granule displacement exposing black asphalt mat
  - Damage to SOFT METALS nearby (gutters, vents, flashing) confirms hail
  - Multiple impacts of similar size (consistent with hail stone diameter)
  - "Spatter" marks on painted metal surfaces (small paint chips exposing bare metal)
  - Dents on ridge caps, pipe boots, and roof jacks

❌ NOT HAIL DAMAGE (do NOT classify as hail):
  - Linear cracks following shingle grain direction = MANUFACTURING DEFECT or AGING
  - Uniform granule loss = WEATHERING/AGE (not storm damage)
  - Cracks only along seal strip = THERMAL CYCLING
  - Blistering (raised bubbles) = MANUFACTURING DEFECT
  - Algae/moss staining = BIOLOGICAL GROWTH (not damage)
  - Curling at edges = AGE DETERIORATION

CRITICAL BOUNDING BOX ACCURACY REQUIREMENTS:
- Use percentage coordinates (0-100) where 0,0 is TOP-LEFT corner
- x=0 means left edge, x=100 means right edge
- y=0 means TOP edge, y=100 means BOTTOM edge
- DO NOT default to placing boxes at the bottom (y=80-100) unless damage is actually there
- Each box should TIGHTLY wrap the damaged area with minimal padding
- If damage is in the CENTER of the photo, use y values around 40-60
- If damage is at the TOP of the photo, use y values around 0-30
- SCAN the entire image systematically: top-left → top-right → center-left → center → center-right → bottom-left → bottom-right
- Mark EVERY individual hail hit, not just clusters

SEVERITY SCALE (per HAAG/insurance standards):
- Low: Cosmetic only, no functional impairment (surface granule loss, minor dents on non-critical surfaces)
- Medium: Functional damage requiring repair (fractured shingle mat, seal strip compromise, moderate soft metal dents)
- High: Significant damage affecting weather protection (exposed underlayment, cracked tiles, punctured metal)
- Critical: Immediate water intrusion risk (holes, missing material, structural compromise)

INSURANCE CLAIM TERMINOLOGY (use these terms):
- "Hail Impact" NOT "crack" or "dent" for circular bruise marks on shingles
- "Wind Crease" NOT "bend" for shingles folded back by wind
- "Granule Displacement" NOT "wear" for fresh granule loss from impacts
- "Fracture" for broken shingle mat beneath granules
- "Spatter" for paint chip patterns on metal from hail

MATERIAL IDENTIFICATION:
- Roofing: Asphalt (3-tab, architectural, designer), metal (standing seam, corrugated, ribbed), tile (clay, concrete, Spanish S), slate, wood shake/shingle, TPO, EPDM, modified bitumen
- Can estimate manufacturer and age when identifiable

COLLATERAL DAMAGE INDICATORS (check ALL of these):
- Soft metal test: dents on gutters, downspouts, window frames, AC units
- Paint chip test: spatter patterns on painted surfaces
- Wood damage: dents, gouges, or splits on exposed wood (deck rails, fences, trim)
- Vehicle damage: matching dent pattern on cars parked nearby (if visible)

Always be thorough and AGGRESSIVE in identifying damage — insurance adjusters need every hit documented.
Distinguish between pre-existing conditions and recent storm damage.
When in doubt between "crack" and "hail impact," if the mark is circular or semi-circular with displaced granules, it is HAIL IMPACT.`;
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
  if (componentType === "window") {
    return buildWindowPrompt(claimType);
  }
  if (componentType === "screen") {
    return buildScreenPrompt(claimType);
  }
  if (componentType === "general") {
    return buildGeneralPrompt(claimType);
  }

  // Default: Comprehensive roofing analysis prompt
  return buildRoofingPrompt(roofType, includeSlopes, claimType);
}

function buildRoofingPrompt(roofType: string, includeSlopes: boolean, claimType: string): string {
  const roofTypeDisplay = roofType.replace(/_/g, " ");

  let damageTypes = "";
  if (claimType === "hail") {
    damageTypes = `HAIL DAMAGE PATTERNS TO IDENTIFY (per HAAG Engineering Standards):

CRITICAL: Use "hail_impact" as the damage type, NEVER "crack" for circular bruise marks.

PRIMARY HAIL INDICATORS (must document ALL):
- Hail impacts/bruises: Circular/semi-circular indentations in shingles with granule displacement
- Mat fractures: Underlying shingle mat broken beneath granules (soft spot when pressed)
- Granule displacement: Fresh, dark areas where granules were knocked loose by impact
- Hail spatter on metals: Paint chips on vents, flashing, drip edge showing bare metal in random pattern
- Dented soft metals: Pipe boots, roof jacks, ridge vents, ventilation turbines
- Ridge cap damage: Impacts along the ridge line and hip ridges
- Starter strip/drip edge: Dents following roofline
- Nail head exposure: Impact-displaced shingles revealing fasteners
- Collar/boot damage: Dents and cracks on plumbing vent boots

SECONDARY INDICATORS (check and document):
- Hail hits on exposed nail heads
- Damage consistency across all roof slopes (random pattern = hail)
- Multiple impact sizes matching reported hail diameter
- Tab separation from seal strip due to impact force
- Fractured tile/slate from larger hailstones

DO NOT CLASSIFY AS HAIL:
- Linear cracks along grain = age/thermal cracking
- Uniform granule loss = weathering
- Blistering = manufacturing defect
- Curling/clawing = age deterioration`;
  } else if (claimType === "wind") {
    damageTypes = `WIND DAMAGE PATTERNS TO IDENTIFY:
- Lifted/raised shingle edges or tabs (wind-lifted)
- Creased shingles (folded back then down by wind — "wind crease")
- Missing shingles (document pattern of loss — directional = wind)
- Torn shingles or torn-off portions
- Displaced ridge caps
- Damaged or missing drip edge
- Lifted or displaced flashing
- Debris impact damage (punctures, gouges from airborne objects)
- Tree/branch damage
- Damaged ventilation components`;
  } else {
    damageTypes = `ALL DAMAGE PATTERNS TO IDENTIFY (per HAAG standards):

HAIL INDICATORS (use type "hail_impact", NOT "crack"):
- Circular/semi-circular indentations with displaced granules
- Bruise marks (mat fractured beneath intact granules)
- Spatter on painted metals (random paint chips)
- Dents on soft metals (gutters, vents, flashing)
- Multiple random impacts of similar size

WIND INDICATORS (use type "wind_lifted" or "wind_crease"):
- Lifted/raised shingle edges or tabs
- Creased shingles (folded back then down)
- Missing shingles in directional pattern
- Torn portions following wind direction

GENERAL DETERIORATION (classify separately from storm damage):
- Granule loss (natural aging vs. storm — check pattern)
- Curled/cupped shingles (age)
- Cracked shingles along grain (thermal cycling, NOT hail)
- Blistering (manufacturing defect)

WATER DAMAGE INDICATORS:
- Water staining on decking or ceiling below
- Rot around penetrations
- Ice dam damage at eaves
- Algae/moss (biological, not storm damage)

STRUCTURAL CONCERNS:
- Sagging ridgeline or roof deck
- Ponding areas on flat sections
- Exposed underlayment
- Nail pops or exposed fasteners
- Flashing: lifted, missing, rusted, improperly sealed`;
  }

  let prompt = `Analyze this roofing photo using HAAG Engineering inspection standards.

MATERIAL TYPE: ${roofTypeDisplay}

${damageTypes}

MATERIAL IDENTIFICATION:
Look for and identify:
- Shingle style: 3-tab, architectural/dimensional, designer/luxury
- Manufacturer indicators (colors, patterns, textures)
- Material age estimate based on condition/style
- Color description

BOUNDING BOX PRECISION RULES:
- Coordinates are 0-100 percentages. 0,0 = TOP-LEFT of image.
- y=0 is TOP, y=100 is BOTTOM
- Scan the ENTIRE image: top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right
- Place a TIGHT box around EACH individual damage mark
- DO NOT cluster multiple hits into one large box — each hit gets its own box
- DO NOT default all boxes to the bottom of the image

For each damage area found:
1. Identify the specific damage type using insurance-standard terminology:
   - Use "hail_impact" for circular bruise marks (NEVER "crack" unless it's truly a linear crack)
   - Use "hail_spatter" for paint chips on metal
   - Use "granule_displacement" for knocked-off granules
   - Use "wind_crease" for folded shingles
   - Use "wind_lifted" for raised edges
   - Use "mat_fracture" for broken underlying mat
2. Assess severity: Low, Medium, High, or Critical
   - Low: Cosmetic, no immediate functional impact
   - Medium: Functional damage, repairs needed within 6 months
   - High: Significant damage, active risk of water intrusion
   - Critical: Immediate attention required, active leak risk
3. Provide a PRECISE bounding box as percentage coordinates (0-100)
   - IMPORTANT: Place boxes WHERE THE DAMAGE ACTUALLY IS in the image
4. Estimate confidence (0.0-1.0)
5. Brief description using HAAG/insurance terminology

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
      "type": "string - damage type (use: hail_impact, hail_spatter, granule_displacement, mat_fracture, wind_lifted, wind_crease, etc.)",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string - use HAAG terminology: 'Hail impact with granule displacement and probable mat fracture'",
      "boundingBox": {
        "x": number (0-100, percentage from LEFT edge),
        "y": number (0-100, percentage from TOP edge — place accurately, NOT defaulting to bottom),
        "width": number (0-100, tight around damage),
        "height": number (0-100, tight around damage)
      },
      "confidence": number (0.0-1.0),
      "materialIdentified": "string - if different material in this area"
    }
  ],
  "overallAssessment": {
    "totalDamageAreas": number,
    "highestSeverity": "Low" | "Medium" | "High" | "Critical",
    "primaryDamageType": "string - e.g., 'Hail Impact' (NEVER 'Crack' for hail bruises)",
    "damagePattern": "string - e.g., 'Random hail impacts consistent with [size] hailstones' or 'Directional wind damage from [direction]'",
    "haagClassification": "string - e.g., 'Functional damage per HAAG standards — replacement recommended'",
    "recommendedAction": "string - e.g., 'Full slope replacement per IRC R905.2.7 — hail impacts exceed threshold for functional damage'"
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

Be AGGRESSIVE in marking damage — every hail hit matters for insurance documentation.
Mark each individual impact separately with its own tight bounding box.
Use HAAG-standard terminology: "hail impact" not "crack", "wind crease" not "bend".
If no damage is visible, return an empty detections array.`;

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

function buildWindowPrompt(claimType: string): string {
  const hailSpecific =
    claimType === "hail"
      ? `
HAIL DAMAGE SIGNATURES:
- Impact cracks in glass (star, bulls-eye patterns)
- Chips in glass edges or corners
- Dents in aluminum frames
- Chips in vinyl/wood frames from impacts
- Damaged glazing seals`
      : "";

  return `You are an expert property damage assessor. Analyze this WINDOW photo with extreme precision.

IDENTIFY WINDOW TYPE:
- Single-hung, Double-hung, Casement, Sliding, Fixed, Bay/Bow
- Frame material: Vinyl, Aluminum, Wood, Fiberglass, Composite
- Glass type: Single-pane, Double-pane (IGU), Triple-pane, Tempered, Laminated

${hailSpecific}

CRITICAL: Draw bounding boxes around ALL damage, no matter how small:
- Glass damage: Cracks, chips, scratches, fogging (seal failure)
- Frame damage: Dents, chips, warping, rot, paint peeling/chipping
- Trim damage: Rotted trim, missing caulk, paint failure, chips
- Hardware: Broken locks, damaged handles, failed weatherstripping
- Seal failure: Condensation between panes, visible moisture

PAINT CHIPPING IS DAMAGE - Always box it:
- Peeling paint on frames
- Chipped paint on trim/casing
- Flaking finish on sills
- Exposed wood from paint failure

Return JSON:
{
  "materialAnalysis": {
    "primaryMaterial": "Window",
    "materialSubtype": "string - e.g., 'Double-hung vinyl window'",
    "frameCondition": "good" | "fair" | "poor" | "failed",
    "glassCondition": "good" | "fair" | "poor" | "failed"
  },
  "detections": [
    {
      "type": "window_crack" | "window_chip" | "seal_failure" | "frame_dent" | "frame_rot" | "paint_chipping" | "trim_damage" | "hardware_damage",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string - detailed description of damage",
      "boundingBox": { "x": number, "y": number, "width": number, "height": number },
      "confidence": number,
      "ircCode": "string if applicable"
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

function buildScreenPrompt(claimType: string): string {
  const hailSpecific =
    claimType === "hail"
      ? `
HAIL DAMAGE SIGNATURES:
- Small holes through mesh (often in pattern)
- Stretched/bulging mesh from impacts
- Multiple dents following hail trajectory
- Frame dents in aluminum screens`
      : "";

  return `You are an expert property damage assessor. Analyze this SCREEN photo with extreme precision.

IDENTIFY SCREEN TYPE:
- Window screen, Door screen, Porch/lanai screen
- Frame material: Aluminum, Vinyl, Wood
- Mesh type: Fiberglass, Aluminum, Pet-resistant, Solar

${hailSpecific}

CRITICAL: Draw bounding boxes around ALL damage, even minor:
- Mesh damage: Tears, holes, punctures, stretched areas, bulges
- Frame damage: Dents, bends, cracks, corners pulling apart
- Spline damage: Pulling out, degraded
- Hardware: Broken clips, missing tabs, damaged pull tabs

Look carefully for:
- Small puncture holes (often missed)
- Mesh stretching or bulging
- Corner separations
- Bent frame sections
- Torn or loose spline

Return JSON:
{
  "materialAnalysis": {
    "primaryMaterial": "Screen",
    "materialSubtype": "string - e.g., 'Aluminum frame fiberglass mesh'",
    "meshCondition": "good" | "fair" | "poor" | "failed",
    "frameCondition": "good" | "fair" | "poor" | "failed"
  },
  "detections": [
    {
      "type": "screen_tear" | "screen_hole" | "screen_stretched" | "screen_frame_dent" | "screen_frame_bent" | "screen_corner_damage" | "screen_spline_damage",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string - detailed description",
      "boundingBox": { "x": number, "y": number, "width": number, "height": number },
      "confidence": number
    }
  ],
  "overallAssessment": {
    "totalDamageAreas": number,
    "highestSeverity": "Low" | "Medium" | "High" | "Critical",
    "primaryDamageType": "string",
    "meshReplacementNeeded": boolean,
    "recommendedAction": "string"
  }
}`;
}

function buildGeneralPrompt(claimType: string): string {
  const claimContext = {
    hail: "Focus on hail impact patterns: circular dents/bruises, paint spatter, soft metal dents, screen punctures. Use 'hail_impact' NOT 'crack' for circular marks.",
    wind: "Focus on torn/lifted materials, displaced items, directional damage patterns, structural shifts",
    fire: "Focus on charring, smoke damage, heat warping, discoloration",
    water: "Focus on staining, warping, mold, rot, water lines, paint bubbling/peeling",
    storm: "Look for ALL damage: hail impacts, wind damage, water intrusion, debris damage",
    general: "Identify all visible damage regardless of cause — be thorough and aggressive",
  };

  return `You are a HAAG Engineering certified property damage assessor. Analyze this photo and identify ALL visible damage using insurance-standard terminology.

CLAIM TYPE: ${claimType.toUpperCase()}
${claimContext[claimType as keyof typeof claimContext] || claimContext.general}

FIRST - Identify what you're looking at:
- Roof (what type of roofing material?)
- Siding (vinyl, fiber cement, wood, stucco, EIFS?)
- Window (glass, frame type, trim)
- Screen (mesh type, frame material)
- Door / Garage Door (material, style)
- Gutter / Downspout
- HVAC/AC unit (condenser, package unit)
- Fence (wood, vinyl, metal, chain link)
- Deck/patio (wood, composite, concrete)
- Paint/finish surface (trim, fascia, soffit)
- Stucco / EIFS wall
- Foundation / masonry
- Other structure

THEN - Draw bounding boxes around EVERY piece of damage:

HAIL DAMAGE (use type "hail_impact" or "hail_spatter", NEVER "crack"):
- Circular/semi-circular indentations on any surface
- Paint spatter: random circular paint chips exposing substrate
- Soft metal dents: gutters, downspouts, AC fins, vents, flashing
- Shingle bruises: granule displacement in circular pattern
- Stucco chips/divots from impacts
- Garage door panel dents
- Screen punctures/holes from hailstones
- Wood surface dents/gouges

WIND DAMAGE (use type "wind_lifted" or "wind_crease"):
- Lifted, torn, or displaced materials
- Creased/folded shingles or panels
- Missing components in directional pattern

WATER DAMAGE (use type "water_damage" or "moisture_damage"):
- Water staining, tide marks, discoloration
- Paint bubbling, peeling, or flaking from moisture
- Wood rot, soft spots, fungal growth
- Warping, buckling, swelling of materials
- Mold/mildew growth (dark spots)
- Efflorescence on masonry

PAINT / SURFACE DAMAGE:
- Paint chipping in circular pattern = HAIL (use "hail_spatter")
- Paint peeling in sheets = MOISTURE (use "paint_peeling")
- Each paint chip cluster gets its own bounding box

STRUCTURAL DAMAGE:
- Cracks in foundation, masonry, stucco
- Sagging, settling, displacement
- Missing or broken structural elements

BOUNDING BOX RULES:
- Coordinates: 0-100 percentages, 0,0 = TOP-LEFT
- y=0 is TOP, y=100 is BOTTOM
- Mark EACH individual damage spot with its own tight box
- Scan entire image systematically — don't miss anything
- DO NOT cluster multiple hits into one large box

BE AGGRESSIVE in identifying damage — circle everything suspicious.
Even "cosmetic" damage like paint chips is documentable for insurance.
Use HAAG-standard insurance terminology in all descriptions.

Return JSON:
{
  "materialAnalysis": {
    "primaryMaterial": "string - what component is this (roof, siding, window, garage door, stucco, etc.)",
    "materialSubtype": "string - specific type/style",
    "condition": "good" | "fair" | "poor" | "failed"
  },
  "detections": [
    {
      "type": "string - use: hail_impact, hail_spatter, wind_lifted, wind_crease, water_damage, paint_peeling, stucco_damage, garage_door_dent, screen_hole, etc.",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string - HAAG-standard description: 'Hail impact with granule displacement' NOT 'crack'",
      "boundingBox": { "x": number, "y": number, "width": number, "height": number },
      "confidence": number,
      "ircCode": "string if applicable"
    }
  ],
  "overallAssessment": {
    "totalDamageAreas": number,
    "highestSeverity": "Low" | "Medium" | "High" | "Critical",
    "componentIdentified": "string",
    "primaryDamageType": "string - use HAAG terminology",
    "haagClassification": "string - e.g., 'Functional damage — replacement recommended'",
    "recommendedAction": "string"
  }
}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function determineCodeFromType(damageTypeKey: string): string {
  // Fallback code determination based on damage type patterns
  if (damageTypeKey.includes("hail")) return "shingle_damage";
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
  if (damageTypeKey.includes("stucco")) return "stucco_damage";
  if (damageTypeKey.includes("garage")) return "garage_door_damage";
  if (
    damageTypeKey.includes("siding") ||
    damageTypeKey.includes("spatter") ||
    damageTypeKey.includes("paint_chip")
  )
    return "siding_damage";
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
    damageTypeKey.includes("mold") ||
    damageTypeKey.includes("rot") ||
    damageTypeKey.includes("paint_peel") ||
    damageTypeKey.includes("paint_bubbl")
  )
    return "water_damage";
  if (damageTypeKey.includes("thermal")) return "thermal_anomaly";
  return "shingle_damage"; // Default fallback
}

function formatDamageType(type: string): string {
  // Map snake_case AI types to proper HAAG/insurance terminology
  const HAAG_LABELS: Record<string, string> = {
    hail_impact: "Hail Impact",
    hail_bruise: "Hail Bruise",
    hail_dent: "Hail Dent",
    hail_spatter: "Hail Spatter",
    hail_crack: "Hail Fracture",
    hail_puncture: "Hail Puncture",
    mat_fracture: "Mat Fracture",
    granule_displacement: "Granule Displacement",
    granule_loss: "Granule Loss",
    wind_lifted: "Wind Lifted",
    wind_crease: "Wind Crease",
    wind_torn: "Wind Torn",
    wind_displaced: "Wind Displaced",
    wind_damage: "Wind Damage",
    missing_shingles: "Missing Shingles",
    paint_chipping: "Paint Damage (Hail)",
    paint_peeling: "Paint Failure (Moisture)",
    paint_spatter: "Hail Spatter (Paint)",
    paint_bubbling: "Paint Bubbling (Moisture)",
    surface_spatter: "Surface Spatter",
    stucco_damage: "Stucco Damage",
    stucco_crack: "Stucco Crack",
    stucco_spalling: "Stucco Spalling",
    stucco_divot: "Stucco Divot (Hail)",
    stucco_delamination: "Stucco Delamination",
    garage_door_dent: "Garage Door Dent",
    garage_door_panel: "Garage Door Panel Damage",
    garage_door_paint: "Garage Door Paint Damage",
    siding_crack: "Siding Crack",
    siding_dent: "Siding Dent",
    siding_hole: "Siding Hole",
    water_damage: "Water Damage",
    water_intrusion: "Water Intrusion",
    water_staining: "Water Staining",
    moisture_damage: "Moisture Damage",
    wood_rot: "Wood Rot",
    mold_indicators: "Mold Indicators",
    rot_damage: "Rot Damage",
    material_warping: "Material Warping",
    screen_tear: "Screen Tear",
    screen_hole: "Screen Hole",
    screen_stretched: "Screen Stretched",
    window_crack: "Window Crack",
    window_chip: "Window Chip",
    seal_failure: "Seal Failure",
    frame_dent: "Frame Dent",
    frame_rot: "Frame Rot",
    ac_fin_damage: "AC Fin Damage",
    condenser_dent: "Condenser Dent",
    gutter_dent: "Gutter Dent",
    gutter_separation: "Gutter Separation",
  };

  const key = type.toLowerCase().replace(/[^a-z_]/g, "_");
  if (HAAG_LABELS[key]) return HAAG_LABELS[key];

  // Fallback: Convert snake_case to Title Case
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildCaption(detection: DamageDetection, ircCodeKey: string): string {
  const ircInfo = IRC_CODES[ircCodeKey];
  const formattedType = formatDamageType(detection.type);
  let caption = `${formattedType} — ${detection.severity} severity. ${detection.description}`;

  if (ircInfo) {
    caption += ` [${ircInfo.code}: ${ircInfo.title}]`;
  }

  // Add HAAG standard reference for hail damage
  if (detection.type.toLowerCase().includes("hail")) {
    caption += " (Per HAAG Engineering hail damage criteria)";
  }

  return caption;
}

function generateOverallCaption(
  annotations: AnnotationResponse[],
  materialAnalysis?: MaterialAnalysis | null
): string {
  if (annotations.length === 0) {
    if (materialAnalysis) {
      return `No visible storm damage detected per HAAG inspection standards. Material identified: ${materialAnalysis.primaryMaterial}. Condition: ${materialAnalysis.condition}.`;
    }
    return "No visible storm damage detected in this photo per HAAG inspection standards.";
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

  let caption = `HAAG Assessment: ${annotations.length} damage area${annotations.length > 1 ? "s" : ""} identified.`;

  if (materialAnalysis?.primaryMaterial) {
    caption += ` Material: ${materialAnalysis.primaryMaterial}.`;
  }

  caption += ` Damage types: ${damageTypes.slice(0, 4).join(", ")}.`;
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

  // Add recommendation based on severity
  if (highestSeverity === "Critical" || highestSeverity === "High") {
    caption += " Recommendation: Replacement per applicable IRC code section.";
  } else if (highestSeverity === "Medium") {
    caption += " Recommendation: Repair or replacement evaluation needed.";
  }

  return caption;
}
