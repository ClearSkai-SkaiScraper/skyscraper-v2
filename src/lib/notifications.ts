// MODULE 2: Notifications - Helper functions
import { v4 as uuidv4 } from "uuid";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

type NotificationType =
  | "message"
  | "timeline"
  | "document"
  | "approval"
  | "service_request"
  | "trade_review";

interface CreateNotificationArgs {
  orgId: string;
  claimId: string;
  notificationType: NotificationType;
  title: string;
  body: string;
}

export async function createNotification(args: CreateNotificationArgs) {
  return await prisma.projectNotification.create({
    data: {
      id: uuidv4(),
      orgId: args.orgId,
      claimId: args.claimId,
      notificationType: args.notificationType,
      title: args.title,
      message: args.body,
      read: false,
    },
  });
}

export async function getUnreadCount(orgId: string): Promise<number> {
  return await prisma.projectNotification.count({
    where: {
      orgId,
      read: false,
    },
  });
}

export async function markAsRead(notificationId: string, orgId: string): Promise<boolean> {
  try {
    await prisma.projectNotification.updateMany({
      where: {
        id: notificationId,
        orgId, // security: ensure org owns this notification
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function markAllAsRead(orgId: string): Promise<number> {
  const result = await prisma.projectNotification.updateMany({
    where: {
      orgId,
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });
  return result.count;
}

// Legacy notification engine stubs (Phase 1 MVP)
export type NotificationTrigger =
  | { type: "claim_update"; claimId: string; message: string }
  | { type: "document_added"; claimId: string; documentTitle: string }
  | { type: "claim_status_change"; claimId: string; status: string }
  | { type: "message_received"; claimId: string; body: string };

export async function enqueueNotification(trigger: NotificationTrigger) {
  logger.debug(`[notify] ${trigger.type}`, trigger as any);
}
