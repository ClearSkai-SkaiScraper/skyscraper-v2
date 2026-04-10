export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logRecommendationEvent } from "@/lib/reports/recommendation-analytics";

/**
 * POST /api/reports/recommendation-analytics
 *
 * Receives recommendation analytics events from the client.
 * Logs them server-side for analysis and future ML training.
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    // Validate basic shape
    if (!body.eventType || typeof body.eventType !== "string") {
      return NextResponse.json({ ok: false, error: "Missing eventType" }, { status: 400 });
    }

    logRecommendationEvent(body);

    return NextResponse.json({ ok: true });
  } catch (_error) {
    return NextResponse.json({ ok: false, error: "Failed to log analytics" }, { status: 500 });
  }
});
