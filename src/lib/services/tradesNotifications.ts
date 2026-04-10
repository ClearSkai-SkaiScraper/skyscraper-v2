/**
 * Trades Network Notification Service
 * Creates notifications for trade network events
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export type TradesNotificationType =
  | "trade_connection_request"
  | "trade_connection_accepted"
  | "trade_connection_declined"
  | "trade_new_opportunity"
  | "trade_profile_view"
  | "trade_review_received"
  | "trade_message_received";

interface CreateTradesNotificationParams {
  userId: string;
  type: TradesNotificationType;
  title: string;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  actionUrl?: string;
}

/**
 * Create a trades network notification
 */
export async function createTradesNotification({
  userId,
  type,
  title,
  message,
  metadata = {},
  actionUrl,
}: CreateTradesNotificationParams) {
  try {
    void metadata;
    const id = crypto.randomUUID();
    const level =
      type === "trade_connection_accepted"
        ? "success"
        : type === "trade_connection_declined"
          ? "warning"
          : "info";

    await db.query(
      `insert into notifications (id, org_id, clerk_user_id, level, title, body, link, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [id, null, userId, level, title, message, actionUrl || null]
    );

    return { id, title, message, read: false, createdAt: new Date() };
  } catch (error) {
    logger.error("Failed to create trades notification:", error);
    throw error;
  }
}

/**
 * Notify pro of new connection request
 */
export async function notifyConnectionRequest(params: {
  proClerkId: string;
  clientName: string;
  serviceType?: string;
  connectionId: string;
}) {
  return createTradesNotification({
    userId: params.proClerkId,
    type: "trade_connection_request",
    title: "New Connection Request",
    message: `${params.clientName} wants to connect${params.serviceType ? ` for ${params.serviceType}` : ""}`,
    metadata: {
      connectionId: params.connectionId,
      clientName: params.clientName,
      serviceType: params.serviceType,
    },
    actionUrl: `/dashboard/trades/connections`,
  });
}

/**
 * Notify client that connection was accepted
 */
export async function notifyConnectionAccepted(params: {
  clientClerkId: string;
  proCompanyName: string;
  connectionId: string;
  proClerkId: string;
}) {
  return createTradesNotification({
    userId: params.clientClerkId,
    type: "trade_connection_accepted",
    title: "Connection Accepted!",
    message: `${params.proCompanyName} accepted your connection request`,
    metadata: {
      connectionId: params.connectionId,
      proClerkId: params.proClerkId,
      proCompanyName: params.proCompanyName,
    },
    actionUrl: `/portal/my-contractors`,
  });
}

/**
 * Notify client that connection was declined
 */
export async function notifyConnectionDeclined(params: {
  clientClerkId: string;
  proCompanyName: string;
  connectionId: string;
}) {
  return createTradesNotification({
    userId: params.clientClerkId,
    type: "trade_connection_declined",
    title: "Connection Request Declined",
    message: `${params.proCompanyName} is not accepting new clients at this time`,
    metadata: {
      connectionId: params.connectionId,
      proCompanyName: params.proCompanyName,
    },
    actionUrl: `/portal/find-a-pro`,
  });
}

/**
 * Notify pro of new job opportunity match
 */
export async function notifyNewOpportunity(params: {
  proClerkId: string;
  jobTitle: string;
  location: string;
  opportunityId: string;
}) {
  return createTradesNotification({
    userId: params.proClerkId,
    type: "trade_new_opportunity",
    title: "New Job Opportunity",
    message: `${params.jobTitle} in ${params.location}`,
    metadata: {
      opportunityId: params.opportunityId,
      jobTitle: params.jobTitle,
      location: params.location,
    },
    actionUrl: `/dashboard/trades/opportunities`,
  });
}

/**
 * Notify client when Pro adds a file to their claim
 */
export async function notifyFileAdded(params: {
  clientClerkId: string;
  proCompanyName: string;
  fileName: string;
  claimId: string;
  fileId: string;
}) {
  return createTradesNotification({
    userId: params.clientClerkId,
    type: "trade_message_received",
    title: "New File Added",
    message: `${params.proCompanyName} uploaded ${params.fileName} to your claim`,
    metadata: {
      claimId: params.claimId,
      fileId: params.fileId,
      fileName: params.fileName,
      proCompanyName: params.proCompanyName,
    },
    actionUrl: `/portal/claims/${params.claimId}`,
  });
}

/**
 * Notify client when Pro sends them a message
 */
export async function notifyNewMessage(params: {
  clientClerkId: string;
  proCompanyName: string;
  messagePreview: string;
  threadId: string;
  claimId?: string;
}) {
  return createTradesNotification({
    userId: params.clientClerkId,
    type: "trade_message_received",
    title: "New Message",
    message: `${params.proCompanyName}: ${params.messagePreview.substring(0, 100)}`,
    metadata: {
      threadId: params.threadId,
      claimId: params.claimId,
      proCompanyName: params.proCompanyName,
    },
    actionUrl: params.claimId
      ? `/portal/claims/${params.claimId}`
      : `/portal/messages/${params.threadId}`,
  });
}

/**
 * Notify pro that someone viewed their profile
 */
export async function notifyProfileView(params: {
  proClerkId: string;
  viewerName?: string;
  viewerType: "client" | "anonymous";
}) {
  return createTradesNotification({
    userId: params.proClerkId,
    type: "trade_profile_view",
    title: "Profile View",
    message:
      params.viewerType === "client"
        ? `${params.viewerName} viewed your profile`
        : "Someone viewed your profile",
    metadata: {
      viewerName: params.viewerName,
      viewerType: params.viewerType,
    },
    actionUrl: `/dashboard/trades/profile`,
  });
}

/**
 * Notify pro of new review
 */
export async function notifyNewReview(params: {
  proClerkId: string;
  rating: number;
  clientName: string;
  reviewId: string;
}) {
  return createTradesNotification({
    userId: params.proClerkId,
    type: "trade_review_received",
    title: "New Review Received",
    message: `${params.clientName} left you a ${params.rating}-star review`,
    metadata: {
      reviewId: params.reviewId,
      rating: params.rating,
      clientName: params.clientName,
    },
    actionUrl: `/dashboard/trades/profile`,
  });
}

/**
 * Notify user of new message in trades context
 */
export async function notifyTradeMessage(params: {
  recipientClerkId: string;
  senderName: string;
  messagePreview: string;
  threadId: string;
}) {
  return createTradesNotification({
    userId: params.recipientClerkId,
    type: "trade_message_received",
    title: "New Message",
    message: `${params.senderName}: ${params.messagePreview}`,
    metadata: {
      threadId: params.threadId,
      senderName: params.senderName,
    },
    actionUrl: `/messages?thread=${params.threadId}`,
  });
}
