export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { withAdmin } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { getAdminMetrics, getTokenUsageByUser } from "@/lib/metrics";

export const GET = withAdmin(async (req: NextRequest, { orgId }) => {
  try {
    // Get days parameter from query
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30", 10);

    // Fetch metrics
    const metrics = await getAdminMetrics(orgId, days);
    const userUsage = await getTokenUsageByUser(orgId, days);

    return NextResponse.json({
      metrics,
      userUsage,
    });
  } catch (error) {
    logger.error("Admin metrics error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch metrics",
      },
      { status: 500 }
    );
  }
});
