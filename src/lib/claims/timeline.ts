/**
 * Helper functions to auto-generate timeline events for claims
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface TimelineEventInput {
  claimId: string;
  type: string;
  title: string;
  body?: string;
  createdById?: string;
  visibleToClient?: boolean;
}

/**
 * Create a timeline event (best-effort, won't throw)
 */
export async function createTimelineEvent(input: TimelineEventInput) {
  try {
    await prisma.claim_timeline_events.create({
      data: {
        id: crypto.randomUUID(),
        claim_id: input.claimId,
        actor_id: input.createdById || null,
        type: input.type,
        description: input.title + (input.body ? `: ${input.body}` : ""),
        visible_to_client: input.visibleToClient ?? true,
      },
    });
  } catch (error) {
    // Log but don't fail the main operation
    logger.error("[Timeline] Failed to create event:", error);
  }
}

/**
 * Auto-generate event when AI Damage Builder runs
 */
export async function logDamageBuilderEvent(claimId: string, userId?: string) {
  await createTimelineEvent({
    claimId,
    createdById: userId,
    type: "ai_damage_ran",
    title: "AI Damage Report Generated",
    body: "Automated damage assessment completed using AI analysis",
    visibleToClient: true,
  });
}

/**
 * Auto-generate event when Weather Verification runs
 */
export async function logWeatherVerificationEvent(claimId: string, userId?: string) {
  await createTimelineEvent({
    claimId,
    createdById: userId,
    type: "weather_report_generated",
    title: "Weather Verification Completed",
    body: "Storm data verified and weather report generated",
    visibleToClient: true,
  });
}

/**
 * Auto-generate event when photos are uploaded
 */
export async function logPhotoUploadEvent(claimId: string, photoCount: number, userId?: string) {
  await createTimelineEvent({
    claimId,
    createdById: userId,
    type: "photo_uploaded",
    title: `${photoCount} Photo${photoCount > 1 ? "s" : ""} Uploaded`,
    body: `${photoCount} new photo${photoCount > 1 ? "s were" : " was"} added to this claim`,
    visibleToClient: true,
  });
}

/**
 * Auto-generate event when a document/report is generated
 */
export async function logDocumentGeneratedEvent(
  claimId: string,
  documentType: string,
  userId?: string
) {
  await createTimelineEvent({
    claimId,
    createdById: userId,
    type: "document_generated",
    title: `${documentType} Generated`,
    body: `A new ${documentType.toLowerCase()} has been created for this claim`,
    visibleToClient: true,
  });
}

/**
 * Auto-generate event when claim status changes
 */
export async function logStatusChangeEvent(
  claimId: string,
  oldStatus: string,
  newStatus: string,
  userId?: string
) {
  await createTimelineEvent({
    claimId,
    createdById: userId,
    type: "status_change",
    title: "Claim Status Updated",
    body: `Status changed from ${oldStatus} to ${newStatus}`,
    visibleToClient: true,
  });
}
