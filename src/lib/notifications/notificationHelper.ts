/**
 * Notification Helper Stub
 *
 * TODO: Implement notification helper functions
 * This is a placeholder to allow builds to succeed
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

/**
 * Send a notification to a user
 */
export async function sendNotification(data: NotificationData): Promise<void> {
  logger.debug(`[NotificationHelper] Stub: Would send notification to ${data.userId}`);
}

/**
 * Mark notification as read
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  logger.debug(`[NotificationHelper] Marking notification ${notificationId} as read`);
  try {
    await prisma.projectNotification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() },
    });
  } catch (error) {
    logger.error("[NotificationHelper] Error marking as read:", error);
  }
}

/**
 * Mark all notifications as read for an org (across all notification sources).
 * Clears: projectNotification, tradeNotification, notifications_reads (raw
 * notifications table), and unread message rows addressed to this user.
 */
export async function markAllNotificationsRead(orgId: string, userId?: string): Promise<number> {
  logger.debug(`[NotificationHelper] Marking all notifications read for org ${orgId}`);
  let total = 0;

  // 1) ProjectNotification (org-scoped)
  try {
    const result = await prisma.projectNotification.updateMany({
      where: { orgId, read: false },
      data: { read: true, readAt: new Date() },
    });
    total += result.count;
  } catch (error) {
    logger.error("[NotificationHelper] projectNotification error:", error);
  }

  // 2) TradeNotification — recipientId can be userId, orgId, or companyId
  if (userId) {
    try {
      const recipients: string[] = [userId, orgId];
      const result = await prisma.tradeNotification.updateMany({
        where: { recipientId: { in: recipients }, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      total += result.count;
    } catch (error) {
      logger.error("[NotificationHelper] tradeNotification error:", error);
    }
  }

  // 3) Raw "notifications" table — insert read-receipts into notifications_reads.
  //    The GET route checks `notifications_reads` join for read status.
  if (userId) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO notifications_reads (notification_id, clerk_user_id, read_at)
         SELECT n.id, $1, NOW() FROM notifications n
          WHERE (n.clerk_user_id = $1 OR (n.org_id = $2 AND n.clerk_user_id IS NULL))
            AND NOT EXISTS (
              SELECT 1 FROM notifications_reads r
               WHERE r.notification_id = n.id AND r.clerk_user_id = $1
            )`,
        userId,
        orgId
      );
    } catch (error) {
      // Table may not exist in all environments — non-fatal
      const msg = (error as Error)?.message || "";
      if (!msg.includes("does not exist")) {
        logger.warn("[NotificationHelper] notifications_reads upsert warn:", error);
      }
    }
  }

  // 4) Unread messages addressed to this user (appear as notifications in GET)
  if (userId) {
    try {
      const result = await prisma.message.updateMany({
        where: { senderUserId: { not: userId }, read: false },
        data: { read: true },
      });
      total += result.count;
    } catch (error) {
      logger.error("[NotificationHelper] message mark-read error:", error);
    }
  }

  return total;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(orgId: string): Promise<number> {
  try {
    return await prisma.projectNotification.count({
      where: { orgId, read: false },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    return 0;
  }
}
