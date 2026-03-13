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

import heicConvert from "heic-convert";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import {
  ComponentType,
  detectByComponent,
  isRoboflowConfigured,
  NormalizedDetection,
} from "@/lib/ai/roboflow";
import { apiError } from "@/lib/apiError";
import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

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
      "mailbox",
      "electrical_box",
      "outdoor_furniture",
      "awning",
      "garage_door",
      "downspout",
      "general",
    ])
    .default("roof"),
  // NEW: Specify claim type for specialized detection
  claimType: z.enum(["hail", "wind", "fire", "water", "storm", "general"]).default("general"),
  // NEW: Flag for thermal/infrared images
  isThermalImage: z.boolean().default(false),
  // NEW: Claim property context for jurisdiction-aware codes
  claimCity: z.string().optional(),
  claimState: z.string().optional(),
  propertyType: z.string().optional(),
  // NEW: Use YOLO model for accurate bounding boxes (requires ROBOFLOW_API_KEY)
  useYolo: z.boolean().default(true),
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
  window_trim_crack: "window_damage",
  window_trim_chip: "window_damage",
  trim_cracking: "siding_damage",
  trim_chipping: "siding_damage",
  trim_damage: "siding_damage",
  casing_damage: "window_damage",
  brick_mold_damage: "window_damage",

  // ─── FENCE & DECK ───────────────────────────────────────────────────────────
  fence_damage: "fence_damage",
  deck_damage: "deck_damage",

  // ─── MAILBOX / ELECTRICAL BOX / SOFT METALS ─────────────────────────────────
  mailbox_dent: "soft_metal_damage",
  mailbox_damage: "soft_metal_damage",
  electrical_box_dent: "soft_metal_damage",
  electrical_box_damage: "soft_metal_damage",
  meter_box_dent: "soft_metal_damage",
  meter_box_damage: "soft_metal_damage",
  light_fixture_damage: "soft_metal_damage",
  soft_metal_dent: "soft_metal_damage",
  soft_metal_damage: "soft_metal_damage",
  aluminum_dent: "soft_metal_damage",
  copper_dent: "soft_metal_damage",
  lead_dent: "soft_metal_damage",

  // ─── OUTDOOR FURNITURE / ITEMS ──────────────────────────────────────────────
  furniture_damage: "exterior_damage",
  wicker_damage: "exterior_damage",
  patio_furniture_damage: "exterior_damage",
  cushion_damage: "exterior_damage",
  umbrella_damage: "exterior_damage",
  planter_damage: "exterior_damage",

  // ─── AWNING / CANOPY ───────────────────────────────────────────────────────
  awning_damage: "exterior_damage",
  awning_tear: "exterior_damage",
  awning_frame_damage: "exterior_damage",
  canopy_damage: "exterior_damage",
  water_behind_awning: "water_damage",
  water_intrusion_awning: "water_damage",

  // ─── DOWNSPOUT ──────────────────────────────────────────────────────────────
  downspout_dent: "gutter_damage",
  downspout_crushed: "gutter_damage",
  downspout_disconnected: "gutter_damage",

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

  // ─── SOFT METALS / MAILBOX / ELECTRICAL ─────────────────────────────────────
  soft_metal_damage: { code: "IRC R903.2", title: "Soft Metal Damage (Hail Indicator)" },

  // ─── EXTERIOR ITEMS ─────────────────────────────────────────────────────────
  exterior_damage: { code: "IRC R301.2", title: "Exterior Property Damage" },

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

  // Rate limit AI endpoint
  const rl = await checkRateLimit(userId, "AI");
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again shortly." },
      { status: 429 }
    );
  }

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
      city: validated.claimCity,
      state: validated.claimState,
      propertyType: validated.propertyType,
    });

    const openai = getOpenAI();

    // Fetch and encode image
    const imageResponse = await fetch(validated.imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    let contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    let processedBuffer: Buffer = Buffer.from(imageBuffer);

    // OpenAI only supports JPEG, PNG, GIF, WEBP — NOT HEIC
    // Use heic-convert (pure JS/WASM) for HEIC since sharp needs native libheif
    const isHeic =
      contentType.toLowerCase().includes("heic") ||
      contentType.toLowerCase().includes("heif") ||
      validated.imageUrl.toLowerCase().includes(".heic") ||
      validated.imageUrl.toLowerCase().includes(".heif");

    if (isHeic) {
      logger.info("[PHOTO_ANNOTATE] Converting HEIC to JPEG", {
        originalType: contentType,
        photoId: validated.photoId,
      });
      try {
        const jpegBuffer = await heicConvert({
          buffer: processedBuffer,
          format: "JPEG",
          quality: 0.9,
        });
        processedBuffer = Buffer.from(jpegBuffer);
        contentType = "image/jpeg";
      } catch (heicError) {
        logger.error("[PHOTO_ANNOTATE] HEIC conversion failed", { error: heicError });
        throw new Error("Failed to convert HEIC image. Please upload a JPEG or PNG version.");
      }
    }

    const base64Image = processedBuffer.toString("base64");
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    // Build jurisdiction context for prompts
    const jurisdictionContext = buildJurisdictionContext(
      validated.claimCity,
      validated.claimState,
      validated.roofType
    );

    // Build comprehensive prompt for damage detection
    const prompt = buildAnnotationPrompt(
      validated.roofType,
      validated.includeSlopes,
      validated.componentType,
      validated.claimType,
      validated.isThermalImage,
      jurisdictionContext
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

    // Log raw AI response for debugging
    logger.info("[PHOTO_ANNOTATE] AI Response received", {
      photoId: validated.photoId,
      componentType: validated.componentType,
      claimType: validated.claimType,
      responseLength: content.length,
      previewFirst500: content.substring(0, 500),
    });

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[PHOTO_ANNOTATE] No JSON in response", {
        content: content.substring(0, 500),
        photoId: validated.photoId,
      });
      return NextResponse.json({
        success: true,
        annotations: [],
        slopeData: null,
        materialAnalysis: null,
        overallCaption: "AI could not parse damage from this image. Try a clearer photo.",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    let detections = parsed.detections || [];
    const slopeData = parsed.slopeAnalysis || null;
    const materialAnalysis = parsed.materialAnalysis || null;

    // ═══════════════════════════════════════════════════════════════════════════
    // YOLO BOUNDING BOX ENHANCEMENT
    // Replace GPT-4V's inaccurate semantic boxes with YOLO's precise detection
    // ═══════════════════════════════════════════════════════════════════════════
    let yoloDetections: NormalizedDetection[] = [];
    const useYoloEnabled = validated.useYolo && isRoboflowConfigured();

    if (useYoloEnabled) {
      logger.info("[PHOTO_ANNOTATE] Running YOLO detection for accurate bounding boxes", {
        photoId: validated.photoId,
        claimType: validated.claimType,
        componentType: validated.componentType,
      });

      try {
        // Run YOLO models based on component type AND claim type
        // detectByComponent auto-selects the best models for each component
        yoloDetections = await detectByComponent(
          dataUrl,
          validated.componentType as ComponentType,
          validated.claimType as "hail" | "wind" | "storm" | "water" | "fire" | "general",
          0.35 // 35% confidence threshold - slightly lower for comprehensive detection
        );

        logger.info("[PHOTO_ANNOTATE] YOLO detection complete", {
          photoId: validated.photoId,
          yoloCount: yoloDetections.length,
          gptCount: detections.length,
        });

        // STRATEGY: Use YOLO boxes for location, GPT-4V for descriptions
        // If YOLO found damage, use YOLO boxes (95%+ accurate)
        // If no YOLO detections, fall back to filtered GPT-4V boxes
        if (yoloDetections.length > 0) {
          // Replace GPT-4V detections with YOLO detections
          // YOLO gives us: x, y, width, height (percentages), type, confidence, severity
          detections = yoloDetections.map((yolo, idx) => ({
            type: yolo.type,
            severity: yolo.severity,
            confidence: yolo.confidence,
            boundingBox: {
              x: yolo.x,
              y: yolo.y,
              width: yolo.width,
              height: yolo.height,
            },
            // Use GPT-4V descriptions if available for the same damage type
            description:
              detections.find((d: DamageDetection) =>
                d.type?.toLowerCase().includes(yolo.type.toLowerCase().split("_")[0])
              )?.description ||
              `${yolo.type} detected with ${(yolo.confidence * 100).toFixed(0)}% confidence`,
            materialIdentified: materialAnalysis?.primaryMaterial,
            sourceModel: "roboflow_yolo",
          }));

          logger.info("[PHOTO_ANNOTATE] Using YOLO bounding boxes (95%+ accurate)", {
            detectionCount: detections.length,
            types: yoloDetections.map((d) => d.type),
          });
        } else {
          logger.info("[PHOTO_ANNOTATE] No YOLO detections, using filtered GPT-4V boxes");
        }
      } catch (yoloError) {
        logger.warn("[PHOTO_ANNOTATE] YOLO detection failed, falling back to GPT-4V", {
          error: yoloError instanceof Error ? yoloError.message : String(yoloError),
        });
        // Continue with GPT-4V detections (filtered below)
      }
    } else {
      logger.info("[PHOTO_ANNOTATE] YOLO disabled or not configured, using GPT-4V boxes", {
        useYolo: validated.useYolo,
        roboflowConfigured: isRoboflowConfigured(),
      });
    }

    // Log detection results
    logger.info("[PHOTO_ANNOTATE] Detections parsed", {
      photoId: validated.photoId,
      detectionCount: detections.length,
      componentType: validated.componentType,
      claimType: validated.claimType,
      materialIdentified: materialAnalysis?.primaryMaterial,
    });

    // Convert detections to annotations format with validation
    const rawAnnotations: AnnotationResponse[] = (detections as DamageDetection[])
      .filter((detection) => {
        // Validate bounding box has reasonable coordinates
        const { x, y, width, height } = detection.boundingBox || {};
        if (
          typeof x !== "number" ||
          typeof y !== "number" ||
          typeof width !== "number" ||
          typeof height !== "number"
        ) {
          logger.warn("[PHOTO_ANNOTATE] Invalid bounding box - missing coordinates", { detection });
          return false;
        }
        // Filter out boxes that are clearly invalid (AI hallucination patterns)
        // - Boxes with 0 or negative dimensions
        if (width < 1 || height < 1) {
          logger.warn("[PHOTO_ANNOTATE] Box too small", { x, y, width, height });
          return false;
        }
        // - Boxes outside image bounds
        if (x < 0 || y < 0 || x > 100 || y > 100) {
          logger.warn("[PHOTO_ANNOTATE] Box outside bounds", { x, y, width, height });
          return false;
        }
        // - Boxes that extend beyond image (overly large)
        if (x + width > 105 || y + height > 105) {
          logger.warn("[PHOTO_ANNOTATE] Box extends beyond image", { x, y, width, height });
          return false;
        }
        // - Boxes that are too large (likely whole-image captures)
        if (width > 60 || height > 60) {
          logger.warn("[PHOTO_ANNOTATE] Box too large (likely whole-image)", {
            x,
            y,
            width,
            height,
          });
          return false;
        }
        // - Low confidence detections (AI isn't sure)
        if (detection.confidence < 0.3) {
          logger.warn("[PHOTO_ANNOTATE] Low confidence detection filtered", {
            type: detection.type,
            confidence: detection.confidence,
          });
          return false;
        }
        return true;
      })
      .map((detection, index) => {
        const damageTypeKey = detection.type.toLowerCase().replace(/[^a-z_]/g, "_");
        const ircCodeKey = IRC_CODE_MAP[damageTypeKey] || determineCodeFromType(damageTypeKey);

        // Ensure minimum box size of 5% for visibility (increased from 3%)
        let { x, y, width, height } = detection.boundingBox;
        width = Math.max(width, 5);
        height = Math.max(height, 5);
        // Clamp to image bounds
        x = Math.min(Math.max(x, 0), 100 - width);
        y = Math.min(Math.max(y, 0), 100 - height);

        return {
          id: `ai-${validated.photoId || "photo"}-${Date.now()}-${index}`,
          type: "ai_detection" as const,
          x,
          y,
          width,
          height,
          damageType: formatDamageType(detection.type),
          severity: detection.severity,
          ircCode: ircCodeKey,
          caption: buildCaption(detection, ircCodeKey),
          confidence: detection.confidence,
          materialIdentified: detection.materialIdentified,
        };
      });

    // ═══ COMPREHENSIVE HALLUCINATION DETECTION ═══
    // GPT-4o is a language model, NOT an object detector — it frequently
    // fabricates evenly-spaced, grid-like, or formulaic bounding box coordinates.
    // We detect multiple hallucination patterns and keep only the highest-confidence box(es).
    const yValues = rawAnnotations.map((a) => a.y);
    const xValues = rawAnnotations.map((a) => a.x);
    const widths = rawAnnotations.map((a) => a.width);
    const heights = rawAnnotations.map((a) => a.height);

    let hallucinationDetected = false;
    let hallucinationReason = "";

    if (rawAnnotations.length > 2) {
      // Pattern 1: All boxes at nearly the same Y (horizontal row)
      const sameYRow = yValues.every((y) => Math.abs(y - yValues[0]) < 8);
      // Pattern 2: All boxes at nearly the same X (vertical column)
      const sameXCol = xValues.every((x) => Math.abs(x - xValues[0]) < 8);
      // Pattern 3: Cookie-cutter — all boxes have nearly identical dimensions
      const cookieCutter =
        widths.every((w) => Math.abs(w - widths[0]) < 3) &&
        heights.every((h) => Math.abs(h - heights[0]) < 3);
      // Pattern 4: Uniform X spacing (staircase / evenly distributed)
      const sortedX = [...xValues].sort((a, b) => a - b);
      const xGaps = sortedX.slice(1).map((v, i) => v - sortedX[i]);
      const avgXGap = xGaps.reduce((s, g) => s + g, 0) / xGaps.length;
      const uniformXSpacing = xGaps.length >= 2 && xGaps.every((g) => Math.abs(g - avgXGap) < 4);
      // Pattern 5: Uniform Y spacing
      const sortedY = [...yValues].sort((a, b) => a - b);
      const yGaps = sortedY.slice(1).map((v, i) => v - sortedY[i]);
      const avgYGap = yGaps.reduce((s, g) => s + g, 0) / yGaps.length;
      const uniformYSpacing = yGaps.length >= 2 && yGaps.every((g) => Math.abs(g - avgYGap) < 4);
      // Pattern 6: Diagonal staircase (both X and Y increase uniformly)
      const diagonalStaircase = uniformXSpacing && uniformYSpacing;
      // Pattern 7: Grid layout (2+ rows × 2+ columns of evenly spaced boxes)
      const gridLayout = uniformXSpacing && sameYRow;

      if (sameYRow) {
        hallucinationDetected = true;
        hallucinationReason = "same-Y-row";
      } else if (sameXCol) {
        hallucinationDetected = true;
        hallucinationReason = "same-X-column";
      } else if (diagonalStaircase) {
        hallucinationDetected = true;
        hallucinationReason = "diagonal-staircase";
      } else if (gridLayout) {
        hallucinationDetected = true;
        hallucinationReason = "grid-layout";
      } else if (uniformXSpacing && cookieCutter) {
        hallucinationDetected = true;
        hallucinationReason = "uniform-spacing+cookie-cutter";
      } else if (uniformYSpacing && cookieCutter) {
        hallucinationDetected = true;
        hallucinationReason = "uniform-y-spacing+cookie-cutter";
      }
      // Cookie-cutter alone with 4+ boxes is suspicious
      else if (cookieCutter && rawAnnotations.length >= 4) {
        hallucinationDetected = true;
        hallucinationReason = "cookie-cutter-4+";
      }
    }

    let filteredAnnotations = rawAnnotations;
    if (hallucinationDetected) {
      logger.warn("[PHOTO_ANNOTATE] Detected hallucination pattern — boxes are likely fabricated", {
        reason: hallucinationReason,
        count: rawAnnotations.length,
        yValues,
        xValues,
        widths,
        heights,
      });
      // Keep only top 2 highest confidence detections (not just 1, to preserve some coverage)
      if (rawAnnotations.length > 0) {
        const sorted = [...rawAnnotations].sort((a, b) => b.confidence - a.confidence);
        filteredAnnotations = sorted.slice(0, 2);
        logger.info(
          `[PHOTO_ANNOTATE] Keeping top ${filteredAnnotations.length} detections (${hallucinationReason})`
        );
      }
    }

    // Deduplicate boxes that are at nearly the same position (within 8% tolerance)
    // This prevents the "5-in-a-row" pattern from AI hallucinations
    const annotations: AnnotationResponse[] = [];
    for (const ann of filteredAnnotations) {
      const isDuplicate = annotations.some(
        (existing) =>
          Math.abs(existing.x - ann.x) < 8 &&
          Math.abs(existing.y - ann.y) < 8 &&
          existing.damageType === ann.damageType
      );
      if (!isDuplicate) {
        annotations.push(ann);
      } else {
        logger.info("[PHOTO_ANNOTATE] Filtered duplicate box", {
          x: ann.x,
          y: ann.y,
          type: ann.damageType,
        });
      }
    }

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

    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[PHOTO_ANNOTATE] Error", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return specific error message for debugging
    if (errorMessage.includes("Failed to fetch image")) {
      return apiError(500, "IMAGE_FETCH_ERROR", `Could not fetch image: ${errorMessage}`);
    }
    if (errorMessage.includes("rate") || errorMessage.includes("429")) {
      return apiError(429, "OPENAI_RATE_LIMIT", "OpenAI rate limit reached. Please wait a moment.");
    }
    if (errorMessage.includes("API key") || errorMessage.includes("authentication")) {
      return apiError(500, "OPENAI_AUTH_ERROR", "AI service configuration error");
    }

    return apiError(500, "ANALYSIS_ERROR", `Failed to analyze photo: ${errorMessage}`);
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
Temperature differential significance: >5°F difference often indicates a problem.

⚠️ BOUNDING BOX ACCURACY — coordinates are 0-100 percentages where 0,0 is TOP-LEFT.
Place boxes EXACTLY where the anomaly is visible. NEVER generate evenly-spaced or grid-like coordinates.
If uncertain, report fewer boxes with high confidence rather than guessing positions.`;
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
Always be thorough but conservative - only identify damage you can clearly see.

⚠️ BOUNDING BOX ACCURACY — coordinates are 0-100 percentages where 0,0 is TOP-LEFT.
Place boxes EXACTLY where the damage is visible in the photo. NEVER generate evenly-spaced or grid-like coordinates.
NEVER make all boxes the same size. If uncertain, report fewer high-confidence boxes.`;
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

DAMAGE TYPE CLASSIFICATION (CRITICAL — FOLLOW EXACTLY):
- "hail_impact" = Physical damage to ANY solid material: chips in stucco, cracks in trim, dents in siding, divots, fractures
- "hail_spatter" = ONLY for tiny paint-only marks on smooth PAINTED METAL (gutters, downspouts, AC cabinets)
- If stucco is chipped/divoted → "hail_impact" (NEVER "spatter")
- If trim is cracked/chipped → "hail_impact" or "trim_damage" (NEVER "spatter")
- If siding is fractured/dented → "hail_impact" or "siding_crack" (NEVER "spatter")

CRITICAL BOUNDING BOX ACCURACY:
- Coordinates are 0-100 percentages where 0,0 is TOP-LEFT
- y=0 is the TOP of the image, y=100 is the BOTTOM
- Place boxes EXACTLY where you see damage, not at the bottom by default
- If paint chips are in the MIDDLE of the photo, use y values around 40-60
- If damage is near the TOP, use y values around 10-30
- MINIMUM box size: 3% width AND 3% height — do NOT draw tiny invisible boxes
- Each bounding box should encompass the FULL extent of the damage
- Mark EACH individual hit separately — do not group into one big box

⚠️ ANTI-HALLUCINATION — NEVER generate evenly-spaced or grid-like coordinates.
NEVER make all boxes the same size. Report FEWER high-confidence boxes rather than guessing positions.

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
Always be thorough but conservative - only identify damage you can clearly see.

⚠️ BOUNDING BOX ACCURACY — coordinates are 0-100 percentages where 0,0 is TOP-LEFT.
Place boxes EXACTLY on each dent, fin damage area, or impact mark you can see.
NEVER generate evenly-spaced or grid-like coordinates. NEVER make all boxes the same size.`;
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
Always be thorough but conservative - only identify damage you can clearly see.

⚠️ BOUNDING BOX ACCURACY — coordinates are 0-100 percentages where 0,0 is TOP-LEFT.
Place boxes EXACTLY on each dent, puncture, or separation you can see. NEVER generate evenly-spaced coordinates.`;
  }

  if (componentType === "window") {
    return `You are a HAAG Engineering certified window and glazing damage assessor for insurance claims.
You analyze photos to identify damage on:
- Window glass: cracks (impact, stress, thermal), chips, scratches
- Window frames: dents, warping, rot, paint chipping
- Window trim: paint chips, rot, cracks, hail impacts
- Window casings & brick mold: chips, cracks, dents from impacts
- Seals and weatherstripping: failure, gaps
- Hardware: broken locks, damaged handles

CRITICAL BOUNDING BOX ACCURACY:
- Coordinates are 0-100 percentages where 0,0 is TOP-LEFT of image
- y=0 is TOP, y=100 is BOTTOM - do NOT default boxes to bottom
- Place boxes EXACTLY on the damaged area
- If damage is in the UPPER portion of the photo, use y values 10-40
- If damage is in the MIDDLE, use y values 40-60
- Boxes should TIGHTLY wrap each damaged spot
- Mark EACH individual hit/chip separately — do NOT group into one large box

⚠️ ANTI-HALLUCINATION — NEVER generate evenly-spaced or grid-like coordinates.
NEVER produce boxes in a row, column, staircase, or diagonal pattern.
NEVER make all boxes the same size. Report FEWER high-confidence boxes rather than guessing.

HAIL DAMAGE ON WINDOWS/TRIM (CRITICAL — OFTEN MISSED):
- Paint chipping on wood trim in CIRCULAR pattern = HAIL IMPACT (use "hail_spatter")
- Cracks or chips in vinyl/composite trim from hail strikes
- Dents on aluminum window frames and J-channel trim
- Chips in vinyl frames from hail impacts
- Cracks in glass from impacts (star patterns, bulls-eye)
- Window sill damage: chips, dents, paint displacement from hail
- Brick mold / exterior casing: circular impact marks, chips, cracks
- Drip cap damage above windows from hail
- Each paint chip on trim = INDIVIDUAL HAIL HIT that must be boxed separately

WINDOW TRIM CRACKING & CHIPPING FROM HAIL (1"+ hailstones):
- Large hail (1"+) causes VISIBLE cracking/chipping in:
  * Wood trim: circular impact marks with paint displacement
  * Composite/PVC trim: crescent-shaped cracks, chips, fracture marks
  * Vinyl J-channel: dents, splits, deformation
  * Metal drip cap: dents, bends
- Look for FRESH exposed substrate (bright white/light color = recent damage)
- Cracking that radiates from a central impact point = HAIL (not thermal)
- Multiple chips in random directional pattern = HAIL STORM SIGNATURE
- Paint chips exposing bare wood with circular edges = HAIL SPATTER

WIND TRIM DAMAGE - ALSO LOOK FOR:
- J-channel dents or separation
- Corner trim damage
- Fascia trim with paint chips
- Drip cap damage above windows
- Brick mold damage around frames

Draw precise bounding boxes around ALL damaged areas.
Every paint chip, crack, or dent on trim = DAMAGE that must be documented.
Be AGGRESSIVE — subtle damage from hail is still damage.
Use "hail_impact" or "hail_spatter" for hail damage, NEVER "crack" for circular marks.`;
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

⚠️ ANTI-HALLUCINATION — NEVER generate evenly-spaced or grid-like coordinates.
NEVER make all boxes the same size. Report FEWER high-confidence boxes rather than guessing.

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
    return `You are a HAAG Engineering certified property damage assessor — the WORLD'S BEST AI damage analyzer for insurance claims.
You can identify damage on ANY component shown in the image using HAAG methodology, ITEL standards, and IICRC protocols.

You are AGGRESSIVE and THOROUGH — you identify EVERY mark, dent, chip, hole, stain, and anomaly.
Insurance adjusters rely on you to catch damage that human inspectors miss.

CRITICAL BOUNDING BOX ACCURACY:
- Coordinates are 0-100 percentages where 0,0 is TOP-LEFT of image
- y=0 is TOP, y=100 is BOTTOM - do NOT default boxes to bottom
- Place boxes EXACTLY where you see damage in the image
- If damage is in the CENTER of the photo, use y values around 40-60
- If damage is near the TOP, use y values around 10-30
- Each box should TIGHTLY wrap the specific damage — small and precise
- Mark EACH individual hit/damage spot separately — NEVER group into one big box
- A 2-inch paint chip gets a 2-3% wide box, NOT a 20% wide box

⚠️ ANTI-HALLUCINATION — COORDINATE ACCURACY IS PARAMOUNT:
- NEVER generate evenly-spaced coordinates (e.g., x=15,35,55,75)
- NEVER produce boxes that form a row, column, grid, staircase, or diagonal
- NEVER make all boxes the same size — real damage varies in extent
- If uncertain, report FEWER boxes at high confidence rather than guessing positions
- A wrong coordinate is WORSE than no coordinate

FIRST: Identify what component/material is shown in this photo:
- Roofing (shingles, tile, metal, flat/TPO/EPDM, slate, wood shake)
- Siding (vinyl, fiber cement, wood, stucco, EIFS, aluminum)
- Windows (glass, frames, trim, casings, brick mold, sills)
- Window screens & door screens
- Gutters and downspouts (aluminum, vinyl, steel, copper)
- HVAC equipment (AC condensers, package units, mini-splits)
- Garage doors (steel, aluminum, wood, composite)
- Mailboxes (metal, plastic, mounted posts)
- Electrical boxes / meter boxes / utility panels
- Light fixtures (exterior wall-mount, post-mount, soffit-mount)
- Outdoor furniture (wicker chairs, metal tables, cushions, umbrellas)
- Awnings and canopies (fabric, metal, retractable)
- Fencing (wood, vinyl, chain link, wrought iron)
- Decking and patio (wood, composite, concrete, pavers)
- Stucco/EIFS exterior walls
- Paint surfaces (trim, fascia, soffits, door frames)
- Foundation walls and masonry
- Chimney (masonry, metal)
- Skylights
- Any other exterior structure

THEN: Identify ALL visible damage using HAAG insurance terminology:

═══ HAIL DAMAGE (use "hail_impact" or "hail_spatter", NEVER "crack" for circular marks) ═══
- Shingles: Circular bruises with granule displacement, mat fractures — EACH HIT gets its own box
- Soft metals (THE MOST IMPORTANT HAIL INDICATOR — check ALL of these):
  * Gutters: Dents along the face and top lip (count them)
  * Downspouts: Dents, creases, crushed sections
  * AC unit fins: Bent/crushed condenser fins — estimate % damaged
  * AC unit cabinet/top: Dents on painted metal surfaces
  * Mailboxes: Dents on top, sides, and door — CRITICAL hail indicator
  * Electrical boxes/meter boxes: Dents on metal covers/doors
  * Light fixtures: Dents on metal housings
  * Flashing, drip edge, ridge caps: Small dents
  * Window frames (aluminum): Dents on horizontal surfaces
  * Outdoor furniture (metal): Dents on table tops, chair frames
  * ANY metal surface exposed to sky = check for dents
- Paint surfaces — SPATTER MARKS (CRITICAL — often missed):
  * Random circular paint chips exposing bare substrate = HAIL
  * Window trim: circular chips in paint = HAIL HIT (use "hail_spatter")
  * Door frames: paint displacement from impacts
  * Fascia boards: circular paint chips
  * Soffit panels: spatter on horizontal surfaces (heaviest damage)
  * Garage doors: paint chips on painted steel/aluminum
  * Porch ceilings: spatter marks from hail bouncing off surfaces
  * Electrical box covers: paint chips
  * Mailbox surfaces: paint chips
  * EACH paint chip = its own tight bounding box
- Stucco/EIFS: Circular divots, chips, spalling in random pattern
- Garage doors: Panel dents in random pattern across face
- Screens: Small holes punched through mesh from hailstones
- Tile roofing: Fractures, chips, broken corners from impacts
- Metal roofing: Dents in panels (check all seam areas too)
- Wood surfaces: Impact dents, gouges, split grain
- Vinyl siding: Cracks, holes, chips along exposure
- Fiber cement: Corner chips, edge spalling, divots

═══ WINDOW TRIM & CASING DAMAGE (MOST COMMONLY MISSED — LOOK CAREFULLY) ═══
- Paint chipping on wood/composite trim in CIRCULAR pattern = HAIL
- Cracks or chips in vinyl/composite trim from strikes
- Brick mold: circular impact marks, chips, cracks
- Window sills: chips, dents, paint displacement
- Drip caps: dents above windows from falling hail
- J-channel: dents, splits, deformation
- Each paint chip on trim = INDIVIDUAL HAIL HIT = its own box

═══ AC UNIT / HVAC DAMAGE (CRITICAL SOFT METAL INDICATOR) ═══
- Condenser fins: Bent/crushed in pattern — estimate % coverage
- Top grille: Dents from direct overhead hail
- Cabinet panels: Dents, paint spatter
- Fan blade: Bent from impacts
- Refrigerant line insulation: Torn/damaged from impacts
- Electrical disconnect: Dents on metal cover
- Pad/platform: Damage from hail bounce

═══ MAILBOX & ELECTRICAL BOX DAMAGE (GREAT HAIL INDICATORS) ═══
- Mailbox top: Dents (horizontal surface takes heaviest hits)
- Mailbox sides: Directional dents matching storm track
- Mailbox door: Dents, paint chips
- Mailbox post (if metal): Dents
- Electrical meter box: Dents on metal cover/door
- Panel box cover: Impact marks
- Light fixture housing: Dents, glass breakage

═══ OUTDOOR FURNITURE & ITEMS ═══
- Wicker chairs/tables: Cracked/broken wicker from impacts
- Metal furniture: Dents on table tops, chair seats, arm rests
- Cushion fabric: Tears from storm debris
- Umbrellas: Torn fabric, bent frames
- Planters: Chips, cracks from hail impacts
- Decorative items: Any visible storm damage

═══ AWNING & WATER INTRUSION ═══
- Fabric awnings: Tears, holes, stretched areas from hail/wind
- Metal awnings: Dents across surface
- Frame damage: Bent supports, loose connections
- WATER INTRUSION BEHIND AWNINGS: Water staining on wall behind/under awning
- Wall damage where awning meets building (seal failure = water entry)
- Paint peeling/bubbling on wall behind awning = MOISTURE INTRUSION
- Mold/mildew growth at awning-wall junction

═══ GUTTER & DOWNSPOUT DAMAGE ═══
- Gutter face: Count individual dents (each gets a box)
- Gutter lip/top: Dents, bends
- Gutter seams: Separation, splitting
- Gutter hangers: Bent, broken, pulled out
- Downspouts: Dents (every 90° elbow — check each)
- Downspout connections: Separation, disconnected
- End caps: Dents, displacement
- Splash blocks: Damage, displacement

═══ WIND DAMAGE ═══
- Lifted/torn materials, displaced components
- Directional damage patterns (debris throw direction)
- Missing components in pattern following wind flow

═══ WATER DAMAGE (look for ALL signs) ═══
- Staining, tide marks, discoloration on any surface
- Wood rot, soft spots, fungal growth
- Paint bubbling, peeling, flaking from moisture
- Warping, buckling, swelling
- Mold/mildew (dark spots, fuzzy growth)
- Efflorescence on masonry (white mineral deposits)
- Water behind awnings (staining on wall surface)
- Water entry points at penetrations

═══ THERMAL IMAGING INDICATORS (if this appears to be thermal/IR) ═══
- Hot spots: Bright areas indicating heat source or missing insulation
- Cold spots: Dark areas indicating air infiltration
- Moisture signatures: Temperature differentials from wet insulation
- Duct leaks: Heat escaping along ductwork paths

═══ TILE ROOF DAMAGE ═══
- Clay tile: Fractures, chips, broken corners, crescent cracks
- Concrete tile: Impact fractures, spalling, broken edges
- Flat tile: Cracked from impacts, displaced from wind
- Underlayment exposure under broken tiles

═══ METAL ROOF DAMAGE ═══
- Standing seam: Dents along panels, seam damage
- Corrugated: Dents following ridge pattern
- Ribbed: Impact dents between ribs and on ribs
- Fastener area: Loosened/damaged from impacts

═══ FLAT ROOFING DAMAGE ═══
- TPO/PVC: Punctures, tears, seam separation
- EPDM: Punctures, wrinkles, seam failure
- Modified bitumen: Granule loss, tears, punctures
- Built-up: Surface deterioration, blistering from impacts
- Ponding water areas

IMPORTANT RULES:
1. Be AGGRESSIVE — mark EVERYTHING suspicious. Every dent, chip, mark matters.
2. Use TIGHT bounding boxes — small boxes around each damage point.
3. NEVER group multiple hits into one large box.
4. Use "hail_impact" or "hail_spatter" for hail, NEVER "crack" for circular marks.
5. Soft metal damage is the #1 indicator of hail — always check mailboxes, AC units, gutters.
6. Paint chips in circular pattern = HAIL, paint peeling in sheets = MOISTURE.
7. Scan the ENTIRE image systematically: top-left → top-center → top-right → center-left → center → center-right → bottom-left → bottom-center → bottom-right.`;
  }

  // Route new component types to the general system prompt (handles everything)
  if (
    componentType === "mailbox" ||
    componentType === "electrical_box" ||
    componentType === "outdoor_furniture" ||
    componentType === "awning" ||
    componentType === "garage_door" ||
    componentType === "downspout"
  ) {
    return buildSystemPrompt("general", claimType, isThermal);
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

DAMAGE TYPE CLASSIFICATION RULES (VERY IMPORTANT):
- "hail_impact" = Physical damage to ANY material: chips, cracks, dents, divots, fractures in stucco, trim, siding, wood, composite
- "hail_spatter" = ONLY tiny paint-only marks on smooth PAINTED METAL surfaces (gutters, downspouts, AC cabinets)
- If you see MATERIAL damage (stucco divots, trim chips, wood cracks) → ALWAYS use "hail_impact"
- If you see only paint displacement on METAL → use "hail_spatter"
- NEVER classify stucco chips, trim cracking, or siding fractures as "spatter"

BOUNDING BOX SIZE MINIMUMS:
- Each bounding box must be at least 3% width AND 3% height
- Boxes should encompass the FULL visible extent of each damage point
- Do NOT draw tiny 1-2% boxes — they are invisible to the user

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

⚠️ ANTI-HALLUCINATION — COORDINATE ACCURACY IS PARAMOUNT:
- You MUST look at the ACTUAL PIXELS where damage appears and report THOSE coordinates
- NEVER generate evenly-spaced coordinates (e.g., x=15,35,55,75 or y=20,40,60)
- NEVER produce boxes that form a row, column, grid, staircase, or diagonal line
- NEVER make all boxes the same size — real damage varies in extent
- If you are uncertain where damage is, report FEWER boxes with high confidence
  rather than guessing with many boxes at fabricated coordinates
- Think of the image as a 10×10 grid. For each damage you report, mentally confirm
  WHICH specific grid cell it falls in by examining the actual image content there
- A wrong coordinate is WORSE than no coordinate — adjusters will lose trust

CLOSE-UP vs WIDE-ANGLE PHOTOS:
- Close-up photos (1-3 shingles visible): use LARGER boxes (20-60% of image) since damage fills the frame
- Medium shots: use medium boxes (8-20%)
- Wide-angle shots: use small precise boxes (3-8%) for each individual hit
- Always match box size to how large the damage APPEARS in this specific photo

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
  isThermalImage: boolean = false,
  jurisdictionContext: string = ""
): string {
  // Append jurisdiction context to any prompt
  const addJurisdiction = (prompt: string) =>
    jurisdictionContext ? `${prompt}\n\n${jurisdictionContext}` : prompt;

  // Thermal imaging analysis prompt
  if (isThermalImage) {
    return addJurisdiction(buildThermalPrompt());
  }

  // Fire damage analysis prompt
  if (claimType === "fire") {
    return addJurisdiction(buildFireDamagePrompt());
  }

  // Water damage analysis prompt
  if (claimType === "water") {
    return addJurisdiction(buildWaterDamagePrompt());
  }

  // Component-specific prompts
  if (componentType === "siding") {
    return addJurisdiction(buildSidingPrompt(claimType));
  }
  if (componentType === "hvac") {
    return addJurisdiction(buildHVACPrompt(claimType));
  }
  if (componentType === "gutter") {
    return addJurisdiction(buildGutterPrompt(claimType));
  }
  if (componentType === "window") {
    return addJurisdiction(buildWindowPrompt(claimType));
  }
  if (componentType === "screen") {
    return addJurisdiction(buildScreenPrompt(claimType));
  }
  if (componentType === "general") {
    return addJurisdiction(buildGeneralPrompt(claimType));
  }
  // Route new component types to the general prompt (which handles everything)
  if (
    componentType === "mailbox" ||
    componentType === "electrical_box" ||
    componentType === "outdoor_furniture" ||
    componentType === "awning" ||
    componentType === "garage_door" ||
    componentType === "downspout"
  ) {
    return addJurisdiction(buildGeneralPrompt(claimType));
  }

  // Default: Comprehensive roofing analysis prompt
  return addJurisdiction(buildRoofingPrompt(roofType, includeSlopes, claimType));
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

BOUNDING BOX PRECISION RULES (CRITICAL — READ CAREFULLY):
- Coordinates are 0-100 percentages. (0,0) = TOP-LEFT corner of image.
- x increases left→right. y increases top→bottom.
- Think of the image as a 10×10 grid. Each cell is 10%×10%.
- STEP 1: Mentally divide the image into a 5×5 grid (each cell = 20%×20%).
- STEP 2: For EACH damage mark, identify which grid cell it falls in.
- STEP 3: Place the box center at the damage location, NOT at a grid intersection.
- VARY the x and y coordinates — real damage is scattered randomly, not in neat rows or columns.
- DO NOT place all boxes at similar y values (horizontal row pattern = hallucination).
- DO NOT place all boxes at similar x values (vertical column pattern = hallucination).
- DO NOT use evenly spaced coordinates (e.g., x=20,40,60 or y=25,40,55 = hallucination).
- Each box should have DIFFERENT dimensions based on the actual damage size.
- Hail impacts on shingles: typically 3-8% wide/tall (small individual marks).
- Large damaged areas (missing shingle, tear): 10-25% wide/tall.
- Dents on soft metal: 2-5% wide/tall.
- Box should be TIGHT around the specific damage, not a large region.
- Think about WHERE in the actual photograph the damage appears — top, bottom, left, right, center.
- If damage is clustered in one area of the photo, boxes should be clustered there too.
- If damage is spread across the photo, boxes should reflect that spread.

IMPORTANT: The bounding box coordinates MUST correspond to where you actually SEE the damage in the image. 
Do NOT default to placing boxes in the center or bottom. Look at the image carefully and place each box exactly where the damage is visible.

CLOSE-UP vs WIDE-ANGLE PHOTO HANDLING (CRITICAL):
- CLOSE-UP PHOTOS (showing 1-3 shingles or a single damage area filling most of the frame):
  → Use LARGER bounding boxes (20-60% width/height) since the damage fills more of the frame
  → A single hail impact in a close-up may occupy 30-50% of the image
  → Place 1-3 large boxes encompassing the visible damage
- MEDIUM SHOTS (showing a section of roof, ~10-20 shingles visible):
  → Use MEDIUM boxes (8-20% width/height) for each damage mark
  → Typically 3-8 damage areas visible
- WIDE-ANGLE SHOTS (full roof slope, entire elevation):
  → Use SMALLER boxes (3-8% width/height) tightly around each individual mark
  → May have 5-15+ damage areas scattered across the image
- ALWAYS match box size to how large the damage APPEARS in this specific photo

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
    claimType === "hail" || claimType === "storm"
      ? `
⚠️ THIS IS A HAIL CLAIM — The homeowner reported hail damage. You MUST find evidence.

STUCCO HAIL DAMAGE (MOST COMMONLY MISSED BY ADJUSTERS):
- Circular divots/chips in random pattern = HAIL HITS (not settlement cracks)
- Look for FRESH exposed aggregate or lighter colored substrate
- Even TINY circular marks (1/4" diameter) are hail impacts — mark them ALL
- Stucco absorbs impact energy — damage may be subtle texture changes
- Check around windows, corners, and any horizontal surfaces
- Use type "hail_impact" or "stucco_damage" — NEVER "spatter"

HAIL DAMAGE SIGNATURES (use correct damage types):
- Vinyl: Cracks, holes, chips along exposure → "hail_impact"
- Fiber cement: Corner chips, cracks, divots → "hail_impact"
- Aluminum: Dents (check for hail pattern across runs) → "hail_impact"
- Wood: Dents, gouges, split grain from impacts → "hail_impact"
- Stucco/EIFS: Circular chips, divots, spalling in random pattern → "hail_impact" (NOT "spatter")
- Window/door trim: Paint chipping in circular patterns from hail → "hail_impact" (NOT "spatter")

CRITICAL DISTINCTION:
- "hail_impact" = Physical damage to the MATERIAL itself (chips, cracks, dents, divots in stucco/trim/siding)
- "hail_spatter" = ONLY for tiny paint-only marks on smooth painted metal surfaces (gutters, downspouts, AC units)
- If you can see MATERIAL damage (not just paint), use "hail_impact"
- NEVER call stucco chips/divots "spatter" — they are IMPACTS
- NEVER call trim cracking/chipping "spatter" — they are IMPACTS

AGGRESSIVENESS: Document EVERY potential damage point. When in doubt, mark it.
Insurance adjusters will verify — your job is to find ALL possibilities.

BOUNDING BOX SIZE:
- Each box should FULLY encompass the damaged area (not just a tiny dot)
- Minimum width/height: 3% of image for visible damage points
- For paint chips on trim, box the ENTIRE chip area, not just the center point`
      : "";

  return `Analyze this siding/exterior wall photo for an ACTIVE INSURANCE CLAIM.

⚠️ IMPORTANT: This photo was submitted as part of a damage claim. The homeowner believes damage exists.
Your job is to FIND and DOCUMENT all damage, even subtle marks. Over-document rather than under-document.

IDENTIFY SIDING TYPE:
- Vinyl siding (lap, shake, board & batten)
- Fiber cement (Hardie board, lap, shake, panel)
- Wood siding (clapboard, shake, board & batten)
- Aluminum siding
- Stucco/EIFS — LOOK CAREFULLY for circular divots/chips
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
- Circular divots in stucco (HAIL!)
- Paint chips on trim
- Any texture irregularities

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
⚠️ THIS IS A HAIL CLAIM — The homeowner reported hail damage to windows/trim. You MUST find evidence.

WINDOW TRIM HAIL DAMAGE (FREQUENTLY MISSED):
- Paint chips showing bare wood/substrate = HAIL IMPACT
- Each chip is a SEPARATE detection — mark them ALL individually
- Look for CIRCULAR impact patterns (not linear weathering)
- Fresh chips have BRIGHT exposed substrate (white/tan wood)
- Older chips may be grayed but are still hail damage
- Check ALL horizontal surfaces: sills, brick mold, drip caps

HAIL DAMAGE SIGNATURES (DOCUMENT EVERY HIT):
- Impact cracks in glass (star, bulls-eye patterns)
- Chips in glass edges or corners
- Dents in aluminum frames
- Chips in vinyl/wood frames from impacts
- Damaged glazing seals
- WINDOW TRIM CRACKING/CHIPPING: Large hail (1"+) causes visible cracking and chipping in wood, composite, and PVC trim — these are CIRCULAR impact marks with paint displacement
- Each paint chip or crack on trim = INDIVIDUAL HAIL HIT
- Look for FRESH exposed substrate (bright white/light color = recent hail)
- Casing/brick mold: circular chips, cracks radiating from impact point
- Drip cap dents above window
- Window sill: chips, dents, paint displacement from hail strikes

AGGRESSIVENESS: If you see ANY paint chip on trim, DOCUMENT IT. Insurance will verify.`
      : "";

  return `Analyze this WINDOW photo for an ACTIVE INSURANCE CLAIM.

⚠️ IMPORTANT: This photo was submitted as part of a damage claim. The homeowner believes damage exists.
Your job is to FIND and DOCUMENT all damage, especially on window TRIM. Over-document rather than under-document.

IDENTIFY WINDOW TYPE:
- Single-hung, Double-hung, Casement, Sliding, Fixed, Bay/Bow
- Frame material: Vinyl, Aluminum, Wood, Fiberglass, Composite
- Glass type: Single-pane, Double-pane (IGU), Triple-pane, Tempered, Laminated

${hailSpecific}

CRITICAL: Draw bounding boxes around ALL damage, no matter how small:
- Glass damage: Cracks, chips, scratches, fogging (seal failure)
- Frame damage: Dents, chips, warping, rot, paint peeling/chipping
- Trim damage: Cracking, chipping, missing caulk, paint failure from hail impacts
- Casing/brick mold damage: Circular chips and cracks from hail
- Window sill damage: Chips, dents, paint displacement
- Hardware: Broken locks, damaged handles, failed weatherstripping
- Seal failure: Condensation between panes, visible moisture

PAINT CHIPPING IS DAMAGE - Always box it:
- Peeling paint on frames
- Chipped paint on trim/casing (CIRCULAR chips from HAIL = use "hail_impact" NOT "hail_spatter")
- Cracking/chipping of trim MATERIAL (wood, composite, PVC) = "hail_impact"
- Flaking finish on sills
- Exposed wood from paint failure
- Each chip gets its OWN bounding box

CRITICAL: "hail_spatter" is ONLY for tiny paint-only marks on smooth METAL surfaces.
For ALL damage on trim, stucco, wood, composite — use "hail_impact" or "trim_damage".

BOUNDING BOX SIZING:
- Make boxes LARGE ENOUGH to clearly show the damage area
- Minimum 3% width/height for individual hits
- Box the FULL extent of each damage point, not just the center

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
      "type": "window_crack" | "window_chip" | "seal_failure" | "frame_dent" | "frame_rot" | "paint_chipping" | "hail_spatter" | "hail_impact" | "trim_damage" | "trim_cracking" | "trim_chipping" | "casing_damage" | "hardware_damage",
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
    hail: "CRITICAL: This is a HAIL CLAIM - the homeowner reported HAIL DAMAGE. You MUST find hail damage evidence. Look for: circular chips/divots in STUCCO (even tiny ones), paint chips on window TRIM showing wood substrate, dents in any soft metal, granule loss on shingles. DAMAGE TYPE RULES: (1) 'hail_impact' = ALL material damage (chips, cracks, dents, divots) on stucco, trim, siding, metal. (2) 'hail_spatter' = ONLY tiny paint-only marks on smooth PAINTED METAL. (3) NEVER use 'spatter' for stucco/trim/siding material damage. Draw boxes around EVERY impact mark - even small circular discolorations or subtle texture changes could be hail hits. MINIMUM 5 detections expected for any surface with hail exposure.",
    wind: "Focus on torn/lifted materials, displaced items, directional damage patterns, structural shifts, debris impacts",
    fire: "Focus on charring, smoke damage, heat warping, discoloration, fire suppression water damage",
    water:
      "Focus on staining, warping, mold, rot, water lines, paint bubbling/peeling, efflorescence, water intrusion behind awnings/overhangs",
    storm:
      "STORM CLAIM - Look for ALL damage: hail impacts on EVERY surface (stucco chips, trim paint chips, soft metal dents), wind damage, water intrusion. Be AGGRESSIVE - insurance adjusters want to see EVERY hit documented.",
    general:
      "Identify ALL visible damage - be EXTREMELY thorough. This photo is from an insurance claim - the homeowner believes there IS damage. Your job is to FIND and DOCUMENT it. Check EVERY surface: soft metals, paint, trim, stucco, screens. Even small marks matter for claims.",
  };

  return `You are the WORLD'S BEST property damage analyzer — a HAAG Engineering certified assessor for insurance claims.

⚠️ CRITICAL INSTRUCTION: This photo is from an ACTIVE INSURANCE CLAIM. The property owner believes there IS damage.
Your job is to find and document ALL damage, not to determine if damage exists. When in doubt, MARK IT.
Insurance adjusters need EVERY potential damage point documented — they will verify in person.

AGGRESSIVENESS LEVEL: MAXIMUM
If you see ANY mark, discoloration, texture change, or irregularity — DOCUMENT IT with a bounding box.
It's better to over-document than to miss damage that costs the homeowner money.

CLAIM TYPE: ${claimType.toUpperCase()}
${claimContext[claimType as keyof typeof claimContext] || claimContext.general}

FIRST - Identify what you're looking at (be specific about material/type):
- Roof (asphalt shingle, tile, metal standing seam/corrugated, TPO/EPDM, slate, wood shake)
- Siding (vinyl, fiber cement/Hardie, wood, stucco, EIFS, aluminum, brick veneer)
- Stucco / EIFS wall — VERY IMPORTANT: Look for circular divots, chips, impact marks in random pattern
- Window (glass, frame type: vinyl/aluminum/wood, trim, casings, brick mold, sills)
- Window TRIM — CRITICAL: Look for paint chips showing wood/substrate, cracks from impacts
- Screen (window, door, porch/patio, solar)
- Door / Garage Door (steel, aluminum, wood, composite, fiberglass)
- Gutter / Downspout (aluminum, vinyl, steel, copper, half-round/K-style)
- HVAC/AC unit (condenser, package unit, mini-split, ductwork)
- Mailbox (metal, plastic, mounted post, cluster unit)
- Electrical box / Meter box / Utility panel (metal covers)
- Light fixtures (wall-mount, post-mount, soffit-mount)
- Outdoor furniture (wicker, metal, resin, wood chairs/tables)
- Awning / Canopy (fabric, metal, retractable)
- Fence (wood, vinyl, chain link, wrought iron, aluminum)
- Deck/patio (wood, composite, concrete, pavers)
- Stucco / EIFS wall
- Paint surface (trim, fascia, soffit, door frames)
- Foundation / masonry
- Chimney / Skylight
- Any other exterior structure

THEN - Draw bounding boxes around EVERY piece of damage:

═══ HAIL DAMAGE (use type "hail_impact" or "hail_spatter", NEVER "crack") ═══
- Circular/semi-circular indentations on any surface
- Paint spatter: random circular paint chips exposing substrate
- Soft metal dents: gutters, downspouts, AC fins/cabinet, mailboxes, electrical boxes, light fixtures, flashing
- Shingle bruises: granule displacement in circular pattern
- Stucco chips/divots from impacts
- Garage door panel dents
- Screen punctures/holes from hailstones
- Wood surface dents/gouges
- Wicker/furniture damage from hail impacts

═══ SOFT METAL INDICATORS (THE MOST IMPORTANT — CHECK ALL) ═══
- Mailbox: dents on top, sides, door (BEST hail indicator after gutters)
- AC unit: condenser fin damage (% bent), cabinet dents, top grille dents
- Electrical/meter box: dents on metal covers/doors
- Gutters: dents along face (count them!)
- Downspouts: dents at every section and elbow
- Flashing/drip edge: small dents
- Light fixture housings: dents, glass damage

═══ WINDOW TRIM / PAINT SURFACES ═══
- Paint chipping in circular pattern = HAIL (use "hail_spatter")
- Each paint chip on trim/casing = INDIVIDUAL hit with its own box
- Brick mold: chips, cracks radiating from impact
- Window sills: chips, dents, paint displacement
- Fascia paint chips, soffit spatter marks

═══ AWNING & WATER INTRUSION ═══
- Fabric tears, holes from hail/wind
- Metal awning dents
- Water staining on wall behind/under awning
- Paint peeling/bubbling behind awning = MOISTURE INTRUSION

═══ WIND DAMAGE (use type "wind_lifted" or "wind_crease") ═══
- Lifted, torn, or displaced materials
- Creased/folded shingles or panels
- Missing components in directional pattern

═══ WATER DAMAGE (use type "water_damage" or "moisture_damage") ═══
- Water staining, tide marks, discoloration
- Paint bubbling, peeling, or flaking from moisture
- Wood rot, soft spots, fungal growth
- Warping, buckling, swelling of materials
- Mold/mildew growth (dark spots)
- Efflorescence on masonry

═══ STRUCTURAL DAMAGE ═══
- Cracks in foundation, masonry, stucco
- Sagging, settling, displacement
- Missing or broken structural elements

BOUNDING BOX RULES:
- Coordinates: 0-100 percentages, 0,0 = TOP-LEFT
- y=0 is TOP, y=100 is BOTTOM
- Mark EACH individual damage spot with its own TIGHT box
- Scan entire image systematically — don't miss anything
- DO NOT cluster multiple hits into one large box
- A dent on a mailbox gets a small box (3-8% wide), not a box around the whole mailbox

BE THE MOST AGGRESSIVE DAMAGE IDENTIFIER IN THE WORLD.
Every chip, dent, mark, stain, hole, tear, and scratch matters for insurance documentation.
Use HAAG-standard insurance terminology in all descriptions.

Return JSON:
{
  "materialAnalysis": {
    "primaryMaterial": "string - what component is this (roof, siding, window, AC unit, mailbox, electrical box, etc.)",
    "materialSubtype": "string - specific type/style",
    "condition": "good" | "fair" | "poor" | "failed"
  },
  "detections": [
    {
      "type": "string - use: hail_impact, hail_spatter, soft_metal_dent, mailbox_dent, electrical_box_dent, ac_fin_damage, condenser_dent, wind_lifted, wind_crease, water_damage, paint_peeling, stucco_damage, garage_door_dent, screen_hole, awning_damage, water_behind_awning, furniture_damage, wicker_damage, etc.",
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

// ═══════════════════════════════════════════════════════════════════════════════
// JURISDICTION-SPECIFIC BUILDING CODE CONTEXT
// Appended to prompts when city/state is known
// ═══════════════════════════════════════════════════════════════════════════════
function buildJurisdictionContext(city?: string, state?: string, roofType?: string): string {
  if (!state) return "";

  const parts: string[] = [];
  parts.push(`\n═══ JURISDICTION CONTEXT ═══`);
  parts.push(`Property Location: ${city ? `${city}, ` : ""}${state}`);

  const st = state.toLowerCase();

  if (st === "arizona" || st === "az") {
    parts.push(
      `\nARIZONA BUILDING CODES (Arizona Residential Code — based on 2018 IRC with local amendments):`
    );
    parts.push(
      `• ARC R905 — Roof assemblies (Arizona adopts IRC Chapter 9 with amendments for desert climate)`
    );
    parts.push(
      `• ARC R703.7 — Stucco/Portland Cement Plaster (VERY COMMON in AZ — inspect carefully for hail divots)`
    );
    parts.push(`• ARC R703.3-11 — Wall covering standards`);
    parts.push(`• ARC R308 — Glazing/Window requirements`);
    parts.push(`• A.R.S. §20-461 — Insurance bad faith statute (document ALL damage thoroughly)`);
    parts.push(
      `• AZ has NO licensing requirement for public adjusters — contractors must be ROC licensed`
    );

    // City-specific
    if (city) {
      const c = city.toLowerCase();
      if (
        c.includes("phoenix") ||
        c.includes("mesa") ||
        c.includes("tempe") ||
        c.includes("scottsdale") ||
        c.includes("chandler") ||
        c.includes("gilbert") ||
        c.includes("glendale")
      ) {
        parts.push(`\nMaricopa County Specifics:`);
        parts.push(`• Maricopa County requires engineered plans for re-roofing over 500 sq ft`);
        parts.push(`• City of ${city} building permit required for roof replacement`);
        parts.push(
          `• Monsoon season (June-Sept) = primary hail damage period — document thoroughly`
        );
        parts.push(
          `• Stucco is the DOMINANT exterior material — hail chips/divots are the #1 claim item`
        );
        parts.push(`• Tile roofs extremely common — check for cracked/broken tiles from hail`);
      } else if (
        c.includes("tucson") ||
        c.includes("oro valley") ||
        c.includes("marana") ||
        c.includes("vail") ||
        c.includes("sahuarita")
      ) {
        parts.push(`\nPima County Specifics:`);
        parts.push(`• Pima County adopts IRC 2018 with local amendments`);
        parts.push(`• Building permit required for roof replacement`);
        parts.push(`• High UV exposure — distinguish sun/age damage from storm damage`);
        parts.push(`• Stucco dominant — look for hail divots in random circular pattern`);
      } else if (
        c.includes("flagstaff") ||
        c.includes("prescott") ||
        c.includes("sedona") ||
        c.includes("cottonwood") ||
        c.includes("payson")
      ) {
        parts.push(`\nNorthern AZ / High Country Specifics:`);
        parts.push(`• Coconino/Yavapai County — heavier snow loads, ice dam requirements`);
        parts.push(`• IRC R905.2.7.1 ice barrier requirements APPLY in this area`);
        parts.push(`• More asphalt shingle roofs than Valley — inspect for granule loss`);
        parts.push(`• Wood siding more common — check for hail impact dents/gouges`);
      }
    }

    // Roof-type specific AZ notes
    if (roofType) {
      const rt = roofType.toLowerCase();
      if (
        rt.includes("tile") ||
        rt.includes("clay") ||
        rt.includes("concrete") ||
        rt.includes("spanish")
      ) {
        parts.push(
          `\nAZ Tile Roof Notes: Tile is extremely common in AZ. Check for cracked/broken tiles, displaced tiles, damaged underlayment beneath tiles. IRC R905.3 applies.`
        );
      } else if (
        rt.includes("flat") ||
        rt.includes("membrane") ||
        rt.includes("tpo") ||
        rt.includes("epdm") ||
        rt.includes("modified") ||
        rt.includes("built")
      ) {
        parts.push(
          `\nAZ Flat/Low-Slope Roof Notes: Common on commercial and some residential. Check for membrane punctures, blistering, ponding water. IRC R905.9/R905.11-13 applies. NOT shingle — do NOT reference IRC R905.2.`
        );
      } else if (rt.includes("foam")) {
        parts.push(
          `\nAZ Spray Foam Roof Notes: Very common in AZ. Check for hail impact divots in foam surface, coating damage, granule loss on coated surfaces. Requires recoating every 5-7 years.`
        );
      }
    }
  }

  // More states can be added here as needed

  return parts.join("\n");
}

function determineCodeFromType(damageTypeKey: string): string {
  // Fallback code determination based on damage type patterns
  if (damageTypeKey.includes("hail")) return "shingle_damage";
  if (
    damageTypeKey.includes("trim") ||
    damageTypeKey.includes("casing") ||
    damageTypeKey.includes("brick_mold")
  )
    return "siding_damage";
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
    damageTypeKey.includes("mailbox") ||
    damageTypeKey.includes("electrical_box") ||
    damageTypeKey.includes("meter_box") ||
    damageTypeKey.includes("light_fixture") ||
    damageTypeKey.includes("soft_metal") ||
    damageTypeKey.includes("aluminum") ||
    damageTypeKey.includes("copper")
  )
    return "soft_metal_damage";
  if (
    damageTypeKey.includes("furniture") ||
    damageTypeKey.includes("wicker") ||
    damageTypeKey.includes("cushion") ||
    damageTypeKey.includes("umbrella") ||
    damageTypeKey.includes("planter") ||
    damageTypeKey.includes("awning") ||
    damageTypeKey.includes("canopy")
  )
    return "exterior_damage";
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
    trim_damage: "Trim Damage (Hail)",
    trim_cracking: "Trim Cracking (Hail Impact)",
    trim_chipping: "Trim Chipping (Hail Impact)",
    window_trim_crack: "Window Trim Crack (Hail)",
    window_trim_chip: "Window Trim Chip (Hail)",
    casing_damage: "Casing Damage",
    brick_mold_damage: "Brick Mold Damage",
    ac_fin_damage: "AC Fin Damage",
    condenser_dent: "Condenser Dent",
    gutter_dent: "Gutter Dent",
    gutter_separation: "Gutter Separation",
    downspout_dent: "Downspout Dent",
    downspout_crushed: "Downspout Crushed",
    downspout_disconnected: "Downspout Disconnected",
    mailbox_dent: "Mailbox Dent (Hail)",
    mailbox_damage: "Mailbox Damage",
    electrical_box_dent: "Electrical Box Dent (Hail)",
    electrical_box_damage: "Electrical Box Damage",
    meter_box_dent: "Meter Box Dent (Hail)",
    soft_metal_dent: "Soft Metal Dent (Hail Indicator)",
    soft_metal_damage: "Soft Metal Damage (Hail)",
    aluminum_dent: "Aluminum Dent (Hail)",
    light_fixture_damage: "Light Fixture Damage",
    furniture_damage: "Outdoor Furniture Damage",
    wicker_damage: "Wicker Damage (Hail/Storm)",
    patio_furniture_damage: "Patio Furniture Damage",
    awning_damage: "Awning Damage",
    awning_tear: "Awning Tear",
    awning_frame_damage: "Awning Frame Damage",
    water_behind_awning: "Water Intrusion Behind Awning",
    water_intrusion_awning: "Water Intrusion (Awning)",
    garage_door_dent: "Garage Door Dent",
    garage_door_panel: "Garage Door Panel Damage",
    garage_door_paint: "Garage Door Paint Damage",
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
