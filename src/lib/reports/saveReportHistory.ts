"use server";

/**
 * saveReportHistory
 *
 * Persists a generated report/document entry into the `report_history` raw SQL table
 * so that it appears on the Reports History page.
 *
 * The table was created via raw SQL migration (20251119_report_history.sql) and is NOT
 * in the Prisma schema, so we use $queryRaw with Prisma.sql tagged templates.
 *
 * Schema: id, org_id, user_id, type, source_id, title, file_url, metadata, created_at
 */

import { Prisma } from "@prisma/client";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type ReportHistoryType =
  | "damage_report"
  | "weather_report"
  | "rebuttal"
  | "supplement"
  | "contractor_packet"
  | "bid_package"
  | "materials_estimate"
  | "project_plan"
  | "bad_faith"
  | "claim_pdf"
  | "retail_proposal"
  | "claims_packet"
  | "other";

export interface SaveReportHistoryInput {
  orgId: string;
  userId: string;
  type: ReportHistoryType;
  title: string;
  /** The related claim / lead / job ID */
  sourceId?: string | null;
  /** Public URL of the generated file (S3/Supabase) */
  fileUrl?: string | null;
  /** Additional contextual data (JSON-serializable) */
  metadata?: Record<string, unknown> | null;
}

/**
 * Insert a row into the `report_history` table.
 * Non-blocking: errors are caught and logged, never propagated.
 */
export async function saveReportHistory(input: SaveReportHistoryInput): Promise<string | null> {
  const { orgId, userId, type, title, sourceId, fileUrl, metadata } = input;
  try {
    const id = crypto.randomUUID();
    const metaJson = metadata ? JSON.stringify(metadata) : null;
    await prisma.$queryRaw(
      Prisma.sql`INSERT INTO report_history (id, org_id, user_id, type, source_id, title, file_url, metadata, created_at)
       VALUES (${id}, ${orgId}, ${userId}, ${type}, ${sourceId ?? null}, ${title}, ${fileUrl ?? null}, ${metaJson}::jsonb, NOW())
       ON CONFLICT DO NOTHING`
    );
    logger.info("[REPORT_HISTORY] Saved", { type, title, orgId, sourceId });
    return id;
  } catch (err) {
    // Non-blocking — the report_history table may not exist on all environments
    logger.warn("[REPORT_HISTORY] Could not save (non-blocking):", err);
    return null;
  }
}
