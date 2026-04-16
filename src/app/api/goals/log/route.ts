import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_CATEGORIES = [
  "doors_knocked",
  "claims_signed",
  "revenue",
  "jobs_posted",
  "leads_generated",
  "repairs_landed",
] as const;

const logSchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  value: z.number().min(0),
});

/**
 * POST /api/goals/log — Log manual progress toward a goal.
 * Increments the user's team_performance record for the current period.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = logSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { category, value } = parsed.data;
    if (value === 0) {
      return NextResponse.json({ success: true });
    }

    // Map category → team_performance column
    const fieldMap: Record<string, string> = {
      doors_knocked: "doorsKnocked",
      claims_signed: "claimsSigned",
      revenue: "totalRevenueGenerated",
      jobs_posted: "inspectionsCompleted",
      leads_generated: "contactsMade",
      repairs_landed: "jobsCompleted",
    };

    const field = fieldMap[category];
    if (!field) {
      return NextResponse.json({ error: "Unknown category" }, { status: 400 });
    }

    // Current period boundaries
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Upsert team_performance for this user + org
    const existing = await prisma.team_performance.findUnique({
      where: {
        orgId_userId: { orgId: ctx.orgId, userId: ctx.userId },
      },
    });

    if (existing) {
      const currentVal = Number((existing as Record<string, unknown>)[field]) || 0;
      await prisma.team_performance.update({
        where: { id: existing.id },
        data: { [field]: currentVal + value },
      });
    } else {
      await prisma.team_performance.create({
        data: {
          id: createId(),
          orgId: ctx.orgId,
          userId: ctx.userId,
          periodStart,
          periodEnd,
          updatedAt: now,
          [field]: value,
        },
      });
    }

    logger.info("[GOALS_LOG]", {
      orgId: ctx.orgId,
      userId: ctx.userId,
      category,
      field,
      value,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[GOALS_LOG] Error", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
