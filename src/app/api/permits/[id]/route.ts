export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

// ---------------------------------------------------------------------------
// GET    /api/permits/[id] — Get a single permit
// PATCH  /api/permits/[id] — Update a permit
// DELETE /api/permits/[id] — Delete a permit
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }
    logger.info("[PERMITS_GET]", { permitId: id, orgId: ctx.orgId });

    const permit = await prisma.permits.findFirst({
      where: { id, orgId: ctx.orgId },
    });
    if (!permit) {
      return apiError(404, "NOT_FOUND", "Permit not found");
    }

    return apiOk({ permit });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}

const UpdatePermitSchema = z.object({
  status: z
    .enum(["applied", "approved", "issued", "inspection_scheduled", "passed", "failed", "expired"])
    .optional(),
  approvedAt: z.string().optional().nullable(),
  issuedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  inspectionDate: z.string().optional().nullable(),
  inspectionNotes: z.string().optional().nullable(),
  fee: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  documentUrl: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }
    logger.info("[PERMITS_UPDATE]", { permitId: id, orgId: ctx.orgId });

    const body = await req.json().catch(() => null);
    if (!body) return apiError(400, "INVALID_BODY", "Invalid JSON");

    const parsed = UpdatePermitSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.errors);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = { updatedAt: new Date() };
    const data = parsed.data;

    if (data.status) update.status = data.status;
    if (data.approvedAt !== undefined)
      update.approvedAt = data.approvedAt ? new Date(data.approvedAt) : null;
    if (data.issuedAt !== undefined)
      update.issuedAt = data.issuedAt ? new Date(data.issuedAt) : null;
    if (data.expiresAt !== undefined)
      update.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.inspectionDate !== undefined)
      update.inspectionDate = data.inspectionDate ? new Date(data.inspectionDate) : null;
    if (data.inspectionNotes !== undefined) update.inspectionNotes = data.inspectionNotes;
    if (data.fee !== undefined) update.fee = data.fee;
    if (data.notes !== undefined) update.notes = data.notes;
    if (data.documentUrl !== undefined) update.documentUrl = data.documentUrl;

    const updated = await prisma.$transaction(async (tx) => {
      const check = await tx.permits.findFirst({ where: { id, orgId: ctx.orgId } });
      if (!check) return null;
      return tx.permits.update({ where: { id }, data: update });
    });
    if (!updated) return apiError(404, "NOT_FOUND", "Permit not found (race)");

    return apiOk({ permit: updated });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }
    logger.info("[PERMITS_DELETE]", { permitId: id, orgId: ctx.orgId });

    const result = await prisma.permits.deleteMany({ where: { id, orgId: ctx.orgId } });
    if (result.count === 0) {
      return apiError(404, "NOT_FOUND", "Permit not found");
    }
    return apiOk({ deleted: true });
  } catch (err) {
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}
