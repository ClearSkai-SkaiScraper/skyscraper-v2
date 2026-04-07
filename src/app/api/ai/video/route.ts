export const dynamic = "force-dynamic";

/**
 * Video AI Endpoint
 *
 * POST /api/ai/video
 *
 * Specialized endpoint for video analysis tasks:
 * - Motion detection
 * - Scene classification
 * - Object tracking
 * - Temporal analysis
 */

import { withAuth } from "@/lib/auth/withAuth";
import { NextRequest, NextResponse } from "next/server";

import { AICoreRouter } from "@/lib/ai/router";
import { createAiConfig, withAiBilling } from "@/lib/ai/withAiBilling";
import { logger } from "@/lib/logger";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { validateAIRequest, videoSchema } from "@/lib/validation/aiSchemas";

async function POST_INNER(request: NextRequest, ctx: { userId: string; orgId: string | null }) {
  try {
    const { userId } = ctx;

    const identifier = getRateLimitIdentifier(userId, request);
    const allowed = await rateLimiters.ai.check(5, identifier);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = validateAIRequest(videoSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          details: validation.details,
        },
        { status: 400 }
      );
    }
    const { action, payload } = validation.data;

    // Route to appropriate video task
    const task = `video.${action}`;
    const result = await AICoreRouter(task, payload);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    logger.error("[Video AI] Error:", error);

    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/ai/video
 *
 * Returns available video AI capabilities
 */
export const GET = withAuth(async (_req, { userId }) => {
  try {
    return NextResponse.json({
      success: true,
      module: "video",
      capabilities: [
        "analyze - Full video analysis (motion, scenes, objects)",
        "detectMotion - Motion detection and tracking",
        "classifyScenes - Scene classification and segmentation",
        "trackObjects - Object tracking across frames",
        "extractKeyframes - Extract key frames from video",
        "generateSummary - Generate video summary and highlights",
      ],
      usage: {
        endpoint: "/api/ai/video",
        method: "POST",
        body: {
          action: "analyze | detectMotion | classifyScenes | ...",
          payload: { url: "video URL or file buffer" },
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
});

export const POST = withAiBilling(
  createAiConfig("video_analysis", { costPerRequest: 100, planRequired: "pro" }),
  POST_INNER
);
