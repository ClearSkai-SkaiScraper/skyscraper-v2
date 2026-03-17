/**
 * POST /api/integrations/quickbooks/sync
 *
 * Trigger QuickBooks sync for a specific job (creates Customer + Invoice in QB).
 * Also supports bulk sync for all unsynced jobs.
 *
 * Body (single):  { jobId: string }
 * Body (bulk):    { bulk: true }
 */

import { NextRequest, NextResponse } from "next/server";

import { syncJobToInvoice } from "@/lib/integrations/quickbooks";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // ── Bulk sync ───────────────────────────────────────────────────────
    if (body.bulk === true) {
      logger.info("[QB_SYNC] Bulk sync triggered", { orgId: ctx.orgId });

      // Find all jobs with financials that haven't been synced yet
      const unsyncedJobs = await prisma.job_financials.findMany({
        where: {
          qb_invoice_id: null,
          crm_jobs: { org_id: ctx.orgId },
        },
        select: { job_id: true },
        take: 100, // Cap at 100 to prevent timeout
      });

      const results: Array<{
        jobId: string;
        status: string;
        qbInvoiceId?: string;
        error?: string;
      }> = [];

      for (const { job_id } of unsyncedJobs) {
        try {
          const result = await syncJobToInvoice(ctx.orgId, job_id);
          results.push({
            jobId: job_id,
            status: result.status,
            qbInvoiceId: result.qbInvoiceId,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          results.push({ jobId: job_id, status: "error", error: message });
          logger.error(`[QB_SYNC] Bulk sync failed for job ${job_id}:`, err);
        }
      }

      const synced = results.filter((r) => r.status === "synced").length;
      const skipped = results.filter((r) => r.status === "already_synced").length;
      const errors = results.filter((r) => r.status === "error").length;

      return NextResponse.json({
        ok: true,
        summary: { total: unsyncedJobs.length, synced, skipped, errors },
        results,
      });
    }

    // ── Single job sync ─────────────────────────────────────────────────
    const { jobId } = body;
    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json({ ok: false, error: "jobId is required" }, { status: 400 });
    }

    // Verify the job belongs to this org
    const job = await prisma.crm_jobs.findFirst({
      where: { id: jobId, org_id: ctx.orgId },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json(
        { ok: false, error: "Job not found or not in your organization" },
        { status: 404 }
      );
    }

    const result = await syncJobToInvoice(ctx.orgId, jobId);

    logger.info("[QB_SYNC] Job synced", {
      orgId: ctx.orgId,
      jobId,
      qbInvoiceId: result.qbInvoiceId,
      status: result.status,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    logger.error("[QB_SYNC_ERROR]", error);

    // Return specific error for "not connected"
    if (message.includes("not connected")) {
      return NextResponse.json(
        { ok: false, error: "QuickBooks is not connected. Please connect first." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}
