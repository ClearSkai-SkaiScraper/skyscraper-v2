export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { recommendTemplates } from "@/lib/reports/recommendation-engine";
import { RecommendationRequestSchema } from "@/lib/reports/recommendation-schema";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/reports/recommend-template
 *
 * AI-powered template recommendation.
 * Accepts context about the job (trade, damage, intent, available data)
 * and returns ranked template recommendations with scores and rationale.
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = RecommendationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = recommendTemplates(parsed.data);

    logger.info("[RECOMMEND_TEMPLATE]", {
      style: parsed.data.styleCategory ?? "all",
      trade: parsed.data.trade ?? "none",
      intent: parsed.data.intent ?? "none",
      topPick: result.topPick?.templateId ?? "none",
      totalConsidered: result.totalConsidered,
      processingMs: result.processingTimeMs,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error("[RECOMMEND_TEMPLATE] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
});
