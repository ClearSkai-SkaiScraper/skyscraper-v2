export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { clerkClient } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { getAdminMetrics, getTokenUsageByUser } from "@/lib/metrics";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function GET(req: Request) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.userId || !ctx.orgId) {
      return NextResponse.json({ error: ctx.reason || "Unauthorized" }, { status: 401 });
    }
    const { userId, orgId } = ctx;

    // Verify admin role
    const clerkUser = await clerkClient().users.getUser(userId);
    const isAdmin = clerkUser.publicMetadata?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

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
}
