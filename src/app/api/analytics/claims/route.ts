import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/analytics/claims — Claims performance analytics
 *
 * Returns: cycle time, close rate, claims by status, claims by month
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Parallel queries
    const [totalClaims, claimsByStatus, recentClaims, closedClaims30d, allClaimsForCycleTime] =
      await Promise.all([
        // Total claims
        prisma.claims.count({ where: { orgId } }),

        // Claims grouped by status
        prisma.claims.groupBy({
          by: ["status"],
          where: { orgId },
          _count: true,
        }),

        // Claims created in last 30 days
        prisma.claims.count({
          where: { orgId, createdAt: { gte: thirtyDaysAgo } },
        }),

        // Closed claims in last 30 days
        prisma.claims.count({
          where: {
            orgId,
            status: { in: ["closed", "settled", "completed"] },
            updatedAt: { gte: thirtyDaysAgo },
          },
        }),

        // Claims for cycle time calculation (last 90 days, closed)
        prisma.claims.findMany({
          where: {
            orgId,
            status: { in: ["closed", "settled", "completed"] },
            updatedAt: { gte: ninetyDaysAgo },
          },
          select: { createdAt: true, updatedAt: true },
        }),
      ]);

    // Calculate average cycle time (days from created to closed)
    let avgCycleTimeDays = 0;
    if (allClaimsForCycleTime.length > 0) {
      const totalMs = allClaimsForCycleTime.reduce((sum, c) => {
        return sum + (c.updatedAt.getTime() - c.createdAt.getTime());
      }, 0);
      avgCycleTimeDays = Math.round(totalMs / allClaimsForCycleTime.length / (1000 * 60 * 60 * 24));
    }

    // Close rate (30 day window)
    const closeRate = totalClaims > 0 ? Math.round((closedClaims30d / recentClaims) * 100) : 0;

    // Status breakdown
    const statusMap: Record<string, number> = {};
    for (const group of claimsByStatus) {
      statusMap[group.status || "unknown"] = group._count;
    }

    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          totalClaims,
          newClaims30d: recentClaims,
          closedClaims30d,
          closeRate,
          avgCycleTimeDays,
        },
        byStatus: statusMap,
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("[analytics/claims] Failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate claims analytics" },
      { status: 500 }
    );
  }
}
