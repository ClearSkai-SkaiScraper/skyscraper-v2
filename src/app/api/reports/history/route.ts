export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/reports/history
 *
 * Accepts a report entry from client-side PDF generators and persists it
 * to the report_history table so it appears on the Reports History page.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import { type ReportHistoryType,saveReportHistory } from "@/lib/reports/saveReportHistory";
import { safeOrgContext } from "@/lib/safeOrgContext";

const bodySchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  sourceId: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId || !ctx.userId) {
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError(400, "INVALID_JSON", "Request body must be valid JSON");
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request body", {
        errors: parsed.error.errors,
      });
    }

    const { type, title, sourceId, fileUrl, metadata } = parsed.data;

    const id = await saveReportHistory({
      orgId: ctx.orgId,
      userId: ctx.userId,
      type: type as ReportHistoryType,
      title,
      sourceId: sourceId ?? null,
      fileUrl: fileUrl ?? null,
      metadata: (metadata as Record<string, unknown>) ?? null,
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", {
        errors: error.errors,
      });
    }
    logger.error("[API /reports/history POST] Error", { error });
    return apiError(500, "INTERNAL_ERROR", "Failed to save report history entry");
  }
}
