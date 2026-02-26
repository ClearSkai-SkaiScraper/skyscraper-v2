/**
 * ============================================================================
 * Message Schemas — Sprint 2 Zod Blitz
 * ============================================================================
 *
 * Validation schemas for messaging API routes:
 *  - Send message (POST /api/messages/:threadId)
 *  - Archive/Unarchive thread (PATCH /api/messages/:threadId)
 *  - Mark notification read (POST /api/notifications)
 */

import { z } from "zod";

// ── Send Message ─────────────────────────────────────────────
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content is required")
    .max(10_000, "Message cannot exceed 10,000 characters"),
  attachments: z
    .array(
      z.object({
        url: z.string().url("Attachment URL must be valid"),
        name: z.string().max(255).optional(),
        type: z.string().max(100).optional(),
        size: z.number().positive().optional(),
      })
    )
    .max(20, "Maximum 20 attachments per message")
    .optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ── Archive / Unarchive Thread ───────────────────────────────
export const threadActionSchema = z.object({
  action: z.enum(["archive", "unarchive"], {
    errorMap: () => ({ message: "Action must be 'archive' or 'unarchive'" }),
  }),
});
export type ThreadActionInput = z.infer<typeof threadActionSchema>;

// ── Mark Notification Read ───────────────────────────────────
export const markNotificationReadSchema = z.object({
  notificationId: z
    .string()
    .min(1, "Notification ID is required")
    .max(500, "Invalid notification ID"),
});
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
