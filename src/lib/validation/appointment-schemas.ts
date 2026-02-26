/**
 * ============================================================================
 * Appointment Schemas — Sprint 2 Zod Blitz
 * ============================================================================
 *
 * Validation schemas for appointment API routes:
 *  - Create appointment (POST /api/appointments)
 */

import { z } from "zod";

// ── Create Appointment ───────────────────────────────────────
export const createAppointmentSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(500, "Title cannot exceed 500 characters"),
    description: z.string().max(5000).optional().nullable(),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    location: z.string().max(1000).optional().nullable(),
    leadId: z.string().max(255).optional().nullable(),
    claimId: z.string().max(255).optional().nullable(),
    contactId: z.string().max(255).optional().nullable(),
    notes: z.string().max(10_000).optional().nullable(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startTime);
      const end = new Date(data.endTime);
      return end > start;
    },
    { message: "End time must be after start time", path: ["endTime"] }
  );
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
