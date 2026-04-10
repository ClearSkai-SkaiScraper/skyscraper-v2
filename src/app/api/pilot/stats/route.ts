export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/pilot/stats — Aggregated pilot analytics
 * Returns activation rates, retention metrics, feature usage, feedback sentiment
 *
 * Session 9: Migrated from auth() → withAuth to get DB-backed orgId.
 * Previously used `orgId || undefined` which removed the tenant filter
 * entirely when orgId was null — cross-tenant data leak.
 */
const handleStats = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Parallel queries for efficiency — orgId is ALWAYS set (DB-backed via withAuth)
    const [totalFeedback, recentFeedback, weeklyActiveEvents, activationEvents, featureEvents] =
      await Promise.all([
        // Total feedback count
        prisma.activities.count({
          where: {
            orgId,
            type: { in: ["pilot_feedback", "feedback_submitted"] },
          },
        }),

        // Recent feedback with ratings
        prisma.activities.findMany({
          where: {
            orgId,
            type: { in: ["pilot_feedback", "feedback_submitted"] },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),

        // Weekly active events (logins, page views)
        prisma.activities.count({
          where: {
            orgId,
            createdAt: { gte: sevenDaysAgo },
          },
        }),

        // Activation milestone events
        prisma.activities.findMany({
          where: {
            orgId,
            type: { startsWith: "activation:" },
          },
        }),

        // Feature usage events (last 30 days)
        prisma.activities.groupBy({
          by: ["type"],
          where: {
            orgId,
            type: { startsWith: "feature:" },
            createdAt: { gte: thirtyDaysAgo },
          },
          _count: true,
          orderBy: { _count: { type: "desc" } },
          take: 10,
        }),
      ]);

    // Calculate feedback sentiment
    let ratingSum = 0;
    let ratingCount = 0;
    const feedbackByType: Record<string, number> = {};

    for (const item of recentFeedback) {
      const meta = item.metadata as Record<string, unknown> | null;
      const type = (meta?.type as string) || "other";
      feedbackByType[type] = (feedbackByType[type] || 0) + 1;

      if (meta?.rating != null && typeof meta.rating === "number") {
        ratingSum += meta.rating;
        ratingCount++;
      }
    }

    // Map activation milestones
    const completedMilestones = activationEvents.map((e) => e.type);
    const uniqueMilestones = [...new Set(completedMilestones)];

    // Build feature usage map
    const topFeatures = featureEvents.map((f) => ({
      feature: f.type.replace("feature:", ""),
      count: f._count,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        feedback: {
          total: totalFeedback,
          avgRating: ratingCount > 0 ? ratingSum / ratingCount : null,
          byType: feedbackByType,
        },
        activity: {
          weeklyEvents: weeklyActiveEvents,
        },
        activation: {
          milestones: uniqueMilestones,
          milestoneCount: uniqueMilestones.length,
          totalPossible: 9,
        },
        features: {
          topFeatures,
        },
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    logger.error("[PILOT_STATS_FAILED]", { error });
    return NextResponse.json(
      { ok: false, error: "Failed to generate pilot stats" },
      { status: 500 }
    );
  }
});

export const GET = handleStats;
