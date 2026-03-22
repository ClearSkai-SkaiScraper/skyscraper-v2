/**
 * ClaimIQ\u2122 \u2014 Readiness Lifecycle Hooks
 *
 * Automatically refresh ClaimIQ readiness score after data changes:
 *   - Photo upload / analysis
 *   - Weather verification
 *   - Document upload
 *   - Contact / client updates
 *   - Report generation
 *   - Section generation
 *
 * These hooks are called from API routes after mutations complete.
 * Events are persisted to the claim_activities table (serverless-safe).
 */

import { createId } from "@paralleldrive/cuid2";

import { assessClaimReadiness } from "@/lib/claimiq/assembly-engine";
import { buildAutopilotPlan } from "@/lib/claimiq/autopilot";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Types

export type ReadinessChangeType =
  | "photo_upload"
  | "photo_analysis"
  | "weather_verification"
  | "document_upload"
  | "contact_update"
  | "report_generation"
  | "section_generation"
  | "claim_update"
  | "estimate_added"
  | "inspection_completed";

export interface ReadinessChangeEvent {
  claimId: string;
  orgId: string;
  changeType: ReadinessChangeType;
  timestamp: string;
  previousScore?: number;
  currentScore: number;
  delta: number;
  affectedSections: string[];
  newAutoActions: number;
}

// DB-backed event storage (serverless-safe)

export async function getRecentReadinessEvents(
  claimId: string,
  since?: string
): Promise<ReadinessChangeEvent[]> {
  try {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 60 * 60 * 1000);

    const activities = await prisma.claim_activities.findMany({
      where: {
        claim_id: claimId,
        type: "NOTE",
        created_at: { gt: sinceDate },
        message: { startsWith: "[ClaimIQ]" },
      },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    return activities
      .map((a) => {
        const meta = a.metadata as Record<string, unknown> | null;
        if (!meta || meta._type !== "readiness_change") return null;
        return {
          claimId,
          orgId: meta.orgId as string,
          changeType: meta.changeType as ReadinessChangeType,
          timestamp: a.created_at.toISOString(),
          previousScore: meta.previousScore as number | undefined,
          currentScore: meta.currentScore as number,
          delta: meta.delta as number,
          affectedSections: (meta.affectedSections as string[]) || [],
          newAutoActions: (meta.newAutoActions as number) || 0,
        };
      })
      .filter(Boolean) as ReadinessChangeEvent[];
  } catch (err) {
    logger.error("[CLAIMIQ_HOOK] Failed to read events", { claimId, error: err });
    return [];
  }
}

async function persistReadinessEvent(event: ReadinessChangeEvent, userId: string): Promise<void> {
  try {
    await prisma.claim_activities.create({
      data: {
        id: createId(),
        claim_id: event.claimId,
        user_id: userId,
        type: "NOTE",
        message: `[ClaimIQ] Readiness ${event.delta >= 0 ? "improved" : "changed"}: ${event.changeType} (${event.currentScore}%)`,
        metadata: {
          _type: "readiness_change",
          orgId: event.orgId,
          changeType: event.changeType,
          previousScore: event.previousScore,
          currentScore: event.currentScore,
          delta: event.delta,
          affectedSections: event.affectedSections,
          newAutoActions: event.newAutoActions,
        },
      },
    });
  } catch (err) {
    logger.error("[CLAIMIQ_HOOK] Failed to persist event", { claimId: event.claimId, error: err });
  }
}

// Core hook

export async function onClaimDataChanged(
  claimId: string,
  orgId: string,
  changeType: ReadinessChangeType,
  userId: string,
  previousScore?: number
): Promise<ReadinessChangeEvent | null> {
  try {
    logger.info("[CLAIMIQ_HOOK] Data changed", { claimId, changeType });

    const readiness = await assessClaimReadiness(claimId, orgId);

    const allMissing = readiness.sections.flatMap((s) => s.missingItems);
    const plan = buildAutopilotPlan(claimId, allMissing);

    const currentScore = readiness.overallScore;
    const delta = previousScore != null ? currentScore - previousScore : 0;

    const affectedSections = readiness.sections
      .filter((s) => s.status !== "ready" || s.completeness < 100)
      .map((s) => s.key);

    const event: ReadinessChangeEvent = {
      claimId,
      orgId,
      changeType,
      timestamp: new Date().toISOString(),
      previousScore,
      currentScore,
      delta,
      affectedSections,
      newAutoActions: plan.autonomousActions,
    };

    persistReadinessEvent(event, userId).catch((e) => {
      logger.warn(`[CLAIMIQ_HOOK] persistReadinessEvent failed: ${e?.message}`);
    });

    logger.info("[CLAIMIQ_HOOK] Readiness refreshed", {
      claimId,
      changeType,
      score: currentScore,
      delta,
      autoActions: plan.autonomousActions,
    });

    return event;
  } catch (err) {
    logger.error("[CLAIMIQ_HOOK] Refresh failed", { claimId, changeType, error: err });
    return null;
  }
}

// Convenience hooks

export async function onPhotosUploaded(
  claimId: string,
  orgId: string,
  userId: string,
  photoCount: number
) {
  logger.info("[CLAIMIQ_HOOK] Photos uploaded", { claimId, count: photoCount });
  return onClaimDataChanged(claimId, orgId, "photo_upload", userId);
}

export async function onPhotosAnalyzed(
  claimId: string,
  orgId: string,
  userId: string,
  detectionCount: number
) {
  logger.info("[CLAIMIQ_HOOK] Photos analyzed", { claimId, detections: detectionCount });
  return onClaimDataChanged(claimId, orgId, "photo_analysis", userId);
}

export async function onWeatherVerified(claimId: string, orgId: string, userId: string) {
  logger.info("[CLAIMIQ_HOOK] Weather verified", { claimId });
  return onClaimDataChanged(claimId, orgId, "weather_verification", userId);
}

export async function onDocumentUploaded(
  claimId: string,
  orgId: string,
  userId: string,
  docType: string
) {
  logger.info("[CLAIMIQ_HOOK] Document uploaded", { claimId, docType });
  return onClaimDataChanged(claimId, orgId, "document_upload", userId);
}

export async function onContactUpdated(claimId: string, orgId: string, userId: string) {
  logger.info("[CLAIMIQ_HOOK] Contact updated", { claimId });
  return onClaimDataChanged(claimId, orgId, "contact_update", userId);
}

export async function onSectionGenerated(
  claimId: string,
  orgId: string,
  userId: string,
  sectionKey: string
) {
  logger.info("[CLAIMIQ_HOOK] Section generated", { claimId, sectionKey });
  return onClaimDataChanged(claimId, orgId, "section_generation", userId);
}

export async function onClaimUpdated(
  claimId: string,
  orgId: string,
  userId: string,
  updatedFields: string[]
) {
  logger.info("[CLAIMIQ_HOOK] Claim updated", { claimId, fields: updatedFields });
  return onClaimDataChanged(claimId, orgId, "claim_update", userId);
}

export async function onEstimateAdded(claimId: string, orgId: string, userId: string) {
  logger.info("[CLAIMIQ_HOOK] Estimate added", { claimId });
  return onClaimDataChanged(claimId, orgId, "estimate_added", userId);
}
