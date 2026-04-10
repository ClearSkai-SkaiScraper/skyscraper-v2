/**
 * YOLO Debug Endpoint
 * POST /api/ai/debug/yolo
 *
 * Tests Roboflow YOLO detection directly — useful for verifying
 * that env vars are set, the API key works, and models return results.
 *
 * Accepts: { imageUrl, modelType?, componentType?, claimType?, confidence? }
 * Returns: raw YOLO detections + timing + config status
 */

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import {
  type ComponentType,
  detectByComponent,
  detectDamageWithYOLO,
  isRoboflowConfigured,
  type NormalizedDetection,
} from "@/lib/ai/roboflow";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      imageUrl,
      modelType = "roof_damage",
      componentType,
      claimType = "general",
      confidence = 0.35,
    } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // ── Config status ──────────────────────────────────────────────────────
    const config = {
      roboflowConfigured: isRoboflowConfigured(),
      // eslint-disable-next-line no-restricted-syntax
      apiKeySet: !!process.env.ROBOFLOW_API_KEY,
      // eslint-disable-next-line no-restricted-syntax
      apiKeyPrefix: process.env.ROBOFLOW_API_KEY
        // eslint-disable-next-line no-restricted-syntax
        ? `${process.env.ROBOFLOW_API_KEY.slice(0, 4)}...`
        : null,
      // eslint-disable-next-line no-restricted-syntax
      roofModel: process.env.ROBOFLOW_ROOF_MODEL || "roof-damage-detection/3 (default)",
      // eslint-disable-next-line no-restricted-syntax
      hailModel: process.env.ROBOFLOW_HAIL_MODEL || "roof-hail-damage/3 (default)",
      // eslint-disable-next-line no-restricted-syntax
      windModel: process.env.ROBOFLOW_WIND_MODEL || "roof-wind-damage/5 (default)",
      // eslint-disable-next-line no-restricted-syntax
      shingleModel: process.env.ROBOFLOW_SHINGLE_MODEL || "roof-damage/1 (default)",
      // eslint-disable-next-line no-restricted-syntax
      useLocalInference: process.env.USE_LOCAL_INFERENCE !== "false",
      // eslint-disable-next-line no-restricted-syntax
      inferenceUrl: process.env.ROBOFLOW_INFERENCE_URL || "http://localhost:9001",
      // eslint-disable-next-line no-restricted-syntax
      demoMode: process.env.ROBOFLOW_DEMO_MODE === "true",
    };

    if (!config.roboflowConfigured) {
      return NextResponse.json(
        {
          success: false,
          error: "Roboflow is not configured. Set ROBOFLOW_API_KEY env var.",
          config,
        },
        { status: 503 }
      );
    }

    // ── Run detection ──────────────────────────────────────────────────────
    let detections: NormalizedDetection[] = [];
    const startMs = Date.now();
    let method: string;

    if (componentType) {
      method = `detectByComponent(${componentType}, ${claimType})`;
      detections = await detectByComponent(
        imageUrl,
        componentType as ComponentType,
        claimType,
        confidence
      );
    } else {
      method = `detectDamageWithYOLO(${modelType})`;
      detections = await detectDamageWithYOLO(imageUrl, modelType, confidence);
    }

    const elapsedMs = Date.now() - startMs;

    logger.info("[DEBUG_YOLO] Detection complete", {
      method,
      detections: detections.length,
      elapsedMs,
    });

    // ── Summary stats ──────────────────────────────────────────────────────
    const severityCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    for (const d of detections) {
      severityCounts[d.severity] = (severityCounts[d.severity] || 0) + 1;
      typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      config,
      method,
      elapsedMs,
      detectionCount: detections.length,
      severityCounts,
      typeCounts,
      detections: detections.map((d) => ({
        type: d.type,
        originalClass: d.originalClass,
        confidence: Math.round(d.confidence * 100) / 100,
        severity: d.severity,
        boundingBox: {
          x: Math.round(d.x * 100) / 100,
          y: Math.round(d.y * 100) / 100,
          width: Math.round(d.width * 100) / 100,
          height: Math.round(d.height * 100) / 100,
        },
      })),
    });
  } catch (error) {
    logger.error("[DEBUG_YOLO] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/debug/yolo — quick config check (no image required)
 */
export async function GET() {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    roboflowConfigured: isRoboflowConfigured(),
    // eslint-disable-next-line no-restricted-syntax
    apiKeySet: !!process.env.ROBOFLOW_API_KEY,
    // eslint-disable-next-line no-restricted-syntax
    apiKeyPrefix: process.env.ROBOFLOW_API_KEY
      // eslint-disable-next-line no-restricted-syntax
      ? `${process.env.ROBOFLOW_API_KEY.slice(0, 4)}...`
      : null,
    // eslint-disable-next-line no-restricted-syntax
    roofModel: process.env.ROBOFLOW_ROOF_MODEL || "roof-damage-detection/3 (default)",
    // eslint-disable-next-line no-restricted-syntax
    hailModel: process.env.ROBOFLOW_HAIL_MODEL || "roof-hail-damage/3 (default)",
    // eslint-disable-next-line no-restricted-syntax
    windModel: process.env.ROBOFLOW_WIND_MODEL || "roof-wind-damage/5 (default)",
    // eslint-disable-next-line no-restricted-syntax
    shingleModel: process.env.ROBOFLOW_SHINGLE_MODEL || "roof-damage/1 (default)",
    // eslint-disable-next-line no-restricted-syntax
    useLocalInference: process.env.USE_LOCAL_INFERENCE !== "false",
    // eslint-disable-next-line no-restricted-syntax
    inferenceUrl: process.env.ROBOFLOW_INFERENCE_URL || "http://localhost:9001",
    // eslint-disable-next-line no-restricted-syntax
    demoMode: process.env.ROBOFLOW_DEMO_MODE === "true",
    availableModels: [
      "roof_damage",
      "roof_hail",
      "roof_wind",
      "roof_shingle",
      "soft_metal_damage",
      "gutter_damage",
      "crack_wall",
      "crack_concrete",
      "window",
      "door",
      "hvac_rooftop",
      "water_damage",
      "mold",
      "siding_damage",
      "general_damage",
    ],
    availableComponents: [
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
      "general",
    ],
  });
}
