export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { getProductEventsSummary } from "@/lib/analytics/track";
import { requireApiAuth } from "@/lib/auth/apiAuth";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/ops/funnel-stats
 * Returns conversion funnel statistics for ops dashboard
 */
export async function GET() {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  const rl = await checkRateLimit(authResult.userId, "API");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const events = await getProductEventsSummary();

    return NextResponse.json({ events });
  } catch (error) {
    logger.error("[OPS_FUNNEL_STATS] Failed:", error);
    return NextResponse.json({ events: [] });
  }
}
