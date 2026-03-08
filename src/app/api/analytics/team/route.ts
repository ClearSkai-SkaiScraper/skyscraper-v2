export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/analytics/team — Team productivity analytics
 *
 * Returns: activities per user, task completion, response times
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Parallel queries
    const [activitiesByUser, weeklyActiveUsers, totalActivities30d, recentEvents] =
      await Promise.all([
        // Activity count per user (last 30 days)
        prisma.activities.groupBy({
          by: ["userId"],
          where: {
            orgId,
            createdAt: { gte: thirtyDaysAgo },
          },
          _count: true,
          orderBy: { _count: { userId: "desc" } },
          take: 20,
        }),

        // Weekly active users
        prisma.activities.groupBy({
          by: ["userId"],
          where: {
            orgId,
            createdAt: { gte: sevenDaysAgo },
          },
          _count: true,
        }),

        // Total activities last 30 days
        prisma.activities.count({
          where: {
            orgId,
            createdAt: { gte: thirtyDaysAgo },
          },
        }),

        // Recent event types (for feature usage)
        prisma.activities.groupBy({
          by: ["type"],
          where: {
            orgId,
            createdAt: { gte: thirtyDaysAgo },
          },
          _count: true,
          orderBy: { _count: { type: "desc" } },
          take: 15,
        }),
      ]);

    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          weeklyActiveUsers: weeklyActiveUsers.length,
          totalActivities30d,
          avgActivitiesPerUser:
            activitiesByUser.length > 0
              ? Math.round(totalActivities30d / activitiesByUser.length)
              : 0,
        },
        userActivity: activitiesByUser.map((u) => ({
          userId: u.userId,
          activityCount: u._count,
        })),
        topFeatures: recentEvents.map((e) => ({
          event: e.type,
          count: e._count,
        })),
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("[analytics/team] Failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to generate team analytics" },
      { status: 500 }
    );
  }
}
