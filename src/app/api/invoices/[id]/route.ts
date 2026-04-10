export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

// ---------------------------------------------------------------------------
// GET  /api/invoices/[id] — Get invoice detail
// PATCH /api/invoices/[id] — Update invoice (send, mark paid, etc.)
// DELETE /api/invoices/[id] — Delete draft invoice
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }
    logger.info("[INVOICES_GET]", { invoiceId: id, orgId: ctx.orgId });

    const invoice = await prisma.contractor_invoices.findUnique({
      where: { id },
      include: {
        crm_jobs: {
          select: { id: true, status: true, org_id: true },
        },
      },
    });

    if (!invoice || invoice.crm_jobs?.org_id !== ctx.orgId) {
      return apiError(404, "NOT_FOUND", "Invoice not found");
    }

    return apiOk({ invoice });
  } catch (err) {
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}

const PatchSchema = z.object({
  action: z.enum(["send", "mark_paid", "mark_partial", "void", "update_status"]),
  paidAmount: z.number().optional(),
  status: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }
    logger.info("[INVOICES_UPDATE]", { invoiceId: id, orgId: ctx.orgId });

    const body = await req.json().catch(() => null);
    if (!body) return apiError(400, "INVALID_BODY", "Invalid JSON");

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.errors);
    }

    const invoice = await prisma.contractor_invoices.findUnique({
      where: { id },
      include: { crm_jobs: { select: { org_id: true } } },
    });
    if (!invoice || invoice.crm_jobs?.org_id !== ctx.orgId) {
      return apiError(404, "NOT_FOUND", "Invoice not found");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totals = invoice.totals as any;
    const { action, paidAmount, customerEmail } = parsed.data;

    switch (action) {
      case "send":
        totals.status = "sent";
        totals.sentAt = new Date().toISOString();
        if (customerEmail) totals.customerEmail = customerEmail;
        break;
      case "mark_paid":
        totals.status = "paid";
        totals.paidAmount = totals.total;
        totals.balanceDue = 0;
        totals.paidAt = new Date().toISOString();
        break;
      case "mark_partial":
        if (paidAmount !== undefined) {
          totals.paidAmount = (totals.paidAmount || 0) + paidAmount;
          totals.balanceDue = totals.total - totals.paidAmount;
          totals.status = totals.balanceDue <= 0 ? "paid" : "partial";
        }
        break;
      case "void":
        totals.status = "voided";
        break;
      case "update_status":
        if (parsed.data.status) totals.status = parsed.data.status;
        break;
    }

    const updated = await prisma.contractor_invoices.update({
      where: { id },
      data: { totals, updated_at: new Date() },
    });

    return apiOk({ invoice: updated, action });
  } catch (err) {
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
    logger.info("[INVOICES_DELETE]", { invoiceId: id, orgId: ctx.orgId });

    const invoice = await prisma.contractor_invoices.findUnique({
      where: { id },
      include: { crm_jobs: { select: { org_id: true } } },
    });
    if (!invoice || invoice.crm_jobs?.org_id !== ctx.orgId) {
      return apiError(404, "NOT_FOUND", "Invoice not found");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totals = invoice.totals as any;
    if (totals.status !== "draft") {
      return apiError(400, "INVALID_STATE", "Only draft invoices can be deleted");
    }

    await prisma.contractor_invoices.delete({ where: { id } });
    return apiOk({ deleted: true });
  } catch (err) {
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}
