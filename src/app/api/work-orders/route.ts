export const dynamic = "force-dynamic";
/**
 * Work Orders API
 *
 * GET  — List work orders for org
 * POST — Create a new work order
 */
import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

const createSchema = z.object({
  claimId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().optional(),
  tradeScope: z.string().optional(),
  materials: z
    .array(z.object({ name: z.string(), qty: z.number(), unit: z.string().optional() }))
    .optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await safeOrgContext();
  if (ctx.status !== "ok" || !ctx.orgId) return apiError(401, "AUTH", "Not authenticated");
  logger.info("[WORK_ORDERS_LIST]", { orgId: ctx.orgId });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const claimId = searchParams.get("claimId");

  // We'll store work orders in the jobs table with jobType = 'work_order'
  const where: any = { orgId: ctx.orgId, jobType: "work_order" };
  if (status) where.status = status;
  if (claimId) where.claimId = claimId;

  const workOrders = await prisma.jobs.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      claims: { select: { id: true, claimNumber: true, title: true } },
    },
  });

  const summary = {
    total: workOrders.length,
    pending: workOrders.filter((w) => w.status === "pending").length,
    inProgress: workOrders.filter((w) => w.status === "in_progress").length,
    completed: workOrders.filter((w) => w.status === "completed").length,
  };

  return apiOk({ workOrders, summary });
}

export async function POST(req: NextRequest) {
  const ctx = await safeOrgContext();
  if (ctx.status !== "ok" || !ctx.orgId) return apiError(401, "AUTH", "Not authenticated");
  logger.info("[WORK_ORDERS_CREATE]", { orgId: ctx.orgId });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(400, "VALIDATION", "Invalid input", parsed.error.flatten());

  const data = parsed.data;

  // Verify claim belongs to org
  const claim = await prisma.claims.findFirst({
    where: { id: data.claimId, orgId: ctx.orgId },
    select: { id: true, propertyId: true },
  });
  if (!claim) return apiError(404, "NOT_FOUND", "Claim not found");

  const workOrder = await prisma.jobs.create({
    data: {
      id: crypto.randomUUID(),
      orgId: ctx.orgId,
      propertyId: claim.propertyId,
      claimId: data.claimId,
      title: data.title,
      description: data.description || null,
      jobType: "work_order",
      status: "pending",
      priority: data.priority,
      foreman: data.assignedTo || null,
      scheduledStart: data.dueDate ? new Date(data.dueDate) : null,
      materials: data.materials ? JSON.parse(JSON.stringify(data.materials)) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return apiOk({ workOrder }, { status: 201 });
}
