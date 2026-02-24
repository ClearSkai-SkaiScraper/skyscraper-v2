export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

// ---------------------------------------------------------------------------
// GET    /api/crews/[id] — Get a single crew schedule
// PATCH  /api/crews/[id] — Update a crew schedule
// DELETE /api/crews/[id] — Delete a crew schedule
// ---------------------------------------------------------------------------

const UpdateCrewScheduleSchema = z.object({
  crewLeadId: z.string().optional(),
  crewMemberIds: z.array(z.string()).optional(),
  scheduledDate: z.string().optional(),
  startTime: z.string().optional(),
  estimatedDuration: z.number().int().min(1).max(24).optional(),
  complexity: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  scopeOfWork: z.string().optional().nullable(),
  specialInstructions: z.string().optional().nullable(),
  safetyNotes: z.string().optional().nullable(),
  accessInstructions: z.string().optional().nullable(),
  weatherRisk: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const schedule = await prisma.crewSchedule.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        claims: { select: { id: true, claimNumber: true, title: true } },
        users: { select: { id: true, name: true, email: true, headshot_url: true } },
      },
    });

    if (!schedule) {
      return apiError(404, "NOT_FOUND", "Crew schedule not found");
    }

    // Resolve crew member details
    const memberIds = schedule.crewMemberIds as string[];
    const members =
      memberIds.length > 0
        ? await prisma.users.findMany({
            where: { id: { in: memberIds } },
            select: { id: true, name: true, email: true, headshot_url: true },
          })
        : [];

    return apiOk({ schedule, crewMembers: members });
  } catch (err) {
    logger.error("[crews-get-one]", err);
    return apiError(500, "INTERNAL_ERROR", (err as Error).message);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const body = await req.json().catch(() => null);
    if (!body) return apiError(400, "INVALID_BODY", "Invalid JSON");

    const parsed = UpdateCrewScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.errors);
    }

    const existing = await prisma.crewSchedule.findFirst({
      where: { id, orgId: ctx.orgId },
    });
    if (!existing) {
      return apiError(404, "NOT_FOUND", "Crew schedule not found");
    }

    const data = parsed.data;
    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (data.crewLeadId !== undefined) update.crewLeadId = data.crewLeadId;
    if (data.crewMemberIds !== undefined) update.crewMemberIds = data.crewMemberIds;
    if (data.scheduledDate !== undefined) update.scheduledDate = new Date(data.scheduledDate);
    if (data.startTime !== undefined) update.startTime = data.startTime;
    if (data.estimatedDuration !== undefined) update.estimatedDuration = data.estimatedDuration;
    if (data.complexity !== undefined) update.complexity = data.complexity;
    if (data.status !== undefined) {
      update.status = data.status;
      if (data.status === "in_progress") update.actualStartTime = new Date();
      if (data.status === "completed") update.actualEndTime = new Date();
    }
    if (data.scopeOfWork !== undefined) update.scopeOfWork = data.scopeOfWork;
    if (data.specialInstructions !== undefined)
      update.specialInstructions = data.specialInstructions;
    if (data.safetyNotes !== undefined) update.safetyNotes = data.safetyNotes;
    if (data.accessInstructions !== undefined) update.accessInstructions = data.accessInstructions;
    if (data.weatherRisk !== undefined) update.weatherRisk = data.weatherRisk;

    const updated = await prisma.crewSchedule.update({
      where: { id },
      data: update,
      include: {
        claims: { select: { id: true, claimNumber: true, title: true } },
        users: { select: { id: true, name: true, email: true, headshot_url: true } },
      },
    });

    return apiOk({ schedule: updated });
  } catch (err) {
    logger.error("[crews-patch]", err);
    return apiError(500, "INTERNAL_ERROR", (err as Error).message);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    const existing = await prisma.crewSchedule.findFirst({
      where: { id, orgId: ctx.orgId },
    });
    if (!existing) {
      return apiError(404, "NOT_FOUND", "Crew schedule not found");
    }

    await prisma.crewSchedule.delete({ where: { id } });
    return apiOk({ deleted: true });
  } catch (err) {
    logger.error("[crews-delete]", err);
    return apiError(500, "INTERNAL_ERROR", (err as Error).message);
  }
}
