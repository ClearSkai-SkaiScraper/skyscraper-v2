/**
 * ============================================================================
 * Feedback Schemas — Sprint 2 Zod Blitz
 * ============================================================================
 *
 * Validation schemas for feedback API routes:
 *  - Submit feedback (POST /api/feedback)
 */

import { z } from "zod";

// ── Submit Feedback ──────────────────────────────────────────
export const submitFeedbackSchema = z
  .object({
    // Primary content fields (supports both old and new format)
    message: z.string().max(10_000).optional(),
    issue: z.string().max(10_000).optional(),
    task: z.string().max(500).optional(),
    confusion: z.string().max(5000).optional(),

    // User info
    email: z.string().email().optional().or(z.literal("")),
    name: z.string().max(200).optional(),

    // Metadata
    category: z.string().max(100).optional(),
    timestamp: z.string().max(100).optional(),
    userAgent: z.string().max(1000).optional(),
    url: z.string().max(2000).optional(),
  })
  .refine(
    (data) => {
      const feedbackMessage = data.issue || data.message;
      return feedbackMessage && feedbackMessage.trim().length >= 10;
    },
    {
      message: "Please provide feedback with at least 10 characters",
      path: ["message"],
    }
  );
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
