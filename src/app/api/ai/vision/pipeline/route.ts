/**
 * ============================================================================
 * UNIFIED VISION PIPELINE API
 * ============================================================================
 *
 * Single entry point for ALL photo analysis — consolidates 6 fragmented routes.
 *
 * Pipeline stages:
 * 1. YOLO Detection (Roboflow) — precise bounding boxes
 * 2. GPT-4o Classification — rich damage descriptions + IRC codes
 * 3. Auto-categorization — sorts into component types
 * 4. Report-ready output — structured for PDF/report generation
 *
 * Replaces:
 * - /api/ai/analyze-photo
 * - /api/ai/vision/analyze
 * - /api/photos/analyze
 * - /api/ai/analyze-damage
 * - /api/ai/damage/analyze
 *
 * @route POST /api/ai/vision/pipeline
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { analyzeImage } from "@/lib/ai/openai-vision";
import { type ComponentType, detectByComponent, type NormalizedDetection } from "@/lib/ai/roboflow";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const PipelineInputSchema = z.object({
  /** Image URL or base64 data URI */
  imageUrl: z.string().min(1, "Image URL is required"),

  /** Analysis mode */
  mode: z.enum(["quick", "standard", "comprehensive", "blueprint"]).default("standard"),

  /** Component type for targeted detection */
  componentType: z
    .enum([
      "roof",
      "siding",
      "stucco",
      "gutter",
      "hvac",
      "window",
      "screen",
      "fence",
      "deck",
      "soffit_fascia",
      "chimney",
      "skylight",
      "door",
      "wall",
      "floor",
      "ceiling",
      "interior",
      "foundation",
      "blueprint",
      "floor_plan",
      "mailbox",
      "electrical_box",
      "outdoor_furniture",
      "awning",
      "garage_door",
      "downspout",
      "paint",
      "thermal",
      "water_damage",
      "mold",
      "general",
    ])
    .optional()
    .default("general"),

  /** Claim type context for better model selection */
  claimType: z
    .enum(["hail", "wind", "water", "fire", "storm", "general"])
    .optional()
    .default("general"),

  /** Optional claim ID to associate results */
  claimId: z.string().optional(),

  /** Minimum confidence threshold */
  confidence: z.number().min(0.1).max(1.0).optional().default(0.35),

  /** Whether to include GPT-4o analysis (slower but richer) */
  includeAiAnalysis: z.boolean().optional().default(true),

  /** Whether to save results to DB */
  persist: z.boolean().optional().default(false),
});

type PipelineInput = z.infer<typeof PipelineInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface PipelineResult {
  /** Detection results from YOLO models */
  detections: NormalizedDetection[];

  /** AI-powered analysis summary */
  aiAnalysis?: {
    overallSeverity: string;
    damageTypes: string[];
    description: string;
    recommendations: string[];
    ircCodes?: string[];
    estimatedRepairCost?: { min: number; max: number };
  };

  /** Auto-categorized damage by component */
  categorized: Record<string, NormalizedDetection[]>;

  /** Pipeline metadata */
  meta: {
    mode: string;
    componentType: string;
    claimType: string;
    modelsUsed: number;
    totalDetections: number;
    processingTimeMs: number;
    yoloEnabled: boolean;
    aiEnabled: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  const start = Date.now();

  try {
    const body = await req.json();
    const input = PipelineInputSchema.parse(body);

    logger.info("[VISION_PIPELINE] Starting analysis", {
      orgId,
      userId,
      mode: input.mode,
      componentType: input.componentType,
      claimType: input.claimType,
      claimId: input.claimId,
    });

    // ─── Stage 1: YOLO Detection ───────────────────────────────────────────
    let detections: NormalizedDetection[] = [];
    let yoloEnabled = false;

    if (input.mode !== "quick") {
      try {
        detections = await detectByComponent(
          input.imageUrl,
          input.componentType as ComponentType,
          input.claimType as any,
          input.confidence
        );
        yoloEnabled = detections.length > 0;
        logger.info("[VISION_PIPELINE] YOLO complete", {
          detections: detections.length,
        });
      } catch (yoloErr) {
        logger.warn("[VISION_PIPELINE] YOLO detection failed, continuing with AI only", {
          error: yoloErr instanceof Error ? yoloErr.message : String(yoloErr),
        });
      }
    }

    // ─── Stage 2: GPT-4o Analysis ──────────────────────────────────────────
    let aiAnalysis: PipelineResult["aiAnalysis"] | undefined;

    if (input.includeAiAnalysis) {
      try {
        const aiResult = await analyzeImage(input.imageUrl, {
          context: `Analyze this ${input.componentType} photo for ${input.claimType} damage. Identify damage types, severity, and repair recommendations.`,
          model: "gpt-4o",
        });

        if (aiResult) {
          aiAnalysis = {
            overallSeverity: (aiResult as any).overallSeverity || "unknown",
            damageTypes:
              (aiResult as any).damageTypes || aiResult.items?.map((i: any) => i.type) || [],
            description: (aiResult as any).description || aiResult.summary || "",
            recommendations: (aiResult as any).recommendations || [],
            ircCodes: (aiResult as any).ircCodes || [],
            estimatedRepairCost: (aiResult as any).estimatedRepairCost,
          };
        }
      } catch (aiErr) {
        logger.warn("[VISION_PIPELINE] AI analysis failed", {
          error: aiErr instanceof Error ? aiErr.message : String(aiErr),
        });
      }
    }

    // ─── Stage 3: Categorize detections ────────────────────────────────────
    const categorized: Record<string, NormalizedDetection[]> = {};
    for (const det of detections) {
      const category = det.type || det.originalClass || "unknown";
      if (!categorized[category]) categorized[category] = [];
      categorized[category].push(det);
    }

    // ─── Stage 4: Persist results (optional) ───────────────────────────────
    if (input.persist && input.claimId) {
      try {
        await prisma.damage_assessments.create({
          data: {
            id: crypto.randomUUID(),
            claim_id: input.claimId,
            org_id: orgId,
            created_by_id: userId,
            summary: aiAnalysis?.description || `${detections.length} detections found`,
            primaryPeril: input.claimType !== "general" ? input.claimType : null,
            overall_recommendation: aiAnalysis?.recommendations?.join("; ") || null,
            confidence: detections.length > 0 ? detections[0].confidence : null,
            metadata: JSON.parse(
              JSON.stringify({
                detections: detections.slice(0, 50),
                aiAnalysis,
                mode: input.mode,
                componentType: input.componentType,
              })
            ),
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
        logger.info("[VISION_PIPELINE] Results persisted", {
          claimId: input.claimId,
        });
      } catch (persistErr) {
        logger.warn("[VISION_PIPELINE] Failed to persist results", {
          error: persistErr instanceof Error ? persistErr.message : String(persistErr),
        });
      }
    }

    // ─── Build response ────────────────────────────────────────────────────
    const result: PipelineResult = {
      detections,
      aiAnalysis,
      categorized,
      meta: {
        mode: input.mode,
        componentType: input.componentType,
        claimType: input.claimType,
        modelsUsed: Object.keys(categorized).length,
        totalDetections: detections.length,
        processingTimeMs: Date.now() - start,
        yoloEnabled,
        aiEnabled: !!aiAnalysis,
      },
    };

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid input",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error("[VISION_PIPELINE] Fatal error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "Vision pipeline failed" }, { status: 500 });
  }
});
