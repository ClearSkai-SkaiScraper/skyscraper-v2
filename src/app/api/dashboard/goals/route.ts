/**
 * Dashboard Goals API
 * Returns goal tracking data for pro dashboard
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (_req, { orgId }) => {
  try {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Fetch weekly stats
    const [claimsClosed, revenue, inspections, leads] = await Promise.all([
      // Claims closed this week (exclude archived)
      prisma.claims.count({
        where: {
          orgId,
          archivedAt: null,
          status: "completed",
          updatedAt: { gte: weekStart },
        },
      }),
      // Revenue this week (exclude archived)
      prisma.claims.aggregate({
        where: {
          orgId,
          archivedAt: null,
          status: { in: ["approved", "completed"] },
          updatedAt: { gte: weekStart },
        },
        _sum: {
          approvedValue: true,
        },
      }),
      // Inspections completed
      prisma.tasks.count({
        where: {
          orgId,
          title: { contains: "Inspection" },
          status: "DONE",
          updatedAt: { gte: weekStart },
        },
      }),
      // Leads generated (exclude archived)
      prisma.leads.count({
        where: {
          orgId,
          archivedAt: null,
          createdAt: { gte: weekStart },
        },
      }),
    ]);

    // Calculate streak (simplified - count consecutive weeks with goals met)
    // In production, store this in user preferences or a separate table
    const streak = 5; // Placeholder

    const goals = [
      {
        id: "claims",
        label: "Claims Closed",
        current: claimsClosed,
        target: 20,
        unit: "claims",
        period: "weekly",
        color: "blue",
      },
      {
        id: "revenue",
        label: "Revenue",
        current: Number(revenue._sum.approvedValue || 0),
        target: 75000 * 100, // $75K in cents
        unit: "dollars",
        period: "weekly",
        color: "green",
      },
      {
        id: "inspections",
        label: "Inspections",
        current: inspections,
        target: 15,
        unit: "inspections",
        period: "weekly",
        color: "purple",
      },
      {
        id: "leads",
        label: "Leads Generated",
        current: leads,
        target: 50,
        unit: "leads",
        period: "weekly",
        color: "amber",
      },
    ];

    return NextResponse.json({ goals, streak });
  } catch (error) {
    logger.error("[DASHBOARD_GOALS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
});
