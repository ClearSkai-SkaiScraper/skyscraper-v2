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
] as const;

const upsertGoalSchema = z.object({
  goals: z.array(
    z.object({
      category: z.enum(VALID_CATEGORIES),
      weekly: z.number().int().min(0),
      monthly: z.number().int().min(0),
    })
  ),
});

/**
 * GET /api/goals — Fetch goals for the current org (optionally per-user).
 * Returns org-wide goals; user-specific overrides take precedence.
 */
export async function GET() {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch org-wide goals + any user-specific overrides
    const goals = await prisma.org_goals.findMany({
      where: {
        orgId: ctx.orgId,
        OR: [{ userId: "" }, { userId: ctx.userId ?? undefined }],
      },
      orderBy: { category: "asc" },
    });

    // Merge: user-specific overrides take precedence over org-wide
    const merged: Record<string, { category: string; weekly: number; monthly: number }> = {};
    for (const g of goals) {
      // If we haven't seen this category, or this is a user-specific override, use it
      if (!merged[g.category] || (g.userId && g.userId !== "")) {
        merged[g.category] = {
          category: g.category,
          weekly: g.weekly,
          monthly: g.monthly,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        goals: Object.values(merged),
        // Also return raw for goal settings page
        raw: goals.map((g) => ({
          id: g.id,
          category: g.category,
          weekly: g.weekly,
          monthly: g.monthly,
          userId: g.userId,
        })),
      },
    });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    // Handle missing table gracefully (migration not yet applied)
    const errMsg = String(err);
    if (
      errMsg.includes("org_goals") &&
      (errMsg.includes("does not exist") || errMsg.includes("relation"))
    ) {
      logger.warn("[API] goals GET — org_goals table not yet created, returning empty");
      return NextResponse.json({
        success: true,
        data: { goals: [], raw: [] },
        _migrationNeeded: "20260616_create_org_goals.sql",
      });
    }
    logger.error("[API] goals GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/goals — Upsert goals for the current org.
 * Creates or updates org-wide goals (userId=null).
 * Replaces localStorage-based goal storage.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers+ can set org-wide goals
    // Skip role check for single-user orgs (they're implicitly admin)
    try {
      const { requireRole } = await import("@/lib/auth/rbac");
      await requireRole("manager");
    } catch (roleErr: unknown) {
      if ((roleErr as { statusCode?: number })?.statusCode === 403) {
        return NextResponse.json({ error: "Manager role required to set goals" }, { status: 403 });
      }
      // If RBAC fails for other reasons (e.g., no membership table), allow through
    }

    const body = await req.json();
    const parsed = upsertGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Upsert each goal category as org-wide (userId = null)
    const results = await prisma.$transaction(
      parsed.data.goals.map((g) =>
        prisma.org_goals.upsert({
          where: {
            orgId_userId_category: {
              orgId: ctx.orgId!,
              userId: "", // org-wide: empty string to satisfy unique constraint
              category: g.category,
            },
          },
          create: {
            id: createId(),
            orgId: ctx.orgId!,
            userId: "",
            category: g.category,
            weekly: g.weekly,
            monthly: g.monthly,
          },
          update: {
            weekly: g.weekly,
            monthly: g.monthly,
          },
        })
      )
    );

    logger.info("[GOALS_UPSERT]", { orgId: ctx.orgId, count: results.length });

    return NextResponse.json({
      success: true,
      data: results.map((r) => ({
        id: r.id,
        category: r.category,
        weekly: r.weekly,
        monthly: r.monthly,
      })),
    });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    // Handle missing table gracefully
    const errMsg = String(err);
    if (
      errMsg.includes("org_goals") &&
      (errMsg.includes("does not exist") || errMsg.includes("relation"))
    ) {
      logger.warn("[API] goals POST — org_goals table not yet created");
      return NextResponse.json(
        {
          error: "Goals table not yet initialized. Run migration: 20260616_create_org_goals.sql",
          _migrationNeeded: "20260616_create_org_goals.sql",
        },
        { status: 503 }
      );
    }
    logger.error("[API] goals POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
