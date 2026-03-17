export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

// ---------------------------------------------------------------------------
// GET  /api/permits — List permits for the org
// POST /api/permits — Create a new permit
// ---------------------------------------------------------------------------

const CreatePermitSchema = z.object({
  jobId: z.string().optional().nullable(),
  claimId: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  permitNumber: z.string().min(1),
  permitType: z.enum([
    "building",
    "roofing",
    "electrical",
    "plumbing",
    "mechanical",
    "demolition",
    "other",
  ]),
  jurisdiction: z.string().optional().nullable(),
  status: z
    .enum(["applied", "approved", "issued", "inspection_scheduled", "passed", "failed", "expired"])
    .default("applied"),
  appliedAt: z.string().optional(),
  expiresAt: z.string().optional().nullable(),
  inspectionDate: z.string().optional().nullable(),
  inspectionNotes: z.string().optional().nullable(),
  fee: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  documentUrl: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    const claimId = url.searchParams.get("claimId");
    const status = url.searchParams.get("status");

    const where: any = { orgId: ctx.orgId };
    if (jobId) where.jobId = jobId;
    if (claimId) where.claimId = claimId;
    if (status) where.status = status;

    const permits = await prisma.permits.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const summary = {
      total: permits.length,
      applied: permits.filter((p) => p.status === "applied").length,
      approved: permits.filter((p) => p.status === "approved").length,
      issued: permits.filter((p) => p.status === "issued").length,
      inspectionScheduled: permits.filter((p) => p.status === "inspection_scheduled").length,
      passed: permits.filter((p) => p.status === "passed").length,
      failed: permits.filter((p) => p.status === "failed").length,
      expired: permits.filter((p) => p.status === "expired").length,
    };

    return apiOk({ permits, summary });
  } catch (err) {
    logger.error("[permits-get]", err);
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

    const parsed = CreatePermitSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.errors);
    }
    const data = parsed.data;

    const permit = await prisma.permits.create({
      data: {
        id: crypto.randomUUID(),
        orgId: ctx.orgId,
        jobId: data.jobId ?? null,
        claimId: data.claimId ?? null,
        propertyId: data.propertyId ?? null,
        permitNumber: data.permitNumber,
        permitType: data.permitType,
        jurisdiction: data.jurisdiction ?? null,
        status: data.status,
        appliedAt: data.appliedAt ? new Date(data.appliedAt) : new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        inspectionDate: data.inspectionDate ? new Date(data.inspectionDate) : null,
        inspectionNotes: data.inspectionNotes ?? null,
        fee: data.fee ?? null,
        notes: data.notes ?? null,
        documentUrl: data.documentUrl ?? null,
        createdBy: ctx.userId,
        updatedAt: new Date(),
      },
    });

    return apiOk({ permit }, { status: 201 });
  } catch (err) {
    logger.error("[permits-post]", err);
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}
