/**
 * Dashboard Briefing API
 * Returns AI-powered daily briefing data for pro dashboard
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface BriefingItem {
  type: "urgent" | "followup" | "opportunity" | "milestone";
  title: string;
  description: string;
  link: string;
  linkText: string;
}

export const GET = withAuth(async (_req, { orgId }) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    // Fetch various stats in parallel
    const [
      newLeadsCount,
      claimsNeedingReview,
      todayInspections,
      pendingApprovals,
      weeklyRevenue,
      recentStorms,
    ] = await Promise.all([
      // New leads this week
      prisma.leads.count({
        where: {
          orgId,
          createdAt: { gte: weekStart },
        },
      }),
      // Claims needing action
      prisma.claims.count({
        where: {
          orgId,
          status: { in: ["needs_review", "pending_response"] },
        },
      }),
      // Today's inspections
      prisma.tasks.count({
        where: {
          orgId,
          title: { contains: "Inspection" },
          dueAt: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Pending approvals
      prisma.claims.count({
        where: {
          orgId,
          jobValueStatus: "submitted",
        },
      }),
      // Weekly revenue (sum of approved claims)
      prisma.claims.aggregate({
        where: {
          orgId,
          status: "approved",
          updatedAt: { gte: weekStart },
        },
        _sum: {
          approvedValue: true,
        },
      }),
      // Recent storm activity (using snake_case model name from Prisma)
      prisma.storm_events.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Build briefing items based on data
    const items: BriefingItem[] = [];

    if (claimsNeedingReview > 0) {
      items.push({
        type: "urgent",
        title: `${claimsNeedingReview} claims need attention`,
        description: "Insurance responses received that require your review",
        link: "/claims?filter=needs_action",
        linkText: "Review Claims",
      });
    }

    if (todayInspections > 0) {
      items.push({
        type: "followup",
        title: `${todayInspections} inspection${todayInspections > 1 ? "s" : ""} scheduled today`,
        description: "Check your calendar for times and addresses",
        link: "/appointments",
        linkText: "View Schedule",
      });
    }

    if (recentStorms > 0) {
      items.push({
        type: "opportunity",
        title: "New storm activity detected",
        description: `${recentStorms} storm event${recentStorms > 1 ? "s" : ""} reported in your area`,
        link: "/storm-leads",
        linkText: "View Storm Map",
      });
    }

    if (pendingApprovals > 0) {
      items.push({
        type: "followup",
        title: `${pendingApprovals} scope${pendingApprovals > 1 ? "s" : ""} awaiting approval`,
        description: "Job values submitted and waiting for manager review",
        link: "/claims?filter=pending_approval",
        linkText: "View Pending",
      });
    }

    // Add a milestone item
    const weeklyGoal = 75000 * 100; // $75K in cents
    const currentRevenue = Number(weeklyRevenue._sum.approvedValue || 0);
    const progress = Math.round((currentRevenue / weeklyGoal) * 100);

    items.push({
      type: "milestone",
      title: `Weekly goal: ${progress}% complete`,
      description:
        progress >= 100
          ? "Congratulations! You've hit your weekly target!"
          : `$${((weeklyGoal - currentRevenue) / 100).toLocaleString()} more to reach your goal`,
      link: "/leaderboard",
      linkText: "View Progress",
    });

    const stats = {
      newLeads: newLeadsCount,
      claimsToReview: claimsNeedingReview,
      scheduledInspections: todayInspections,
      pendingApprovals,
      revenueThisWeek: currentRevenue,
      revenueGoal: weeklyGoal,
    };

    return NextResponse.json({ items, stats });
  } catch (error) {
    logger.error("[DASHBOARD_BRIEFING] Error:", error);
    return NextResponse.json({ error: "Failed to generate briefing" }, { status: 500 });
  }
});
