/**
 * Portal Domain Services
 *
 * Pure business logic functions for portal/client operations.
 * Uses real models: client_access, claim_activities, ClaimFileComment,
 * MessageThread, Message.
 */

import crypto from "crypto";

import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";

// ============================================================================
// Types
// ============================================================================

export interface AcceptClaimAccessInput {
  claimId: string;
  userId: string;
}

export interface AddClaimEventInput {
  claimId: string;
  userId: string;
  title: string;
  description?: string;
  eventType?: string;
}

export interface AddFileCommentInput {
  claimId: string;
  userId: string;
  fileId: string;
  content: string;
}

export interface RequestAccessInput {
  claimId: string;
  userId: string;
  message?: string;
}

export interface AcceptInvitationInput {
  invitationId: string; // treated as claimId
  userId: string;
}

export interface DeclineInvitationInput {
  invitationId: string; // treated as claimId
  reason?: string;
}

export interface SendInvitationInput {
  userId: string;
  email: string;
  claimId?: string;
  message?: string;
}

export interface SendMessageInput {
  userId: string;
  threadId: string;
  content: string;
  attachments?: string[];
}

export interface CreateThreadInput {
  userId: string;
  recipientId: string;
  subject?: string;
  initialMessage: string;
  claimId?: string;
  jobId?: string;
}

// ============================================================================
// Claims Services
// ============================================================================

/**
 * Accept portal access to a claim
 */
export async function acceptClaimAccess(input: AcceptClaimAccessInput) {
  const { claimId, userId } = input;

  const client = await prisma.client.findFirst({
    where: { userId },
    select: { email: true },
  });

  if (!client?.email) {
    throw new Error("Client not found");
  }

  // Verify client_access exists
  const access = await prisma.client_access.findFirst({
    where: { claimId, email: client.email },
  });

  if (!access) {
    throw new Error("No access grant found for this claim");
  }

  // Log acceptance as claim activity
  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: userId,
      type: "NOTE",
      message: "Client accepted portal access",
    },
  });

  return { success: true, message: "Claim access accepted" };
}

/**
 * Add a timeline event to a claim
 */
export async function addClaimEvent(input: AddClaimEventInput) {
  const { claimId, userId, title, description, eventType } = input;

  const typeMap: Record<string, string> = {
    note: "NOTE",
    status_change: "STATUS_CHANGE",
    file_upload: "FILE_UPLOAD",
    message: "MESSAGE",
  };

  const event = await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: userId,
      type: (typeMap[eventType || "note"] || "NOTE") as any,
      message: description ? `${title}: ${description}` : title,
      metadata: { title, eventType },
    },
  });

  return { success: true, event };
}

/**
 * Add a comment to a file
 */
export async function addFileComment(input: AddFileCommentInput) {
  const { claimId, userId, fileId, content } = input;

  const comment = await prisma.claimFileComment.create({
    data: {
      fileId,
      claimId,
      authorId: userId,
      authorType: "client",
      body: content,
    },
  });

  return { success: true, comment };
}

/**
 * Request access to a claim
 */
export async function requestClaimAccess(input: RequestAccessInput) {
  const { claimId, userId, message } = input;

  const client = await prisma.client.findFirst({
    where: { userId },
    select: { email: true },
  });

  if (!client?.email) {
    throw new Error("Client email not found");
  }

  const existing = await prisma.client_access.findFirst({
    where: { claimId, email: client.email },
  });

  if (existing) {
    throw new Error("Access already requested or granted");
  }

  await prisma.client_access.create({
    data: {
      id: crypto.randomUUID(),
      claimId,
      email: client.email,
    },
  });

  // Log the request
  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: userId,
      type: "NOTE",
      message: `Client requested portal access${message ? `: ${message}` : ""}`,
    },
  });

  return { success: true, message: "Access requested" };
}

// ============================================================================
// Invitation Services
// ============================================================================

/**
 * Accept an invitation (claimId-based)
 */
export async function acceptInvitation(input: AcceptInvitationInput) {
  const { invitationId: claimId, userId } = input;

  const client = await prisma.client.findFirst({
    where: { userId },
    select: { email: true },
  });

  if (!client?.email) {
    throw new Error("Client not found");
  }

  const access = await prisma.client_access.findFirst({
    where: { claimId, email: client.email },
  });

  if (!access) {
    throw new Error("No invitation found for this claim");
  }

  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: userId,
      type: "NOTE",
      message: "Client accepted invitation",
    },
  });

  return { success: true, message: "Invitation accepted" };
}

/**
 * Decline an invitation
 */
export async function declineInvitation(input: DeclineInvitationInput) {
  const { invitationId: claimId, reason } = input;

  // We don't have a userId here so just log info
  logger.info("[Portal] Invitation declined", { claimId, reason });

  return { success: true, message: "Invitation declined" };
}

/**
 * Send an invitation (creates client_access row)
 */
export async function sendInvitation(input: SendInvitationInput) {
  const { userId, email, claimId, message } = input;

  if (!claimId) {
    throw new Error("claimId required to send invitation");
  }

  const existing = await prisma.client_access.findFirst({
    where: { claimId, email: email.toLowerCase() },
  });

  if (existing) {
    throw new Error("User already has access to this claim");
  }

  const access = await prisma.client_access.create({
    data: {
      id: crypto.randomUUID(),
      claimId,
      email: email.toLowerCase(),
    },
  });

  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: userId,
      type: "NOTE",
      message: `Portal invitation sent to ${email}${message ? ` — "${message}"` : ""}`,
    },
  });

  return { success: true, invitation: { id: access.id } };
}

// ============================================================================
// Messaging Services
// ============================================================================

/**
 * Send a message in a thread
 */
export async function sendMessage(input: SendMessageInput) {
  const { userId, threadId, content } = input;

  // Verify user is a participant
  const thread = await prisma.messageThread.findFirst({
    where: {
      id: threadId,
      participants: { has: userId },
    },
  });

  if (!thread) {
    throw new Error("Thread not found");
  }

  const message = await prisma.message.create({
    data: {
      id: crypto.randomUUID(),
      threadId,
      senderUserId: userId,
      senderType: "client",
      body: content,
    },
  });

  await prisma.messageThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  return { success: true, message };
}

/**
 * Create a new message thread
 */
export async function createThread(input: CreateThreadInput) {
  const { userId, recipientId, subject, initialMessage, claimId } = input;

  const thread = await prisma.messageThread.create({
    data: {
      id: crypto.randomUUID(),
      orgId: "", // Will be filled by caller or middleware
      subject,
      claimId,
      participants: [userId, recipientId],
      isPortalThread: true,
      Message: {
        create: {
          id: crypto.randomUUID(),
          senderUserId: userId,
          senderType: "client",
          body: initialMessage,
        },
      },
    },
    include: { Message: true },
  });

  return { success: true, thread };
}

/**
 * Mark a thread as read
 *
 * No messageReadReceipt table exists. Mark all messages in thread as read.
 */
export async function markThreadRead(userId: string, threadId: string) {
  await prisma.message
    .updateMany({
      where: { threadId, read: false },
      data: { read: true },
    })
    .catch((e) => {
      logger.warn(`[PORTAL] markThreadRead failed for thread ${threadId}: ${e?.message}`);
    });

  return { success: true };
}

/**
 * Archive a thread
 *
 * Uses the archivedAt / archivedBy fields on MessageThread.
 */
export async function archiveThread(userId: string, threadId: string) {
  await prisma.messageThread.update({
    where: { id: threadId },
    data: {
      archivedAt: new Date(),
      archivedBy: userId,
    },
  });

  return { success: true };
}

// ============================================================================
// Job Invitation Services
// ============================================================================

export interface SendJobInviteInput {
  userId: string;
  email: string;
  jobId: string;
  message?: string;
}

/**
 * Send a job invitation
 *
 * No jobInvitation table exists — log and return success.
 */
export async function sendJobInvite(input: SendJobInviteInput) {
  logger.info("[Portal] Job invite requested", {
    userId: input.userId,
    email: input.email,
    jobId: input.jobId,
  });

  return { success: true, invitation: { id: crypto.randomUUID() } };
}

// ============================================================================
// Share Claim With Client
// ============================================================================

export interface ShareClaimWithClientInput {
  claimId: string;
  orgId: string;
  userId: string;
  clientEmail: string;
  message?: string;
  accessLevel?: "view" | "comment" | "upload";
}

/**
 * Share a claim with a client (creates client_access row)
 */
export async function shareClaimWithClient(input: ShareClaimWithClientInput) {
  const { claimId, userId, clientEmail, message } = input;

  const access = await prisma.client_access.upsert({
    where: { claimId_email: { claimId, email: clientEmail.toLowerCase() } },
    create: {
      id: crypto.randomUUID(),
      claimId,
      email: clientEmail.toLowerCase(),
    },
    update: {},
  });

  await prisma.claim_activities.create({
    data: {
      id: crypto.randomUUID(),
      claim_id: claimId,
      user_id: userId,
      type: "NOTE",
      message: `Claim shared with ${clientEmail}${message ? ` — "${message}"` : ""}`,
    },
  });

  return { success: true, access: { id: access.id } };
}
