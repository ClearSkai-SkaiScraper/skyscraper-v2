/**
 * Photo AI Analysis API
 * POST /api/photos/analyze
 *
 * PIPELINE (v2 — Roboflow-first):
 * 1. Roboflow YOLO  → precise bounding boxes (95%+ accuracy)
 * 2. GPT-4o-mini    → semantic analysis (captions, severity, recommendations)
 * 3. If Roboflow is unavailable or returns 0 detections, GPT-4 still runs
 *    so we always return a valid analysis.
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { analyzeImage } from "@/lib/ai/openai-vision";
import {
  detectDamageWithYOLO,
  isRoboflowConfigured,
  type NormalizedDetection,
} from "@/lib/ai/roboflow";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // AI analysis can take a while

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(userId, "UPLOAD");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { imageUrl, context, componentType } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1 — ROBOFLOW YOLO (first choice for bounding boxes)
    // ═══════════════════════════════════════════════════════════════════════
    let yoloDetections: NormalizedDetection[] = [];
    let detectionSource: "roboflow_yolo" | "gpt4" | "none" = "none";

    if (isRoboflowConfigured()) {
      const startMs = Date.now();
      try {
        // Pick the best model based on component context
        const modelType = resolveModelType(componentType, context);
        yoloDetections = await detectDamageWithYOLO(imageUrl, modelType, 0.35);

        logger.info("[photos/analyze] YOLO detection complete", {
          detections: yoloDetections.length,
          modelType,
          elapsedMs: Date.now() - startMs,
        });

        if (yoloDetections.length > 0) {
          detectionSource = "roboflow_yolo";
        }
      } catch (yoloErr) {
        logger.warn("[photos/analyze] YOLO detection failed, falling back to GPT-4", {
          error: yoloErr instanceof Error ? yoloErr.message : String(yoloErr),
        });
      }
    } else {
      logger.info("[photos/analyze] Roboflow not configured — GPT-4 only mode");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2 — GPT-4o-mini semantic analysis (always runs)
    // ═══════════════════════════════════════════════════════════════════════
    const report = await analyzeImage(imageUrl, {
      context: context || "",
      model: "gpt-4o-mini",
    });

    const severity = report.overall_severity || "none";
    const confidence = report.overall_confidence || 0;

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3 — Build damageBoxes from YOLO detections (if any)
    // ═══════════════════════════════════════════════════════════════════════
    const damageBoxes = yoloDetections.map((det) => ({
      x: det.x,
      y: det.y,
      w: det.width,
      h: det.height,
      label: det.type.replace(/_/g, " "),
      score: det.confidence,
      severity: det.severity,
      sourceModel: "roboflow_yolo" as const,
    }));

    // Build AICaption from GPT-4 report
    const firstItem = report.items[0];
    const aiCaption = {
      materialType: firstItem?.component
        ? `${firstItem.component.replace(/_/g, " ")} — ${firstItem.type} damage`
        : "Unknown Material",
      damageType: report.items
        .map((i) => i.type)
        .filter((v, idx, a) => a.indexOf(v) === idx)
        .join(", "),
      functionalImpact: firstItem?.indicators?.join("; ") || "See full analysis for details",
      applicableCode: firstItem?.notes || "",
      dolTieIn: report.photo_quality_notes || "",
      summary: report.summary,
    };

    return NextResponse.json({
      success: true,
      severity,
      confidence,
      aiCaption,
      damageBoxes,
      detectionSource,
      yoloDetectionCount: yoloDetections.length,
      recommendations: report.recommendations || [],
      itemCount: report.items.length,
    });
  } catch (error: unknown) {
    logger.error("[photos/analyze] Error:", error);

    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        { error: "AI service not configured — OPENAI_API_KEY missing" },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Map UI component type / context hints to the best YOLO model key */
function resolveModelType(componentType?: string, context?: string): string {
  if (componentType) {
    const ct = componentType.toLowerCase();
    if (ct.includes("hail")) return "roof_hail";
    if (ct.includes("wind")) return "roof_wind";
    if (ct.includes("shingle")) return "roof_shingle";
    if (ct.includes("siding")) return "siding_damage";
    if (ct.includes("gutter")) return "gutter_damage";
    if (ct.includes("window")) return "window";
    if (ct.includes("door")) return "door";
    if (ct.includes("hvac") || ct.includes("ac")) return "hvac_rooftop";
    if (ct.includes("crack") || ct.includes("foundation")) return "crack_wall";
    if (ct.includes("water")) return "water_damage";
    if (ct.includes("roof")) return "roof_damage";
  }

  // Try to infer from free-text context
  if (context) {
    const lc = context.toLowerCase();
    if (lc.includes("hail")) return "roof_hail";
    if (lc.includes("wind")) return "roof_wind";
    if (lc.includes("shingle")) return "roof_shingle";
    if (lc.includes("gutter")) return "gutter_damage";
    if (lc.includes("siding")) return "siding_damage";
  }

  return "roof_damage"; // sensible default — most claims are roofing
}
