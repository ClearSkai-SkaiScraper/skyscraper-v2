export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { requireRole } from "@/lib/auth/rbac";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

// ---------------------------------------------------------------------------
// GET  /api/commissions — List commission records for the org
// POST /api/commissions — Update a commission record (approve / mark paid)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const periodStart = url.searchParams.get("periodStart");
    const periodEnd = url.searchParams.get("periodEnd");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { orgId: ctx.orgId };
    if (userId) where.userId = userId;
    if (periodStart) where.periodStart = { gte: new Date(periodStart) };
    if (periodEnd) where.periodEnd = { lte: new Date(periodEnd) };

    const records = await prisma.team_performance.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Collect user info
    const userIds = [...new Set(records.map((r) => r.userId))];
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, headshot_url: true },
    });
    const usersMap = new Map(users.map((u) => [u.id, u]));

    const enriched = records.map((r) => ({
      id: r.id,
      userId: r.userId,
      user: usersMap.get(r.userId) ?? null,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      doorsKnocked: r.doorsKnocked,
      contactsMade: r.contactsMade,
      appointmentsBooked: r.appointmentsBooked,
      inspectionsCompleted: r.inspectionsCompleted,
      claimsSigned: r.claimsSigned,
      claimsApproved: r.claimsApproved,
      totalRevenueGenerated: Number(r.totalRevenueGenerated),
      totalInvoiced: Number(r.totalInvoiced),
      commissionOwed: Number(r.commissionOwed),
      commissionPaid: Number(r.commissionPaid),
      commissionPending: Number(r.commissionPending),
      closeRate: Number(r.closeRate),
      updatedAt: r.updatedAt,
    }));

    const totals = {
      totalOwed: enriched.reduce((s, r) => s + r.commissionOwed, 0),
      totalPaid: enriched.reduce((s, r) => s + r.commissionPaid, 0),
      totalPending: enriched.reduce((s, r) => s + r.commissionPending, 0),
    };

    return apiOk({ records: enriched, totals, count: enriched.length });
  } catch (err) {
    logger.error("[commissions-get]", err);
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}

const UpdateSchema = z.object({
  recordId: z.string(),
  action: z.enum(["approve", "mark_paid", "adjust"]),
  amount: z.number().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    // RBAC: Only managers+ can approve/pay commissions
    await requireRole("manager");

    const body = await req.json().catch(() => null);
    if (!body) return apiError(400, "INVALID_BODY", "Invalid JSON");

    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.errors);
    }

    const { recordId, action, amount } = parsed.data;

    const record = await prisma.team_performance.findFirst({
      where: { id: recordId, orgId: ctx.orgId },
    });
    if (!record) {
      return apiError(404, "NOT_FOUND", "Commission record not found");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let update: any = { updatedAt: new Date() };

    switch (action) {
      case "approve":
        // Move from pending → owed
        update.commissionOwed = Number(record.commissionOwed) + Number(record.commissionPending);
        update.commissionPending = 0;
        break;
      case "mark_paid":
        // Move from owed → paid
        const payAmount = amount ?? Number(record.commissionOwed);
        update.commissionPaid = Number(record.commissionPaid) + payAmount;
        update.commissionOwed = Math.max(0, Number(record.commissionOwed) - payAmount);
        break;
      case "adjust":
        if (amount !== undefined) {
          update.commissionPending = amount;
        }
        break;
    }

    const updated = await prisma.team_performance.update({
      where: { id: recordId },
      data: update,
    });

    return apiOk({ record: updated, action });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statusCode = (err as any)?.statusCode;
    if (statusCode === 403) {
      return apiError(403, "FORBIDDEN", (err as Error).message);
    }
    logger.error("[commissions-post]", err);
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}
