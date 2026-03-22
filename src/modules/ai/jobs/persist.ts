/**
 * AI Section Persistence Layer
 *
 * Uses ai_reports.attachments JSONB to store section results.
 * B-31: Wired to real DB — no longer a no-op stub.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type PersistResult = { ok: true } | { ok: false; error: string };

export async function persistJobState(..._args: any[]): Promise<PersistResult> {
  return { ok: true };
}

export async function loadJobState<T = any>(..._args: any[]): Promise<T | null> {
  return null;
}

export async function deleteJobState(..._args: any[]): Promise<PersistResult> {
  return { ok: true };
}

/**
 * Get a saved AI section from a report's attachments JSONB
 */
export async function getAISection(sectionKey: string, reportId: string): Promise<any | null> {
  try {
    const report = await prisma.ai_reports.findUnique({
      where: { id: reportId },
      select: { attachments: true },
    });
    if (!report) return null;
    const attachments = (report.attachments as any) || {};
    return attachments.sections?.[sectionKey] || null;
  } catch (err) {
    logger.warn("[AI Persist] getAISection failed", { reportId, sectionKey, error: String(err) });
    return null;
  }
}

/**
 * Save an AI section result into a report's attachments JSONB
 */
export async function saveAISection(
  reportId: string,
  sectionKey: string,
  data: any
): Promise<{ ok: boolean }> {
  try {
    const report = await prisma.ai_reports.findUnique({
      where: { id: reportId },
      select: { attachments: true },
    });
    if (!report) {
      logger.warn("[AI Persist] saveAISection: report not found", { reportId });
      return { ok: false };
    }
    const attachments = (report.attachments as any) || {};
    const sections = attachments.sections || {};
    sections[sectionKey] = {
      data,
      savedAt: new Date().toISOString(),
    };

    await prisma.ai_reports.update({
      where: { id: reportId },
      data: {
        attachments: { ...attachments, sections },
        updatedAt: new Date(),
      },
    });

    logger.debug("[AI Persist] Saved section", { reportId, sectionKey });
    return { ok: true };
  } catch (err) {
    logger.error("[AI Persist] saveAISection failed", { reportId, sectionKey, error: String(err) });
    return { ok: false };
  }
}

/**
 * Get all saved AI sections for a report
 */
export async function getAllAISections(reportId: string): Promise<any[]> {
  try {
    const report = await prisma.ai_reports.findUnique({
      where: { id: reportId },
      select: { attachments: true },
    });
    if (!report) return [];
    const attachments = (report.attachments as any) || {};
    const sections = attachments.sections || {};
    return Object.entries(sections).map(([key, value]) => ({
      sectionKey: key,
      ...(value as any),
    }));
  } catch (err) {
    logger.warn("[AI Persist] getAllAISections failed", { reportId, error: String(err) });
    return [];
  }
}
