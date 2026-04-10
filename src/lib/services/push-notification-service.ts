/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Push Notification Service
 * Handles web push notifications for network activity
 * Supports subscription management, sending notifications, and tracking
 */

// web-push is optional - if not installed, push notifications will be disabled
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webpush: any = null;
try {
  webpush = require("web-push");
} catch {
  logger.debug("web-push not installed - push notifications disabled");
}

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Configure web-push (these should be set in environment)
// eslint-disable-next-line no-restricted-syntax
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
// eslint-disable-next-line no-restricted-syntax
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
// eslint-disable-next-line no-restricted-syntax
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:support@skaiscrape.com";

// Only configure VAPID if keys are valid (non-empty and proper format)
// VAPID keys must be URL-safe base64 without "=" padding
function isValidVapidKey(key: string): boolean {
  if (!key || key.length < 10) return false;
  // Check for URL-safe base64 format (no =, +, or /)
  return /^[A-Za-z0-9_-]+$/.test(key);
}

let vapidConfigured = false;
if (webpush && isValidVapidKey(VAPID_PUBLIC_KEY) && isValidVapidKey(VAPID_PRIVATE_KEY)) {
  try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  } catch (error) {
    logger.warn("Failed to configure VAPID keys:", error);
  }
}

// Notification types
export type NotificationType =
  | "new_message"
  | "new_connection"
  | "connection_accepted"
  | "new_review"
  | "claim_update"
  | "project_update"
  | "mention"
  | "like"
  | "comment"
  | "system";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
  actions?: { action: string; title: string; icon?: string }[];
  tag?: string;
  requireInteraction?: boolean;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  /**
   * Subscribe a user to push notifications
   */
  async subscribe(
    userId: string,
    subscription: PushSubscriptionData,
    deviceInfo?: { userAgent?: string; platform?: string }
  ): Promise<{ success: boolean; subscriptionId?: string }> {
    try {
      // Check if subscription already exists
      const existing = (await prisma.$queryRaw`
        SELECT id FROM push_subscriptions 
        WHERE endpoint = ${subscription.endpoint}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `) as any[];

      if (existing.length > 0) {
        // Update existing subscription
        await prisma.$queryRaw`
          UPDATE push_subscriptions 
          SET 
            user_id = ${userId},
            p256dh = ${subscription.keys.p256dh},
            auth = ${subscription.keys.auth},
            user_agent = ${deviceInfo?.userAgent || null},
            platform = ${deviceInfo?.platform || null},
            active = true
          WHERE endpoint = ${subscription.endpoint}
        `;
        return { success: true, subscriptionId: existing[0].id };
      }

      // Create new subscription
      const result = (await prisma.$queryRaw`
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, platform)
        VALUES (${userId}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}, ${deviceInfo?.userAgent || null}, ${deviceInfo?.platform || null})
        RETURNING id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `) as any[];

      return { success: true, subscriptionId: result[0].id };
    } catch (error) {
      logger.error("Error subscribing to push:", error);
      return { success: false };
    }
  }

  /**
   * Unsubscribe a user from push notifications
   */
  async unsubscribe(endpoint: string): Promise<{ success: boolean }> {
    try {
      await prisma.$queryRaw`
        UPDATE push_subscriptions 
        SET active = false
        WHERE endpoint = ${endpoint}
      `;
      return { success: true };
    } catch (error) {
      logger.error("Error unsubscribing from push:", error);
      return { success: false };
    }
  }

  /**
   * Send a push notification to a specific user
   */
  async sendToUser(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; sent: number }> {
    try {
      if (!webpush || !vapidConfigured) {
        logger.warn("Web push not configured, storing notification only");
        // Still store the notification even if we can't send push
        await this.storeNotification(userId, payload);
        return { success: true, sent: 0 };
      }

      // Get all active subscriptions for user
      const subscriptions = (await prisma.$queryRaw`
        SELECT id, endpoint, p256dh, auth 
        FROM push_subscriptions 
        WHERE user_id = ${userId} AND active = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `) as any[];

      if (subscriptions.length === 0) {
        return { success: true, sent: 0 };
      }

      // Store notification in database
      await this.storeNotification(userId, payload);

      // Send to all subscriptions
      let sent = 0;
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              icon: payload.icon || "/icons/icon-192x192.png",
              badge: payload.badge || "/icons/badge-72x72.png",
              image: payload.image,
              data: {
                ...payload.data,
                type: payload.type,
                timestamp: Date.now(),
              },
              actions: payload.actions,
              tag: payload.tag,
              requireInteraction: payload.requireInteraction,
            })
          );
          sent++;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          // If subscription is no longer valid, deactivate it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await this.unsubscribe(sub.endpoint);
          }
          logger.error("Error sending push to subscription:", error);
        }
      }

      return { success: true, sent };
    } catch (error) {
      logger.error("Error sending push notification:", error);
      return { success: false, sent: 0 };
    }
  }

  /**
   * Send a push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<{ success: boolean; sent: number }> {
    let totalSent = 0;
    for (const userId of userIds) {
      const result = await this.sendToUser(userId, payload);
      totalSent += result.sent;
    }
    return { success: true, sent: totalSent };
  }

  /**
   * Store notification in database (for notification center)
   */
  async storeNotification(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      await prisma.$queryRaw`
        INSERT INTO user_notifications (user_id, type, title, body, metadata)
        VALUES (${userId}, ${payload.type}, ${payload.title}, ${payload.body}, ${JSON.stringify(payload.data || {})}::jsonb)
      `;
    } catch (error) {
      logger.error("Error storing notification:", error);
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    const { limit = 50, offset = 0, unreadOnly = false } = options;

    try {
      const notifications = (await prisma.$queryRaw`
        SELECT 
          id,
          type,
          title,
          body,
          metadata as "data",
          read as "isRead",
          created_at as "createdAt"
        FROM user_notifications
        WHERE user_id = ${userId}
        ${unreadOnly ? "AND read = false" : ""}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `) as any[];

      return notifications;
    } catch (error) {
      logger.error("Error getting notifications:", error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.$queryRaw`
        UPDATE user_notifications 
        SET read = true, read_at = NOW()
        WHERE id = ${notificationId} AND user_id = ${userId}
      `;
    } catch (error) {
      logger.error("Error marking notification as read:", error);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await prisma.$queryRaw`
        UPDATE user_notifications 
        SET read = true, read_at = NOW()
        WHERE user_id = ${userId} AND read = false
      `;
    } catch (error) {
      logger.error("Error marking all notifications as read:", error);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = (await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM user_notifications
        WHERE user_id = ${userId} AND read = false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `) as any[];
      return parseInt(result[0]?.count || "0", 10);
    } catch (error) {
      logger.error("Error getting unread count:", error);
      return 0;
    }
  }

  /**
   * Send notification for new message
   */
  async notifyNewMessage(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    conversationId: string
  ): Promise<void> {
    await this.sendToUser(recipientId, {
      type: "new_message",
      title: `New message from ${senderName}`,
      body: messagePreview.substring(0, 100),
      data: { conversationId },
      actions: [
        { action: "reply", title: "Reply" },
        { action: "view", title: "View" },
      ],
      tag: `message-${conversationId}`,
    });
  }

  /**
   * Send notification for new connection request
   */
  async notifyConnectionRequest(
    recipientId: string,
    senderName: string,
    senderId: string
  ): Promise<void> {
    await this.sendToUser(recipientId, {
      type: "new_connection",
      title: "New Connection Request",
      body: `${senderName} wants to connect with you`,
      data: { senderId },
      actions: [
        { action: "accept", title: "Accept" },
        { action: "view", title: "View Profile" },
      ],
      tag: `connection-${senderId}`,
    });
  }

  /**
   * Send notification for connection accepted
   */
  async notifyConnectionAccepted(
    recipientId: string,
    senderName: string,
    senderId: string
  ): Promise<void> {
    await this.sendToUser(recipientId, {
      type: "connection_accepted",
      title: "Connection Accepted",
      body: `${senderName} accepted your connection request`,
      data: { senderId },
      tag: `connection-accepted-${senderId}`,
    });
  }

  /**
   * Send notification for new review
   */
  async notifyNewReview(
    recipientId: string,
    reviewerName: string,
    rating: number,
    reviewId: string
  ): Promise<void> {
    await this.sendToUser(recipientId, {
      type: "new_review",
      title: "New Review",
      body: `${reviewerName} left you a ${rating}-star review`,
      data: { reviewId, rating },
      tag: `review-${reviewId}`,
    });
  }

  /**
   * Send notification for claim update
   */
  async notifyClaimUpdate(
    recipientId: string,
    claimNumber: string,
    status: string,
    claimId: string
  ): Promise<void> {
    await this.sendToUser(recipientId, {
      type: "claim_update",
      title: "Claim Update",
      body: `Claim #${claimNumber} status updated to: ${status}`,
      data: { claimId, claimNumber, status },
      tag: `claim-${claimId}`,
    });
  }

  /**
   * Send notification for post like
   */
  async notifyPostLike(recipientId: string, likerName: string, postId: string): Promise<void> {
    await this.sendToUser(recipientId, {
      type: "like",
      title: "New Like",
      body: `${likerName} liked your post`,
      data: { postId },
      tag: `like-${postId}`,
    });
  }

  /**
   * Send notification for post comment
   */
  async notifyPostComment(
    recipientId: string,
    commenterName: string,
    commentPreview: string,
    postId: string
  ): Promise<void> {
    await this.sendToUser(recipientId, {
      type: "comment",
      title: "New Comment",
      body: `${commenterName}: ${commentPreview.substring(0, 80)}`,
      data: { postId },
      tag: `comment-${postId}`,
    });
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

// Export helper functions
export const sendPushToUser = pushNotificationService.sendToUser.bind(pushNotificationService);
export const sendPushToUsers = pushNotificationService.sendToUsers.bind(pushNotificationService);
export const subscribeToPush = pushNotificationService.subscribe.bind(pushNotificationService);
export const unsubscribeFromPush =
  pushNotificationService.unsubscribe.bind(pushNotificationService);
