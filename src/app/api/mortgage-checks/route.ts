export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

// ---------------------------------------------------------------------------
// GET  /api/mortgage-checks — List mortgage check records
// POST /api/mortgage-checks — Create a new mortgage check record
// ---------------------------------------------------------------------------

const CreateMortgageCheckSchema = z.object({
  claimId: z.string(),
  jobId: z.string().optional().nullable(),
  checkNumber: z.string().optional().nullable(),
  amount: z.number().min(0),
  lender: z.string().min(1),
  status: z
    .enum(["pending", "received", "endorsed", "deposited", "cleared", "returned"])
    .default("pending"),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const url = new URL(req.url);
    const claimId = url.searchParams.get("claimId");
    const status = url.searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { orgId: ctx.orgId };
    if (claimId) where.claimId = claimId;
    if (status) where.status = status;

    const checks = await prisma.mortgage_checks.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        claims: { select: { id: true, claimNumber: true, title: true, insured_name: true } },
      },
    });

    const summary = {
      total: checks.length,
      totalAmount: checks.reduce((s, c) => s + Number(c.amount), 0),
      pending: checks.filter((c) => c.status === "pending").length,
      received: checks.filter((c) => c.status === "received").length,
      endorsed: checks.filter((c) => c.status === "endorsed").length,
      deposited: checks.filter((c) => c.status === "deposited").length,
      cleared: checks.filter((c) => c.status === "cleared").length,
    };

    return apiOk({ checks, summary });
  } catch (err) {
    logger.error("[mortgage-checks-get]", err);
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const body = await req.json().catch(() => null);
    if (!body) return apiError(400, "INVALID_BODY", "Invalid JSON");

    const parsed = CreateMortgageCheckSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.errors);
    }
    const data = parsed.data;

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: data.claimId, orgId: ctx.orgId },
    });
    if (!claim) {
      return apiError(404, "CLAIM_NOT_FOUND", "Claim not found in your organization");
    }

    const check = await prisma.mortgage_checks.create({
      data: {
        id: crypto.randomUUID(),
        orgId: ctx.orgId,
        claimId: data.claimId,
        jobId: data.jobId ?? null,
        checkNumber: data.checkNumber ?? null,
        amount: data.amount,
        lender: data.lender,
        status: data.status,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        notes: data.notes ?? null,
        createdBy: ctx.userId,
        updatedAt: new Date(),
      },
    });

    return apiOk({ check }, { status: 201 });
  } catch (err) {
    logger.error("[mortgage-checks-post]", err);
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}
