export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * ClaimIQ™ Readiness Analytics API
 *
 * GET /api/claimiq/analytics
 *   ?limit=50  — max claims to analyze (default 50)
 *
 * Returns org-wide readiness analytics:
 *   - Score distribution
 *   - Most missing fields
 *   - Most blocked sections
 *   - Autopilot opportunity
 */

import { logger } from "@/lib/logger";
import { NextResponse, type NextRequest } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { computeReadinessAnalytics } from "@/lib/claimiq/analytics";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const analytics = await computeReadinessAnalytics(orgId, Math.min(limit, 100));

    return NextResponse.json({
      success: true,
      ...analytics,
    });
  } catch (err) {
    logger.error("[ANALYTICS_API_ERROR]", err);
    return NextResponse.json(
      { success: false, error: "Failed to compute analytics" },
      { status: 500 }
    );
  }
}
