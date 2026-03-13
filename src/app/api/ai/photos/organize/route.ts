/**
 * ============================================================================
 * AUTO PHOTO ORGANIZER API
 * ============================================================================
 *
 * Automatically categorizes and organizes inspection photos using YOLO + GPT-4o.
 * Sorts photos into component categories (roof, siding, gutters, etc.) and
 * identifies which photos show damage vs. context/overview shots.
 *
 * @route POST /api/ai/photos/organize
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOpenAI } from "@/lib/ai/client";
import { detectByComponent, type ComponentType, type NormalizedDetection } from "@/lib/ai/roboflow";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const OrganizeInputSchema = z.object({
  /** Array of photo URLs to organize */
  photos: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
        filename: z.string().optional(),
      })
    )
    .min(1, "At least one photo is required")
    .max(50, "Maximum 50 photos per batch"),

  /** Claim context for better categorization */
  claimType: z
    .enum(["hail", "wind", "water", "fire", "storm", "general"])
    .optional()
    .default("general"),

  /** Optional claim ID */
  claimId: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface OrganizedPhoto {
  id: string;
  url: string;
  filename?: string;
  /** Auto-detected component category */
  category: string;
  /** Sub-category (e.g., "north_slope", "front_elevation") */
  subCategory?: string;
  /** Whether damage was detected */
  hasDamage: boolean;
  /** Damage severity if detected */
  severity?: "none" | "minor" | "moderate" | "severe" | "catastrophic";
  /** Number of damage detections */
  detectionCount: number;
  /** AI-generated caption for the photo */
  caption: string;
  /** Suggested folder path */
  suggestedFolder: string;
  /** Key detections */
  detections: NormalizedDetection[];
  /** Confidence of categorization */
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY DETECTION VIA GPT-4o
// ─────────────────────────────────────────────────────────────────────────────

const PHOTO_CATEGORIES = [
  "roof_overview",
  "roof_closeup",
  "roof_damage",
  "siding_front",
  "siding_side",
  "siding_rear",
  "siding_damage",
  "gutter_overview",
  "gutter_damage",
  "downspout",
  "window_exterior",
  "window_interior",
  "window_damage",
  "door_exterior",
  "door_interior",
  "door_damage",
  "hvac_unit",
  "hvac_damage",
  "interior_room",
  "interior_damage",
  "water_damage",
  "mold",
  "foundation",
  "fence",
  "deck",
  "garage",
  "landscape",
  "electrical",
  "plumbing",
  "thermal_image",
  "blueprint",
  "overview_front",
  "overview_side",
  "overview_rear",
  "overview_aerial",
  "collateral_evidence",
  "measurement",
  "before_photo",
  "after_photo",
  "other",
] as const;

async function categorizePhotoWithAI(
  imageUrl: string,
  claimType: string
): Promise<{
  category: string;
  subCategory?: string;
  caption: string;
  hasDamage: boolean;
  severity: string;
  confidence: number;
}> {
  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert property inspector photo organizer. Analyze the photo and categorize it.

Return JSON with these fields:
- category: one of [${PHOTO_CATEGORIES.join(", ")}]
- subCategory: optional more specific label (e.g., "north_slope", "kitchen", "master_bathroom")
- caption: brief 1-sentence description of what the photo shows
- hasDamage: boolean - whether visible damage is present
- severity: "none" | "minor" | "moderate" | "severe" | "catastrophic"
- confidence: 0.0-1.0 how confident you are in the categorization

Context: This is a ${claimType} claim inspection photo.`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "low" },
            },
            {
              type: "text",
              text: "Categorize this inspection photo. Return JSON only.",
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    const parsed = JSON.parse(content);
    return {
      category: parsed.category || "other",
      subCategory: parsed.subCategory,
      caption: parsed.caption || "Inspection photo",
      hasDamage: parsed.hasDamage ?? false,
      severity: parsed.severity || "none",
      confidence: parsed.confidence ?? 0.5,
    };
  } catch (err) {
    logger.warn("[PHOTO_ORGANIZER] AI categorization failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      category: "other",
      caption: "Uncategorized inspection photo",
      hasDamage: false,
      severity: "none",
      confidence: 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOLDER STRUCTURE MAPPING
// ─────────────────────────────────────────────────────────────────────────────

function getSuggestedFolder(category: string, subCategory?: string): string {
  const folderMap: Record<string, string> = {
    roof_overview: "01-Roof/Overview",
    roof_closeup: "01-Roof/Close-ups",
    roof_damage: "01-Roof/Damage",
    siding_front: "02-Siding/Front",
    siding_side: "02-Siding/Side",
    siding_rear: "02-Siding/Rear",
    siding_damage: "02-Siding/Damage",
    gutter_overview: "03-Gutters/Overview",
    gutter_damage: "03-Gutters/Damage",
    downspout: "03-Gutters/Downspouts",
    window_exterior: "04-Windows/Exterior",
    window_interior: "04-Windows/Interior",
    window_damage: "04-Windows/Damage",
    door_exterior: "05-Doors/Exterior",
    door_interior: "05-Doors/Interior",
    door_damage: "05-Doors/Damage",
    hvac_unit: "06-HVAC/Units",
    hvac_damage: "06-HVAC/Damage",
    interior_room: "07-Interior/Rooms",
    interior_damage: "07-Interior/Damage",
    water_damage: "08-Water-Damage",
    mold: "08-Water-Damage/Mold",
    foundation: "09-Foundation",
    fence: "10-Exterior/Fence",
    deck: "10-Exterior/Deck",
    garage: "10-Exterior/Garage",
    landscape: "10-Exterior/Landscape",
    electrical: "11-Systems/Electrical",
    plumbing: "11-Systems/Plumbing",
    thermal_image: "12-Thermal-Imaging",
    blueprint: "13-Blueprints",
    overview_front: "00-Property-Overview/Front",
    overview_side: "00-Property-Overview/Side",
    overview_rear: "00-Property-Overview/Rear",
    overview_aerial: "00-Property-Overview/Aerial",
    collateral_evidence: "14-Collateral-Evidence",
    measurement: "15-Measurements",
    before_photo: "16-Before-After/Before",
    after_photo: "16-Before-After/After",
    other: "99-Uncategorized",
  };

  let folder = folderMap[category] || "99-Uncategorized";
  if (subCategory) {
    folder += `/${subCategory.replace(/\s+/g, "-")}`;
  }
  return folder;
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  const start = Date.now();

  try {
    const body = await req.json();
    const input = OrganizeInputSchema.parse(body);

    logger.info("[PHOTO_ORGANIZER] Starting batch organization", {
      orgId,
      photoCount: input.photos.length,
      claimType: input.claimType,
    });

    // Process photos in parallel (batches of 5 to avoid rate limits)
    const organized: OrganizedPhoto[] = [];
    const batchSize = 5;

    for (let i = 0; i < input.photos.length; i += batchSize) {
      const batch = input.photos.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (photo) => {
          // Run AI categorization
          const aiResult = await categorizePhotoWithAI(photo.url, input.claimType);

          // Map category to component type for YOLO
          const componentMap: Record<string, ComponentType> = {
            roof_overview: "roof",
            roof_closeup: "roof",
            roof_damage: "roof",
            siding_front: "siding",
            siding_side: "siding",
            siding_rear: "siding",
            siding_damage: "siding",
            gutter_overview: "gutter",
            gutter_damage: "gutter",
            downspout: "downspout",
            window_exterior: "window",
            window_interior: "window",
            window_damage: "window",
            door_exterior: "door",
            door_interior: "door",
            door_damage: "door",
            hvac_unit: "hvac",
            hvac_damage: "hvac",
            interior_room: "interior",
            interior_damage: "interior",
            water_damage: "water_damage",
            mold: "mold",
            foundation: "foundation",
            thermal_image: "thermal",
            blueprint: "blueprint",
          };

          const componentType = componentMap[aiResult.category] || "general";
          let detections: NormalizedDetection[] = [];

          // Only run YOLO if damage is suspected
          if (aiResult.hasDamage && componentType !== "general") {
            try {
              detections = await detectByComponent(
                photo.url,
                componentType,
                input.claimType as any,
                0.3
              );
            } catch {
              // YOLO failed, continue with AI results only
            }
          }

          const result: OrganizedPhoto = {
            id: photo.id,
            url: photo.url,
            filename: photo.filename,
            category: aiResult.category,
            subCategory: aiResult.subCategory,
            hasDamage: aiResult.hasDamage || detections.length > 0,
            severity: aiResult.severity as any,
            detectionCount: detections.length,
            caption: aiResult.caption,
            suggestedFolder: getSuggestedFolder(aiResult.category, aiResult.subCategory),
            detections: detections.slice(0, 10), // Cap per photo
            confidence: aiResult.confidence,
          };

          return result;
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          organized.push(result.value);
        }
      }
    }

    // Build summary statistics
    const summary = {
      totalPhotos: organized.length,
      withDamage: organized.filter((p) => p.hasDamage).length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      suggestedFolders: [...new Set(organized.map((p) => p.suggestedFolder))].sort(),
    };

    for (const photo of organized) {
      summary.byCategory[photo.category] = (summary.byCategory[photo.category] || 0) + 1;
      if (photo.severity) {
        summary.bySeverity[photo.severity] = (summary.bySeverity[photo.severity] || 0) + 1;
      }
    }

    logger.info("[PHOTO_ORGANIZER] Organization complete", {
      totalPhotos: organized.length,
      withDamage: summary.withDamage,
      processingTimeMs: Date.now() - start,
    });

    return NextResponse.json({
      ok: true,
      photos: organized,
      summary,
      meta: {
        processingTimeMs: Date.now() - start,
        claimType: input.claimType,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("[PHOTO_ORGANIZER] Fatal error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "Photo organization failed" }, { status: 500 });
  }
});
