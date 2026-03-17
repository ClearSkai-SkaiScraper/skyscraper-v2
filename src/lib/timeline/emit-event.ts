/**
 * Timeline Event Helper
 * Centralized utility for emitting ClaimTimelineEvents
 * Used across Phase 1-4 actions for audit trail and client visibility
 */

import { randomUUID } from "crypto";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type TimelineEventType =
  | "PHOTO_UPLOAD"
  | "DOCUMENT_SHARED"
  | "DOCUMENT_QUESTION"
  | "WORK_ORDER"
  | "FILE_VISIBILITY_CHANGED"
  | "GENERAL";

interface EmitTimelineEventParams {
  claimId: string;
  orgId?: string;
  type: TimelineEventType;
  title: string;
  body?: string;
  createdById?: string;
  visibleToClient?: boolean;
}

/**
 * Emit a timeline event for a claim
 * These events show up in the claim history and portal timeline view
 */
export async function emitTimelineEvent({
  claimId,
  orgId,
  type,
  title,
  body,
  createdById,
  visibleToClient = true,
}: EmitTimelineEventParams) {
  try {
    const event = await prisma.claim_timeline_events.create({
      data: {
        id: randomUUID(),
        claim_id: claimId,
        org_id: orgId || null,
        type,
        description: body || title,
        actor_id: createdById || null,
        visible_to_client: visibleToClient,
      },
    });

    return event;
  } catch (error) {
    logger.error("Failed to emit timeline event:", error);
    return null;
  }
}

/**
 * Helper functions for specific event types
 */

export async function emitPhotoUploadEvent(claimId: string, userId: string, photoCount: number) {
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: { orgId: true, assignedTo: true },
  });

  const event = await emitTimelineEvent({
    claimId,
    orgId: claim?.orgId || undefined,
    type: "PHOTO_UPLOAD",
    title: `Homeowner uploaded ${photoCount} ${photoCount === 1 ? "photo" : "photos"}`,
    body: "New photos are available in the claim files.",
    createdById: userId,
    visibleToClient: true,
  });

  try {
    if (claim?.assignedTo && claim?.orgId) {
      await prisma.projectNotification.create({
        data: {
          id: randomUUID(),
          orgId: claim.orgId,
          claimId,
          notificationType: "PHOTO_UPLOADED",
          title: `New ${photoCount === 1 ? "photo" : "photos"} uploaded`,
          message: `Homeowner uploaded ${photoCount} ${photoCount === 1 ? "photo" : "photos"} to the claim`,
        },
      });
    }
  } catch (error) {
    logger.error("Failed to create notification:", error);
  }

  return event;
}

export async function emitDocumentSharedEvent(
  claimId: string,
  userId: string,
  documentTitle: string
) {
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: { orgId: true },
  });

  const event = await emitTimelineEvent({
    claimId,
    orgId: claim?.orgId || undefined,
    type: "DOCUMENT_SHARED",
    title: "Document shared with homeowner",
    body: `"${documentTitle}" is now visible in the client portal.`,
    createdById: userId,
    visibleToClient: true,
  });

  try {
    if (claim?.orgId) {
      await prisma.projectNotification.create({
        data: {
          id: randomUUID(),
          orgId: claim.orgId,
          claimId,
          notificationType: "DOCUMENT_SHARED",
          title: "New document shared",
          message: `Contractor shared "${documentTitle}" with you`,
        },
      });
    }
  } catch (error) {
    logger.error("Failed to create notification:", error);
  }

  return event;
}

export async function emitDocumentQuestionEvent(
  claimId: string,
  userId: string,
  documentTitle: string
) {
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: { orgId: true, assignedTo: true },
  });

  const event = await emitTimelineEvent({
    claimId,
    orgId: claim?.orgId || undefined,
    type: "DOCUMENT_QUESTION",
    title: "Homeowner asked a question",
    body: `Question about "${documentTitle}" was answered by AI assistant.`,
    createdById: userId,
    visibleToClient: true,
  });

  try {
    if (claim?.assignedTo && claim?.orgId) {
      await prisma.projectNotification.create({
        data: {
          id: randomUUID(),
          orgId: claim.orgId,
          claimId,
          notificationType: "QUESTION_ANSWERED",
          title: "Homeowner asked a question",
          message: `Question about "${documentTitle}" was answered by AI`,
        },
      });
    }
  } catch (error) {
    logger.error("Failed to create notification:", error);
  }

  return event;
}

export async function emitWorkOrderEvent(claimId: string, userId: string, workType: string) {
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: { orgId: true },
  });

  return emitTimelineEvent({
    claimId,
    orgId: claim?.orgId || undefined,
    type: "WORK_ORDER",
    title: "Work order requested by homeowner",
    body: `Type: ${workType}`,
    createdById: userId,
    visibleToClient: true,
  });
}

export async function emitFileVisibilityChangedEvent(
  claimId: string,
  userId: string,
  documentTitle: string,
  nowVisible: boolean
) {
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: { orgId: true },
  });

  return emitTimelineEvent({
    claimId,
    orgId: claim?.orgId || undefined,
    type: "FILE_VISIBILITY_CHANGED",
    title: nowVisible ? "Document shared with homeowner" : "Document visibility removed",
    body: `"${documentTitle}" ${nowVisible ? "is now" : "is no longer"} visible in the portal.`,
    createdById: userId,
    visibleToClient: false,
  });
}
