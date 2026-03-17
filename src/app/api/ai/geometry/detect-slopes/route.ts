export const dynamic = "force-dynamic";
/**
 * PHASE 37: Geometry Detection API Endpoints
 *
 * Automated slope detection and roof plane segmentation for carrier-grade reporting.
 * Analyzes property images to identify roof planes, slopes, orientations, and conditions.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  detectSlopes,
  generateSlopeScorecard,
  type RoofPlane,
  segmentDamagesByPlane,
  type SlopeScorecard,
} from "@/lib/ai/geometry";
import { type AiBillingContext,createAiConfig, withAiBilling } from "@/lib/ai/withAiBilling";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

const detectSlopesSchema = z.object({
  imageUrl: z.string().url("Valid image URL required"),
  claimId: z.string().optional(),
  damages: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        severity: z.enum(["none", "minor", "moderate", "severe"]),
        confidence: z.number().min(0).max(1),
        boundingBox: z.object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
        }),
      })
    )
    .optional(),
});

async function POST_INNER(req: NextRequest, ctx: AiBillingContext) {
  try {
    const { userId, orgId } = ctx;

    if (!orgId) {
      return NextResponse.json({ error: "Organization required" }, { status: 401 });
    }

    // Rate limit: AI tier
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validation = detectSlopesSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { imageUrl, claimId, damages } = validation.data;

    logger.info("[Geometry API] Detecting slopes", {
      orgId,
      claimId,
      hasDamages: !!damages?.length,
    });

    // Perform slope detection
    const slopeAnalysis = await detectSlopes(imageUrl, orgId, { claimId });

    // If damages provided, segment by plane and generate scorecards
    let planesWithDamages: RoofPlane[] = slopeAnalysis.planes;
    let scorecards: SlopeScorecard[] = [];

    if (damages && damages.length > 0) {
      // Map damages to the format expected by geometry functions (DamageRegion)
      const mappedDamages = damages.map((d) => ({
        id: d.id,
        type: d.type,
        severity: d.severity,
        confidence: d.confidence,
        boundingBox: d.boundingBox,
        description: `${d.type} damage detected`,
        repairPriority:
          d.severity === "severe"
            ? ("urgent" as const)
            : d.severity === "moderate"
              ? ("high" as const)
              : d.severity === "minor"
                ? ("medium" as const)
                : ("low" as const),
      }));

      planesWithDamages = segmentDamagesByPlane(slopeAnalysis.planes, mappedDamages);
      scorecards = planesWithDamages.map((plane) => generateSlopeScorecard(plane, mappedDamages));
    }

    logger.info("[Geometry API] Slope detection complete", {
      orgId,
      claimId,
      planesDetected: planesWithDamages.length,
      totalArea: slopeAnalysis.totalArea,
      averageSlope: slopeAnalysis.averageSlope,
    });

    return NextResponse.json({
      success: true,
      slopeAnalysis: {
        ...slopeAnalysis,
        planes: planesWithDamages,
      },
      scorecards,
      summary: {
        totalPlanes: planesWithDamages.length,
        totalArea: slopeAnalysis.totalArea,
        averageSlope: slopeAnalysis.averageSlope,
        complexity: slopeAnalysis.complexityRating,
        safetyNotes: slopeAnalysis.safetyNotes,
      },
    });
  } catch (error) {
    logger.error("[Geometry API] Error:", error);
    return NextResponse.json(
      {
        error: "Slope analysis failed",
      },
      { status: 500 }
    );
  }
}

export const POST = withAiBilling(
  createAiConfig("slope_detection", { costPerRequest: 25 }),
  POST_INNER
);
