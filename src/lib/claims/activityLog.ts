/**
 * Claim Activity Log Helper
 * Tracks all events on a claim for audit trail
 */

import { nanoid } from "nanoid";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type ActivityEventType =
  | "claim_created"
  | "file_uploaded"
  | "message_added"
  | "status_changed"
  | "adjuster_note_added"
  | "contractor_updated"
  | "client_portal_viewed"
  | "report_generated"
  | "estimate_added"
  | "supplement_created"
  | "document_shared"
  | "review_submitted"
  | "task_created"
  | "task_completed";

export interface LogActivityParams {
  claimId: string;
  type: ActivityEventType;
  title: string;
  body?: string;
  createdById?: string;
  visibleToClient?: boolean;
}

/**
 * Activity event returned with normalized fields
 */
export interface ActivityEvent {
  id: string;
  claim_id: string;
  type: string;
  title: string;
  body?: string | null;
  createdAt: Date;
  visibleToClient: boolean;
  actorId?: string | null;
}

/**
 * Log an activity event to the claim timeline
 */
export async function logClaimActivity(params: LogActivityParams) {
  const { claimId, type, title, body, createdById, visibleToClient = true } = params;

  try {
    const event = await prisma.claim_timeline_events.create({
      data: {
        id: nanoid(),
        claim_id: claimId,
        type,
        description: body ?? title,
        actor_id: createdById,
        visible_to_client: visibleToClient,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: { title } as unknown as any,
      },
    });

    logger.debug(`[CLAIM_ACTIVITY_LOGGED] ${type} for claim ${claimId}`);
    return event;
  } catch (error) {
    logger.error("[LOG_ACTIVITY_ERROR]", error);
    return null;
  }
}

/**
 * Get activity log for a claim
 */
export async function getClaimActivity(
  claimId: string,
  includeHidden = false
): Promise<ActivityEvent[]> {
  try {
    const events = await prisma.claim_timeline_events.findMany({
      where: {
        claim_id: claimId,
        ...(includeHidden ? {} : { visible_to_client: true }),
      },
      orderBy: { occurred_at: "desc" },
    });

    // Normalize to expected shape for UI
    return events.map((e) => ({
      id: e.id,
      claim_id: e.claim_id,
      type: e.type,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      title: (e.metadata as any)?.title ?? e.type,
      body: e.description,
      createdAt: e.occurred_at,
      visibleToClient: e.visible_to_client,
      actorId: e.actor_id,
    }));
  } catch (error) {
    logger.error("[GET_ACTIVITY_ERROR]", error);
    return [];
  }
}
