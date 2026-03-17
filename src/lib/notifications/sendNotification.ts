/**
 * Send Notification
 *
 * Send notifications through various channels
 */

import { logger } from "@/lib/logger";

import { createNotification, CreateNotificationData } from "./create-notification";

export interface SendNotificationOptions {
  channels?: ("in_app" | "email" | "push")[];
  priority?: "low" | "normal" | "high" | "urgent";
}

/**
 * Send a notification to a user
 *
 * Creates in-app notification and optionally sends via other channels
 */
export async function sendNotification(
  data: CreateNotificationData,
  options: SendNotificationOptions = {}
): Promise<boolean> {
  const { channels = ["in_app"] } = options;

  try {
    // Always create in-app notification
    if (channels.includes("in_app")) {
      await createNotification(data);
    }

    // Email notifications would go here
    if (channels.includes("email")) {
      logger.debug(`[SendNotification] Would send email to user ${data.userId}`);
      // TODO: Queue email via email_queue
    }

    // Push notifications would go here
    if (channels.includes("push")) {
      logger.debug(`[SendNotification] Would send push to user ${data.userId}`);
      // TODO: Send via push service
    }

    return true;
  } catch (error) {
    logger.error("[SendNotification] Error:", error);
    return false;
  }
}

/**
 * Send notification to multiple users
 */
export async function sendNotificationToUsers(
  userIds: string[],
  data: Omit<CreateNotificationData, "userId">,
  options: SendNotificationOptions = {}
): Promise<number> {
  let successCount = 0;

  for (const userId of userIds) {
    const success = await sendNotification({ ...data, userId }, options);
    if (success) successCount++;
  }

  return successCount;
}

/**
 * Notify about signature request
 */
export async function notifySignatureRequested(
  userId: string,
  documentId: string,
  documentName: string
): Promise<boolean> {
  return sendNotification(
    {
      userId,
      type: "document_shared",
      title: "Signature Requested",
      message: `Your signature is requested on: ${documentName}`,
      data: { documentId },
    },
    { channels: ["in_app", "email"], priority: "high" }
  );
}

/**
 * Notify about document signed
 */
export async function notifyDocumentSigned(
  userId: string,
  documentId: string,
  documentName: string,
  signerId?: string
): Promise<boolean> {
  return sendNotification(
    {
      userId,
      type: "document_shared",
      title: "Document Signed",
      message: `Document "${documentName}" has been signed`,
      data: { documentId, signerId },
    },
    { channels: ["in_app", "email"], priority: "normal" }
  );
}
