/**
 * Create Notification
 *
 * Helper to create notifications in the database
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface CreateNotificationData {
  userId: string;
  type: string;
  title: string;
  body?: string;
  message?: string;
  link?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

/**
 * Create a notification for a user
 * Writes to the TradeNotification table.
 */
export async function createNotification(data: CreateNotificationData): Promise<string | null> {
  try {
    const notification = await prisma.tradeNotification.create({
      data: {
        recipientId: data.userId,
        type: data.type,
        title: data.title,
        message: data.body || data.message || null,
        actionUrl: data.link || null,
        metadata: data.metadata || data.data || {},
      },
    });
    return notification.id;
  } catch (error) {
    logger.error("[CreateNotification] Error:", error);
    return null;
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers(
  userIds: string[],
  data: Omit<CreateNotificationData, "userId">
): Promise<number> {
  try {
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        prisma.tradeNotification.create({
          data: {
            recipientId: userId,
            type: data.type,
            title: data.title,
            message: data.body || data.message || null,
            actionUrl: data.link || null,
            metadata: data.metadata || data.data || {},
          },
        })
      )
    );
    return results.filter((r) => r.status === "fulfilled").length;
  } catch (error) {
    logger.error("[CreateNotification] Bulk create error:", error);
    return 0;
  }
}
