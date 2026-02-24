export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

// ---------------------------------------------------------------------------
// GET  /api/crews — List crew schedules for the org
// POST /api/crews — Create a new crew schedule (labor / delivery)
// ---------------------------------------------------------------------------

const CreateCrewScheduleSchema = z.object({
  claimId: z.string().min(1, "Claim is required"),
  crewLeadId: z.string().min(1, "Crew lead is required"),
  crewMemberIds: z.array(z.string()).default([]),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  startTime: z.string().default("08:00"),
  estimatedDuration: z.number().int().min(1).max(24).default(8),
  complexity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled"),
  scopeOfWork: z.string().optional().nullable(),
  specialInstructions: z.string().optional().nullable(),
  safetyNotes: z.string().optional().nullable(),
  accessInstructions: z.string().optional().nullable(),
  scheduleType: z.enum(["labor", "delivery", "inspection"]).default("labor"),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const claimId = url.searchParams.get("claimId");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (status) where.status = status;
    if (claimId) where.claimId = claimId;

    const schedules = await prisma.crewSchedule.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
      take: 200,
      include: {
        claims: { select: { id: true, claimNumber: true, title: true } },
        users: { select: { id: true, name: true, email: true, headshot_url: true } },
      },
    });

    return apiOk({ schedules });
  } catch (err) {
    logger.error("[crews-get]", err);
    return apiError(500, "INTERNAL_ERROR", (err as Error).message);
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

    const parsed = CreateCrewScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.errors);
    }

    const data = parsed.data;

    // Verify claim exists and belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: data.claimId, orgId: ctx.orgId },
      select: { id: true },
    });
    if (!claim) {
      return apiError(404, "NOT_FOUND", "Claim not found in your organization");
    }

    const schedule = await prisma.crewSchedule.create({
      data: {
        id: crypto.randomUUID(),
        orgId: ctx.orgId,
        claimId: data.claimId,
        crewLeadId: data.crewLeadId,
        crewMemberIds: data.crewMemberIds,
        scheduledDate: new Date(data.scheduledDate),
        startTime: data.startTime,
        estimatedDuration: data.estimatedDuration,
        complexity: data.complexity,
        status: data.status,
        scopeOfWork: data.scopeOfWork || null,
        specialInstructions: data.specialInstructions || null,
        safetyNotes: data.safetyNotes || null,
        accessInstructions: data.accessInstructions || null,
        metadata: { scheduleType: data.scheduleType },
        updatedAt: new Date(),
      },
      include: {
        claims: { select: { id: true, claimNumber: true, title: true } },
        users: { select: { id: true, name: true, email: true, headshot_url: true } },
      },
    });

    return apiOk({ schedule }, { status: 201 });
  } catch (err) {
    logger.error("[crews-post]", err);
    return apiError(500, "INTERNAL_ERROR", (err as Error).message);
  }
}
