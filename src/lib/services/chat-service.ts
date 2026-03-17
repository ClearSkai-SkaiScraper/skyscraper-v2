/**
 * Chat Service
 * Handles real-time chat between clients and pros
 * Supports conversations, messages, read receipts, and typing indicators
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import { pushNotificationService } from "./push-notification-service";

export interface Participant {
  userId: string;
  role: "client" | "pro";
  name: string;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "client" | "pro";
  content: string;
  messageType: "text" | "image" | "file" | "system";
  attachments?: { url: string; name: string; type: string; size: number }[] | null;
  isRead?: boolean;
  readAt?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: "direct" | "claim" | "project";
  referenceId?: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Raw query result: row with just an id */
interface IdRow {
  id: string;
}

/** Raw query result: conversation metadata */
interface ConversationQueryRow {
  id: string;
  type: "direct" | "claim" | "project";
  referenceId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Raw query result: message row */
interface MessageQueryRow {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "client" | "pro";
  content: string;
  messageType: "text" | "image" | "file" | "system";
  attachments?: { url: string; name: string; type: string; size: number }[] | null;
  createdAt: string;
  isRead?: boolean;
  readAt?: string;
}

/** Raw query result: count aggregate */
interface CountRow {
  count: string;
}

/** Raw query result: participant with userId + name */
interface ParticipantIdNameRow {
  userId: string;
  name: string;
}

/** Raw query result: name only */
interface NameRow {
  name: string;
}

class ChatService {
  /**
   * Create a new conversation
   */
  async createConversation(
    type: "direct" | "claim" | "project",
    participants: Participant[],
    referenceId?: string
  ): Promise<{ success: boolean; conversationId?: string }> {
    try {
      // Check if direct conversation already exists between these participants
      if (type === "direct" && participants.length === 2) {
        const existing = await this.findDirectConversation(
          participants[0].userId,
          participants[1].userId
        );
        if (existing) {
          return { success: true, conversationId: existing.id };
        }
      }

      // Create conversation
      const result = (await prisma.$queryRaw`
        INSERT INTO chat_conversations (type, reference_id)
        VALUES (${type}, ${referenceId || null})
        RETURNING id
      `) as IdRow[];

      const conversationId = result[0].id;

      // Add participants
      for (const participant of participants) {
        await prisma.$queryRaw`
          INSERT INTO chat_conversation_participants (conversation_id, user_id, role, name, avatar_url)
          VALUES (${conversationId}, ${participant.userId}, ${participant.role}, ${participant.name}, ${participant.avatarUrl || null})
        `;
      }

      return { success: true, conversationId };
    } catch (error) {
      logger.error("Error creating conversation:", error);
      return { success: false };
    }
  }

  /**
   * Find existing direct conversation between two users
   */
  async findDirectConversation(user1Id: string, user2Id: string): Promise<Conversation | null> {
    try {
      const result = (await prisma.$queryRaw`
        SELECT c.id
        FROM chat_conversations c
        WHERE c.type = 'direct'
        AND EXISTS (
          SELECT 1 FROM chat_conversation_participants p1 
          WHERE p1.conversation_id = c.id AND p1.user_id = ${user1Id}
        )
        AND EXISTS (
          SELECT 1 FROM chat_conversation_participants p2 
          WHERE p2.conversation_id = c.id AND p2.user_id = ${user2Id}
        )
        LIMIT 1
      `) as IdRow[];

      if (result.length === 0) return null;

      return this.getConversation(result[0].id, user1Id);
    } catch (error) {
      logger.error("Error finding direct conversation:", error);
      return null;
    }
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    try {
      const convoResult = (await prisma.$queryRaw`
        SELECT 
          c.id,
          c.type,
          c.reference_id as "referenceId",
          c.created_at as "createdAt",
          c.updated_at as "updatedAt"
        FROM chat_conversations c
        WHERE c.id = ${conversationId}
        AND EXISTS (
          SELECT 1 FROM chat_conversation_participants p 
          WHERE p.conversation_id = c.id AND p.user_id = ${userId}
        )
        LIMIT 1
      `) as ConversationQueryRow[];

      if (convoResult.length === 0) return null;

      const convo = convoResult[0];

      // Get participants
      const participants = (await prisma.$queryRaw`
        SELECT user_id as "userId", role, name, avatar_url as "avatarUrl"
        FROM chat_conversation_participants
        WHERE conversation_id = ${conversationId}
      `) as Participant[];

      // Get last message
      const lastMessageResult = (await prisma.$queryRaw`
        SELECT 
          id,
          conversation_id as "conversationId",
          sender_id as "senderId",
          sender_role as "senderRole",
          content,
          message_type as "messageType",
          attachments,
          created_at as "createdAt"
        FROM chat_messages
        WHERE conversation_id = ${conversationId}
        ORDER BY created_at DESC
        LIMIT 1
      `) as MessageQueryRow[];

      // Get unread count
      const unreadResult = (await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM chat_messages m
        WHERE m.conversation_id = ${conversationId}
        AND m.sender_id != ${userId}
        AND NOT EXISTS (
          SELECT 1 FROM chat_read_receipts r 
          WHERE r.message_id = m.id AND r.user_id = ${userId}
        )
      `) as CountRow[];

      return {
        ...convo,
        participants,
        lastMessage: lastMessageResult[0] || undefined,
        unreadCount: parseInt(unreadResult[0]?.count || "0", 10),
      };
    } catch (error) {
      logger.error("Error getting conversation:", error);
      return null;
    }
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const convoIds = (await prisma.$queryRaw`
        SELECT conversation_id as id
        FROM chat_conversation_participants
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `) as IdRow[];

      const conversations: Conversation[] = [];
      for (const { id } of convoIds) {
        const convo = await this.getConversation(id, userId);
        if (convo) conversations.push(convo);
      }

      // Sort by last message time
      return conversations.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.updatedAt;
        const bTime = b.lastMessage?.createdAt || b.updatedAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    } catch (error) {
      logger.error("Error getting conversations:", error);
      return [];
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: "client" | "pro",
    content: string,
    messageType: "text" | "image" | "file" | "system" = "text",
    attachments?: { url: string; name: string; type: string; size: number }[]
  ): Promise<{ success: boolean; message?: Message }> {
    try {
      // Verify sender is participant
      const isParticipant = (await prisma.$queryRaw`
        SELECT 1 FROM chat_conversation_participants
        WHERE conversation_id = ${conversationId} AND user_id = ${senderId}
      `) as Record<string, unknown>[];

      if (isParticipant.length === 0) {
        return { success: false };
      }

      // Insert message
      const result = (await prisma.$queryRaw`
        INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content, message_type, attachments)
        VALUES (${conversationId}, ${senderId}, ${senderRole}, ${content}, ${messageType}, ${JSON.stringify(attachments || [])}::jsonb)
        RETURNING 
          id,
          conversation_id as "conversationId",
          sender_id as "senderId",
          sender_role as "senderRole",
          content,
          message_type as "messageType",
          attachments,
          created_at as "createdAt"
      `) as MessageQueryRow[];

      const message = result[0];

      // Update conversation timestamp
      await prisma.$queryRaw`
        UPDATE chat_conversations SET updated_at = NOW() WHERE id = ${conversationId}
      `;

      // Notify other participants
      const otherParticipants = (await prisma.$queryRaw`
        SELECT p.user_id as "userId", p.name
        FROM chat_conversation_participants p
        WHERE p.conversation_id = ${conversationId} AND p.user_id != ${senderId}
      `) as ParticipantIdNameRow[];

      const senderParticipant = (await prisma.$queryRaw`
        SELECT name FROM chat_conversation_participants
        WHERE conversation_id = ${conversationId} AND user_id = ${senderId}
      `) as NameRow[];

      const senderName = senderParticipant[0]?.name || "Someone";

      for (const participant of otherParticipants) {
        await pushNotificationService.notifyNewMessage(
          participant.userId,
          senderName,
          content,
          conversationId
        );
      }

      return {
        success: true,
        message: {
          ...message,
          attachments: message.attachments || [],
          isRead: false,
        },
      };
    } catch (error) {
      logger.error("Error sending message:", error);
      return { success: false };
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    options: { limit?: number; before?: string } = {}
  ): Promise<Message[]> {
    const { limit = 50, before } = options;

    try {
      // Verify user is participant
      const isParticipant = (await prisma.$queryRaw`
        SELECT 1 FROM chat_conversation_participants
        WHERE conversation_id = ${conversationId} AND user_id = ${userId}
      `) as Record<string, unknown>[];

      if (isParticipant.length === 0) {
        return [];
      }

      let messages: MessageQueryRow[];
      if (before) {
        messages = (await prisma.$queryRaw`
          SELECT 
            m.id,
            m.conversation_id as "conversationId",
            m.sender_id as "senderId",
            m.sender_role as "senderRole",
            m.content,
            m.message_type as "messageType",
            m.attachments,
            m.created_at as "createdAt",
            CASE WHEN r.id IS NOT NULL THEN true ELSE false END as "isRead",
            r.read_at as "readAt"
          FROM chat_messages m
          LEFT JOIN chat_read_receipts r ON r.message_id = m.id AND r.user_id = ${userId}
          WHERE m.conversation_id = ${conversationId}
          AND m.created_at < ${before}
          ORDER BY m.created_at DESC
          LIMIT ${limit}
        `) as MessageQueryRow[];
      } else {
        messages = (await prisma.$queryRaw`
          SELECT 
            m.id,
            m.conversation_id as "conversationId",
            m.sender_id as "senderId",
            m.sender_role as "senderRole",
            m.content,
            m.message_type as "messageType",
            m.attachments,
            m.created_at as "createdAt",
            CASE WHEN r.id IS NOT NULL THEN true ELSE false END as "isRead",
            r.read_at as "readAt"
          FROM chat_messages m
          LEFT JOIN chat_read_receipts r ON r.message_id = m.id AND r.user_id = ${userId}
          WHERE m.conversation_id = ${conversationId}
          ORDER BY m.created_at DESC
          LIMIT ${limit}
        `) as MessageQueryRow[];
      }

      return messages.reverse().map((m) => ({
        ...m,
        attachments: m.attachments || [],
      }));
    } catch (error) {
      logger.error("Error getting messages:", error);
      return [];
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string, messageIds?: string[]): Promise<void> {
    try {
      if (messageIds && messageIds.length > 0) {
        // Mark specific messages
        for (const messageId of messageIds) {
          await prisma.$queryRaw`
            INSERT INTO chat_read_receipts (message_id, user_id)
            VALUES (${messageId}, ${userId})
            ON CONFLICT (message_id, user_id) DO NOTHING
          `;
        }
      } else {
        // Mark all unread messages in conversation
        await prisma.$queryRaw`
          INSERT INTO chat_read_receipts (message_id, user_id)
          SELECT m.id, ${userId}
          FROM chat_messages m
          WHERE m.conversation_id = ${conversationId}
          AND m.sender_id != ${userId}
          AND NOT EXISTS (
            SELECT 1 FROM chat_read_receipts r 
            WHERE r.message_id = m.id AND r.user_id = ${userId}
          )
        `;
      }
    } catch (error) {
      logger.error("Error marking messages as read:", error);
    }
  }

  /**
   * Get total unread message count for a user
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      const result = (await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM chat_messages m
        JOIN chat_conversation_participants p ON p.conversation_id = m.conversation_id AND p.user_id = ${userId}
        WHERE m.sender_id != ${userId}
        AND NOT EXISTS (
          SELECT 1 FROM chat_read_receipts r 
          WHERE r.message_id = m.id AND r.user_id = ${userId}
        )
      `) as CountRow[];
      return parseInt(result[0]?.count || "0", 10);
    } catch (error) {
      logger.error("Error getting total unread count:", error);
      return 0;
    }
  }

  /**
   * Start a conversation with a pro (for clients)
   */
  async startConversationWithPro(
    clientUserId: string,
    clientName: string,
    clientAvatarUrl: string | undefined,
    proUserId: string,
    proName: string,
    proAvatarUrl: string | undefined
  ): Promise<{ success: boolean; conversationId?: string }> {
    return this.createConversation("direct", [
      { userId: clientUserId, role: "client", name: clientName, avatarUrl: clientAvatarUrl },
      { userId: proUserId, role: "pro", name: proName, avatarUrl: proAvatarUrl },
    ]);
  }

  /**
   * Start a conversation about a claim
   */
  async startClaimConversation(
    claimId: string,
    participants: Participant[]
  ): Promise<{ success: boolean; conversationId?: string }> {
    return this.createConversation("claim", participants, claimId);
  }
}

// Export singleton instance
export const chatService = new ChatService();

// Export helper functions
export const createConversation = chatService.createConversation.bind(chatService);
export const getConversations = chatService.getConversations.bind(chatService);
export const getConversation = chatService.getConversation.bind(chatService);
export const sendMessage = chatService.sendMessage.bind(chatService);
export const getMessages = chatService.getMessages.bind(chatService);
export const markMessagesAsRead = chatService.markAsRead.bind(chatService);
