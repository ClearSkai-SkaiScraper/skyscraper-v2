export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/lib/apiError";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ---------------------------------------------------------------------------
// GET  /api/invoices — List invoices for the org
// POST /api/invoices — Create a new invoice
// ---------------------------------------------------------------------------

const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  total: z.number().optional(),
});

const CreateInvoiceSchema = z.object({
  jobId: z.string(),
  invoiceNo: z.string().optional(),
  kind: z.enum(["standard", "progress", "final", "supplement", "change_order"]).default("standard"),
  items: z.array(LineItemSchema).min(1, "At least one line item required"),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  customerEmail: z.string().email().optional(),
});

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    const kind = url.searchParams.get("kind");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // contractor_invoices are linked through crm_jobs which have orgId
    const where: any = {};
    if (kind) where.kind = kind;

    // First get job IDs belonging to this org
    const orgJobs = await prisma.crm_jobs.findMany({
      where: { org_id: orgId },
      select: { id: true },
    });
    const orgJobIds = new Set(orgJobs.map((j) => j.id));

    // If jobId filter provided, verify it belongs to this org
    if (jobId && !orgJobIds.has(jobId)) {
      return apiOk({ invoices: [], count: 0, limit, offset });
    }

    const invoices = await prisma.contractor_invoices.findMany({
      where: {
        ...where,
        job_id: jobId ? jobId : { in: Array.from(orgJobIds) },
      },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
      include: {
        crm_jobs: {
          select: { id: true, status: true, org_id: true },
        },
      },
    });

    // Filter to ensure org scoping
    const filtered = invoices.filter((inv) => inv.crm_jobs?.org_id === orgId);

    const enriched = filtered.map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoice_no,
      jobId: inv.job_id,
      jobTitle: inv.crm_jobs?.status ?? null,
      kind: inv.kind,
      items: inv.items,
      totals: inv.totals,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
    }));

    return apiOk({ invoices: enriched, count: enriched.length, limit, offset });
  } catch (err) {
    logger.error("[invoices-get]", err);
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
});

export const POST = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError(400, "INVALID_BODY", "Invalid JSON");

    const parsed = CreateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", parsed.error.errors);
    }
    const data = parsed.data;

    // Verify job belongs to this org
    const job = await prisma.crm_jobs.findFirst({
      where: { id: data.jobId, org_id: orgId },
    });
    if (!job) {
      return apiError(404, "JOB_NOT_FOUND", "Job not found in your organization");
    }

    // Calculate totals
    const lineItems = data.items.map((item) => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));
    const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
    const taxAmount = subtotal * (data.taxRate / 100);
    const total = subtotal + taxAmount - data.discount;

    // Generate invoice number if not provided
    const invoiceNo = data.invoiceNo || `INV-${Date.now().toString(36).toUpperCase()}`;

    const invoice = await prisma.contractor_invoices.create({
      data: {
        id: crypto.randomUUID(),
        job_id: data.jobId,
        invoice_no: invoiceNo,
        kind: data.kind,
        items: lineItems as unknown as Prisma.InputJsonValue,
        totals: {
          subtotal,
          taxRate: data.taxRate,
          taxAmount,
          discount: data.discount,
          total,
          notes: data.notes ?? null,
          dueDate: data.dueDate ?? null,
          customerEmail: data.customerEmail ?? null,
          status: "draft",
          paidAmount: 0,
          balanceDue: total,
        } as unknown as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
    });

    return apiOk({ invoice: { ...invoice, invoiceNo } }, { status: 201 });
  } catch (err) {
    logger.error("[invoices-post]", err);
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
});
