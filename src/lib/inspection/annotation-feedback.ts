/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANNOTATION FEEDBACK & CORRECTION TRACKING
 *
 * Sprint Item 8.2 — Tracks user corrections to AI-generated annotations
 * (bounding boxes, damage types, severity) to improve detection accuracy.
 *
 * Stores feedback in file_assets metadata for later analysis.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { AnnotationEdit } from "@/types/annotations";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnnotationFeedbackSummary {
  totalEdits: number;
  creates: number;
  updates: number;
  deletes: number;
  approvals: number;
  rejections: number;
  /** Most commonly corrected damage types */
  commonCorrections: Array<{
    originalDamageType: string;
    correctedTo: string;
    count: number;
  }>;
  /** Average bounding box adjustment (normalized 0-1 space) */
  avgBboxAdjustment: number;
  /** How often severity is changed */
  severityChangeRate: number;
}

// ─── Feedback Storage ────────────────────────────────────────────────────────

/**
 * Record an annotation edit for the training feedback loop.
 */
export async function recordAnnotationEdit(edit: AnnotationEdit): Promise<void> {
  try {
    const asset = await prisma.file_assets.findUnique({
      where: { id: edit.photoId },
      select: { metadata: true },
    });

    if (!asset) {
      logger.warn("[ANNOTATION_FEEDBACK] Photo not found", { photoId: edit.photoId });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = (asset.metadata as any) || {};
    const annotationEdits = metadata.annotationEdits || [];
    annotationEdits.push({
      annotationId: edit.annotationId,
      editType: edit.editType,
      before: edit.before || null,
      after: edit.after || null,
      editedBy: edit.editedBy,
      editedAt: edit.editedAt,
      reason: edit.reason || null,
    });

    await prisma.file_assets.update({
      where: { id: edit.photoId },
      data: {
        metadata: { ...metadata, annotationEdits },
        updatedAt: new Date(),
      },
    });

    logger.info("[ANNOTATION_FEEDBACK] Recorded annotation edit", {
      photoId: edit.photoId,
      annotationId: edit.annotationId,
      editType: edit.editType,
    });
  } catch (error) {
    logger.error("[ANNOTATION_FEEDBACK] Failed to record edit", {
      error: error instanceof Error ? error.message : String(error),
      photoId: edit.photoId,
    });
  }
}

/**
 * Record batch annotation edits.
 */
export async function recordAnnotationEditBatch(
  edits: AnnotationEdit[]
): Promise<{ saved: number; failed: number }> {
  let saved = 0;
  let failed = 0;

  for (const edit of edits) {
    try {
      await recordAnnotationEdit(edit);
      saved++;
    } catch {
      failed++;
    }
  }

  return { saved, failed };
}

// ─── Gold Standard Management ────────────────────────────────────────────────

/**
 * Mark a photo's annotations as "gold standard" — human-verified ground truth.
 * Used for evaluating and improving AI detection accuracy.
 */
export async function markAsGoldStandard(photoId: string, userId: string): Promise<void> {
  try {
    const asset = await prisma.file_assets.findUnique({
      where: { id: photoId },
      select: { metadata: true },
    });

    if (!asset) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = (asset.metadata as any) || {};
    metadata.goldStandard = {
      isGoldStandard: true,
      verifiedBy: userId,
      verifiedAt: new Date().toISOString(),
    };

    await prisma.file_assets.update({
      where: { id: photoId },
      data: { metadata, updatedAt: new Date() },
    });

    logger.info("[ANNOTATION_FEEDBACK] Marked as gold standard", { photoId, userId });
  } catch (error) {
    logger.error("[ANNOTATION_FEEDBACK] Failed to mark gold standard", {
      error: error instanceof Error ? error.message : String(error),
      photoId,
    });
  }
}

// ─── Feedback Analysis ───────────────────────────────────────────────────────

/**
 * Get annotation feedback summary for an organization.
 */
export async function getAnnotationFeedbackSummary(
  orgId: string,
  options?: { since?: Date }
): Promise<AnnotationFeedbackSummary> {
  try {
    const assets = await prisma.file_assets.findMany({
      where: {
        orgId,
        metadata: { not: undefined },
        ...(options?.since ? { updatedAt: { gte: options.since } } : {}),
      },
      select: { metadata: true },
      take: 500,
    });

    let totalEdits = 0;
    let creates = 0;
    let updates = 0;
    let deletes = 0;
    let approvals = 0;
    let rejections = 0;
    let totalBboxAdj = 0;
    let bboxAdjCount = 0;
    let severityChanges = 0;
    let severityTotal = 0;
    const corrections = new Map<string, Map<string, number>>();

    for (const asset of assets) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = asset.metadata as any;
      const edits = metadata?.annotationEdits as AnnotationEdit[] | undefined;
      if (!edits) continue;

      for (const edit of edits) {
        totalEdits++;
        switch (edit.editType) {
          case "create":
            creates++;
            break;
          case "update":
            updates++;
            break;
          case "delete":
            deletes++;
            break;
          case "approve":
            approvals++;
            break;
          case "reject":
            rejections++;
            break;
        }

        // Track damage type corrections
        if (edit.editType === "update" && edit.before?.damageType && edit.after?.damageType) {
          if (edit.before.damageType !== edit.after.damageType) {
            const orig = edit.before.damageType as string;
            const corrected = edit.after.damageType as string;
            if (!corrections.has(orig)) corrections.set(orig, new Map());
            const current = corrections.get(orig)!.get(corrected) || 0;
            corrections.get(orig)!.set(corrected, current + 1);
          }
        }

        // Track bbox adjustments
        if (edit.editType === "update" && edit.before && edit.after) {
          const b = edit.before;
          const a = edit.after;
          if (b.x !== undefined && a.x !== undefined) {
            const dx = Math.abs((a.x as number) - (b.x as number));
            const dy = Math.abs(((a.y as number) || 0) - ((b.y as number) || 0));
            totalBboxAdj += Math.sqrt(dx * dx + dy * dy);
            bboxAdjCount++;
          }
        }

        // Track severity changes
        if (edit.editType === "update" && edit.before?.severity && edit.after?.severity) {
          severityTotal++;
          if (edit.before.severity !== edit.after.severity) {
            severityChanges++;
          }
        }
      }
    }

    // Build common corrections list
    const commonCorrections: Array<{
      originalDamageType: string;
      correctedTo: string;
      count: number;
    }> = [];
    for (const [orig, correctedMap] of corrections) {
      for (const [corrected, count] of correctedMap) {
        commonCorrections.push({ originalDamageType: orig, correctedTo: corrected, count });
      }
    }
    commonCorrections.sort((a, b) => b.count - a.count);

    return {
      totalEdits,
      creates,
      updates,
      deletes,
      approvals,
      rejections,
      commonCorrections: commonCorrections.slice(0, 10),
      avgBboxAdjustment: bboxAdjCount > 0 ? totalBboxAdj / bboxAdjCount : 0,
      severityChangeRate: severityTotal > 0 ? severityChanges / severityTotal : 0,
    };
  } catch (error) {
    logger.error("[ANNOTATION_FEEDBACK] Failed to get summary", { error, orgId });
    return {
      totalEdits: 0,
      creates: 0,
      updates: 0,
      deletes: 0,
      approvals: 0,
      rejections: 0,
      commonCorrections: [],
      avgBboxAdjustment: 0,
      severityChangeRate: 0,
    };
  }
}
