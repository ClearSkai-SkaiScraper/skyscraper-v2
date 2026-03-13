/**
 * ============================================================================
 * BLUEPRINT & SCOPE OF WORK ANALYZER API
 * ============================================================================
 *
 * Analyzes blueprints, floor plans, and scope of work documents to extract:
 * - Room measurements and dimensions
 * - Door and window counts/types
 * - Material requirements
 * - Component identification
 * - Estimated material quantities
 *
 * Uses YOLO for element detection + GPT-4o for measurement extraction.
 *
 * @route POST /api/ai/blueprint/analyze
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOpenAI } from "@/lib/ai/client";
import { analyzeFloorPlan, type FloorPlanAnalysis } from "@/lib/ai/roboflow";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const BlueprintInputSchema = z.object({
  /** Image URL of the blueprint/floor plan */
  imageUrl: z.string().min(1),

  /** Type of document */
  documentType: z
    .enum(["blueprint", "floor_plan", "scope_of_work", "site_plan", "elevation"])
    .default("blueprint"),

  /** Specific trade context for better analysis */
  tradeContext: z
    .enum(["roofing", "siding", "windows", "doors", "hvac", "plumbing", "electrical", "general"])
    .optional()
    .default("general"),

  /** Optional claim ID */
  claimId: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface BlueprintAnalysis {
  /** Detected rooms with dimensions */
  rooms: {
    name: string;
    type: string;
    estimatedArea?: string;
    dimensions?: string;
    flooring?: string;
  }[];

  /** Detected doors */
  doors: {
    type: string;
    location: string;
    size?: string;
    count: number;
  }[];

  /** Detected windows */
  windows: {
    type: string;
    location: string;
    size?: string;
    count: number;
  }[];

  /** Detected HVAC elements */
  hvacElements: {
    type: string;
    location: string;
  }[];

  /** Overall property metrics */
  metrics: {
    totalRooms: number;
    totalDoors: number;
    totalWindows: number;
    estimatedSquareFootage?: number;
    stories?: number;
  };

  /** Material takeoff suggestions */
  materialTakeoff: {
    component: string;
    material: string;
    estimatedQuantity: string;
    unit: string;
    notes?: string;
  }[];

  /** Raw YOLO detections */
  rawDetections: FloorPlanAnalysis;

  /** AI narrative summary */
  summary: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GPT-4o BLUEPRINT ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

async function analyzeWithGPT4o(
  imageUrl: string,
  documentType: string,
  tradeContext: string
): Promise<Partial<BlueprintAnalysis>> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert construction estimator and blueprint reader. Analyze this ${documentType} image and extract all structural information.

${tradeContext !== "general" ? `Focus on ${tradeContext}-relevant details.` : ""}

Return a JSON object with:
{
  "rooms": [{ "name": "Living Room", "type": "living", "estimatedArea": "320 sq ft", "dimensions": "16x20", "flooring": "hardwood" }],
  "doors": [{ "type": "entry", "location": "front", "size": "36x80", "count": 1 }],
  "windows": [{ "type": "double-hung", "location": "north wall", "size": "36x48", "count": 2 }],
  "hvacElements": [{ "type": "return_air", "location": "hallway" }],
  "metrics": { "totalRooms": 8, "totalDoors": 12, "totalWindows": 15, "estimatedSquareFootage": 2400, "stories": 2 },
  "materialTakeoff": [{ "component": "Roofing", "material": "Architectural shingles", "estimatedQuantity": "24", "unit": "squares", "notes": "Based on estimated roof area" }],
  "summary": "2-story residential property approximately 2,400 sq ft..."
}

Be precise with measurements where visible. Estimate where exact measurements aren't clear.
Include IRC/IBC code references where relevant.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: imageUrl, detail: "high" },
          },
          {
            type: "text",
            text: `Analyze this ${documentType}. Extract all rooms, doors, windows, dimensions, and material requirements. Trade focus: ${tradeContext}.`,
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return {};

  try {
    return JSON.parse(content);
  } catch {
    return { summary: content };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  const start = Date.now();

  try {
    const body = await req.json();
    const input = BlueprintInputSchema.parse(body);

    logger.info("[BLUEPRINT_ANALYZER] Starting analysis", {
      orgId,
      documentType: input.documentType,
      tradeContext: input.tradeContext,
    });

    // Run YOLO floor plan detection + GPT-4o analysis in parallel
    const [yoloResult, aiResult] = await Promise.allSettled([
      analyzeFloorPlan(input.imageUrl),
      analyzeWithGPT4o(input.imageUrl, input.documentType, input.tradeContext),
    ]);

    const rawDetections: FloorPlanAnalysis =
      yoloResult.status === "fulfilled"
        ? yoloResult.value
        : {
            rooms: [],
            doors: [],
            windows: [],
            walls: [],
            stairs: [],
            fixtures: [],
            rawDetections: [],
          };

    const aiAnalysis = aiResult.status === "fulfilled" ? aiResult.value : {};

    // Merge YOLO counts with AI analysis
    const result: BlueprintAnalysis = {
      rooms: aiAnalysis.rooms || [],
      doors: aiAnalysis.doors || [],
      windows: aiAnalysis.windows || [],
      hvacElements: aiAnalysis.hvacElements || [],
      metrics: {
        totalRooms: aiAnalysis.metrics?.totalRooms || rawDetections.rooms.length || 0,
        totalDoors:
          aiAnalysis.metrics?.totalDoors ||
          rawDetections.doors.length ||
          (aiAnalysis.doors || []).reduce((sum: number, d: any) => sum + (d.count || 1), 0),
        totalWindows:
          aiAnalysis.metrics?.totalWindows ||
          rawDetections.windows.length ||
          (aiAnalysis.windows || []).reduce((sum: number, w: any) => sum + (w.count || 1), 0),
        estimatedSquareFootage: aiAnalysis.metrics?.estimatedSquareFootage,
        stories: aiAnalysis.metrics?.stories,
      },
      materialTakeoff: aiAnalysis.materialTakeoff || [],
      rawDetections,
      summary:
        aiAnalysis.summary ||
        `Blueprint analysis detected ${rawDetections.rooms.length} rooms, ${rawDetections.doors.length} doors, and ${rawDetections.windows.length} windows.`,
    };

    logger.info("[BLUEPRINT_ANALYZER] Analysis complete", {
      rooms: result.metrics.totalRooms,
      doors: result.metrics.totalDoors,
      windows: result.metrics.totalWindows,
      processingTimeMs: Date.now() - start,
    });

    return NextResponse.json({
      ok: true,
      analysis: result,
      meta: {
        processingTimeMs: Date.now() - start,
        documentType: input.documentType,
        tradeContext: input.tradeContext,
        yoloDetections: rawDetections.rawDetections.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("[BLUEPRINT_ANALYZER] Fatal error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "Blueprint analysis failed" }, { status: 500 });
  }
});
