export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ============================================================================
// API: GET AI USAGE SUMMARY
// ============================================================================
// GET /api/ai/usage
// Token system removed — returns unlimited for all buckets.

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { createAiConfig, withAiBilling, type AiBillingContext } from "@/lib/ai/withAiBilling";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";

async function GET_INNER(req: NextRequest, ctx: AiBillingContext) {
  try {
    const identifier = getRateLimitIdentifier(ctx.userId, req);
    const allowed = await rateLimiters.ai.check(20, identifier);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    // Token system removed — all features included in flat monthly plan
    return NextResponse.json({
      mockup: { used: 0, limit: 999999, remaining: 999999 },
      dol: { used: 0, limit: 999999, remaining: 999999 },
      weather: { used: 0, limit: 999999, remaining: 999999 },
    });
  } catch (error) {
    logger.error("[AI Usage API]", error);
    return NextResponse.json({ error: "Failed to get usage" }, { status: 500 });
  }
}

export const GET = withAiBilling(createAiConfig("ai_usage", { costPerRequest: 0 }), GET_INNER);
