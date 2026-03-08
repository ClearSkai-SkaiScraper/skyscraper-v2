/**
 * PHASE 37: Geometry Detection API Endpoints
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { createAiConfig, withAiBilling, type AiBillingContext } from "@/lib/ai/withAiBilling";
import { checkRateLimit } from "@/lib/rate-limit";

// PHASE 2: Geometry Detection System
// Planned features:
// - 3D roof slope analysis using CV models
// - Damage segmentation by roof plane
// - Automated slope scorecard generation
// - Integration with photo analysis pipeline
// Implementation: Create @/lib/ai/geometry module with detectSlopes, generateSlopeScorecard, segmentDamagesByPlane
// import { detectSlopes, generateSlopeScorecard, segmentDamagesByPlane } from "@/lib/ai/geometry";

async function POST_INNER(req: NextRequest, ctx: AiBillingContext) {
  try {
    const { userId, orgId } = ctx;

    // Rate limit: AI tier
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests." },
        { status: 429 }
      );
    }

    // Phase 2 Feature: Not yet implemented
    // See roadmap comment at top of file for planned implementation
    return NextResponse.json(
      { error: "Geometry detection scheduled for Phase 2", phase: 2 },
      { status: 501 }
    );

    // Future implementation (Phase 2):
    // const body = await req.json();
    // const { imageUrl, claimId, damages } = body;
    // if (!imageUrl) {
    //   return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    // }
    // const slopeAnalysis = await detectSlopes(imageUrl, orgId, { claimId });
    // let planesWithDamages = slopeAnalysis.planes;
    // let scorecards = [];
    // if (damages && damages.length > 0) {
    //   planesWithDamages = segmentDamagesByPlane(slopeAnalysis.planes, damages);
    //   scorecards = planesWithDamages.map((plane) => generateSlopeScorecard(plane, damages));
    // }
    // return NextResponse.json({
    //   success: true,
    //   slopeAnalysis: { ...slopeAnalysis, planes: planesWithDamages },
    //   scorecards,
    // });
  } catch (error) {
    logger.error("[Geometry API] Error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

export const POST = withAiBilling(
  createAiConfig("slope_detection", { costPerRequest: 25 }),
  POST_INNER
);
