/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CAPTION FEEDBACK & TRAINING DATA COLLECTION
 *
 * Sprint Item 8.1 — Tracks user edits to AI-generated captions
 * to build a training dataset for caption quality improvement.
 *
 * Stores feedback in the claim's file_assets metadata and optionally
 * in a dedicated feedback table for batch analysis.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CaptionFeedback {
  /** Photo/file_asset ID */
  photoId: string;
  /** Cluster/finding ID within the photo */
  findingId: string;
  /** The AI-generated caption that was displayed */
  originalCaption: string;
  /** The user's edited caption (null if approved as-is) */
  editedCaption: string | null;
  /** Whether the user approved or rejected the AI caption */
  action: "approved" | "edited" | "rejected";
  /** Damage type of the finding */
  damageType: string;
  /** Severity of the finding */
  severity: string;
  /** The template category that was used (e.g., "hail", "wind") */
  templateCategory?: string;
  /** User who provided feedback */
  userId: string;
  /** Organization */
  orgId: string;
  /** Claim ID */
  claimId: string;
  /** Timestamp */
  timestamp: string;
}

export interface CaptionFeedbackSummary {
  totalFeedback: number;
  approvedCount: number;
  editedCount: number;
  rejectedCount: number;
  approvalRate: number;
  commonEdits: Array<{
    damageType: string;
    editCount: number;
    templateCategory: string;
  }>;
}

// ─── Feedback Storage ────────────────────────────────────────────────────────

/**
 * Save caption feedback to the file_asset's metadata.
 * This keeps feedback co-located with the photo for easy retrieval.
 */
export async function saveCaptionFeedback(feedback: CaptionFeedback): Promise<void> {
  try {
    const asset = await prisma.file_assets.findUnique({
      where: { id: feedback.photoId },
      select: { metadata: true },
    });

    if (!asset) {
      logger.warn("[CAPTION_FEEDBACK] Photo not found", { photoId: feedback.photoId });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = (asset.metadata as any) || {};
    const captionFeedback = metadata.captionFeedback || [];
    captionFeedback.push({
      findingId: feedback.findingId,
      originalCaption: feedback.originalCaption,
      editedCaption: feedback.editedCaption,
      action: feedback.action,
      damageType: feedback.damageType,
      severity: feedback.severity,
      templateCategory: feedback.templateCategory,
      userId: feedback.userId,
      timestamp: feedback.timestamp,
    });

    await prisma.file_assets.update({
      where: { id: feedback.photoId },
      data: {
        metadata: { ...metadata, captionFeedback },
        updatedAt: new Date(),
      },
    });

    logger.info("[CAPTION_FEEDBACK] Saved caption feedback", {
      photoId: feedback.photoId,
      findingId: feedback.findingId,
      action: feedback.action,
      claimId: feedback.claimId,
    });
  } catch (error) {
    logger.error("[CAPTION_FEEDBACK] Failed to save feedback", {
      error: error instanceof Error ? error.message : String(error),
      photoId: feedback.photoId,
    });
  }
}

/**
 * Save multiple caption feedback entries in batch.
 */
export async function saveCaptionFeedbackBatch(
  feedbackItems: CaptionFeedback[]
): Promise<{ saved: number; failed: number }> {
  let saved = 0;
  let failed = 0;

  for (const feedback of feedbackItems) {
    try {
      await saveCaptionFeedback(feedback);
      saved++;
    } catch {
      failed++;
    }
  }

  logger.info("[CAPTION_FEEDBACK] Batch save complete", { saved, failed });
  return { saved, failed };
}

// ─── Feedback Analysis ───────────────────────────────────────────────────────

/**
 * Get caption feedback summary for an organization.
 * Useful for understanding which caption templates need improvement.
 */
export async function getCaptionFeedbackSummary(
  orgId: string,
  options?: { since?: Date; damageType?: string }
): Promise<CaptionFeedbackSummary> {
  try {
    const assets = await prisma.file_assets.findMany({
      where: {
        orgId,
        metadata: { not: undefined },
        ...(options?.since ? { updatedAt: { gte: options.since } } : {}),
      },
      select: { metadata: true },
      take: 500, // Limit for performance
    });

    let totalFeedback = 0;
    let approvedCount = 0;
    let editedCount = 0;
    let rejectedCount = 0;
    const editsByType = new Map<string, { count: number; category: string }>();

    for (const asset of assets) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = asset.metadata as any;
      const feedback = metadata?.captionFeedback as CaptionFeedback[] | undefined;
      if (!feedback) continue;

      for (const fb of feedback) {
        if (options?.damageType && fb.damageType !== options.damageType) continue;

        totalFeedback++;
        if (fb.action === "approved") approvedCount++;
        else if (fb.action === "edited") {
          editedCount++;
          const key = fb.damageType;
          const existing = editsByType.get(key) || {
            count: 0,
            category: fb.templateCategory || "unknown",
          };
          existing.count++;
          editsByType.set(key, existing);
        } else if (fb.action === "rejected") rejectedCount++;
      }
    }

    const commonEdits = [...editsByType.entries()]
      .map(([damageType, data]) => ({
        damageType,
        editCount: data.count,
        templateCategory: data.category,
      }))
      .sort((a, b) => b.editCount - a.editCount)
      .slice(0, 10);

    return {
      totalFeedback,
      approvedCount,
      editedCount,
      rejectedCount,
      approvalRate: totalFeedback > 0 ? approvedCount / totalFeedback : 0,
      commonEdits,
    };
  } catch (error) {
    logger.error("[CAPTION_FEEDBACK] Failed to get summary", { error, orgId });
    return {
      totalFeedback: 0,
      approvedCount: 0,
      editedCount: 0,
      rejectedCount: 0,
      approvalRate: 0,
      commonEdits: [],
    };
  }
}
