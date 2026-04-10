export const dynamic = "force-dynamic";
/**
 * Work Order Detail API
 *
 * PATCH — Update status/details
 * DELETE — Remove work order
 */
import { NextRequest } from "next/server";

import { apiError, apiOk } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await safeOrgContext();
  if (ctx.status !== "ok" || !ctx.orgId) return apiError(401, "AUTH", "Not authenticated");

  const { id } = await params;
  const body = await req.json();
  logger.info("[WORK_ORDERS_PATCH]", { id, orgId: ctx.orgId });

  const existing = await prisma.jobs.findFirst({
    where: { id, orgId: ctx.orgId, jobType: "work_order" },
  });
  if (!existing) return apiError(404, "NOT_FOUND", "Work order not found");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = { updatedAt: new Date() };
  if (body.status) updateData.status = body.status;
  if (body.title) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.priority) updateData.priority = body.priority;
  if (body.assignedTo !== undefined) updateData.foreman = body.assignedTo;
  if (body.dueDate) updateData.scheduledStart = new Date(body.dueDate);
  if (body.materials) updateData.materials = JSON.parse(JSON.stringify(body.materials));
  if (body.notes) updateData.equipment = { notes: body.notes };

  if (body.status === "completed" && !existing.actualEnd) {
    updateData.actualEnd = new Date();
  }
  if (body.status === "in_progress" && !existing.actualStart) {
    updateData.actualStart = new Date();
  }

  const updated = await prisma.jobs.update({ where: { id }, data: updateData });
  return apiOk({ workOrder: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await safeOrgContext();
  if (ctx.status !== "ok" || !ctx.orgId) return apiError(401, "AUTH", "Not authenticated");

  const { id } = await params;
  logger.info("[WORK_ORDERS_DELETE]", { id, orgId: ctx.orgId });
  const existing = await prisma.jobs.findFirst({
    where: { id, orgId: ctx.orgId, jobType: "work_order" },
  });
  if (!existing) return apiError(404, "NOT_FOUND", "Work order not found");

  await prisma.jobs.delete({ where: { id } });
  return apiOk({ deleted: true });
}
