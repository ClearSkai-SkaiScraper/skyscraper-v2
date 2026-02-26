/**
 * ============================================================================
 * Claim Schemas — Sprint 1 Zod Blitz
 * ============================================================================
 *
 * Validation schemas for claim-related API routes:
 *  - Claim intake wizard
 *  - Timeline events (create / delete)
 */

import { z } from "zod";

// ── Claim Intake Schema ──────────────────────────────────────
export const claimIntakeSchema = z.object({
  // Step 1: Loss Details
  dateOfLoss: z.string().min(1, "Date of loss is required"),
  lossType: z.string().max(100).optional(),
  status: z.string().max(50).optional(),

  // Step 2: Property
  propertyAddress: z.string().min(1, "Property address is required").max(500),
  structureType: z.string().max(100).optional(),
  stories: z.union([z.string(), z.number()]).optional(),
  roofType: z.string().max(100).optional(),
  slope: z.string().max(50).optional(),
  squareFootage: z.union([z.string(), z.number()]).optional(),

  // Step 3: Contact & Policy
  contactId: z.string().max(255).optional().nullable(),
  contactName: z.string().max(200).optional(),
  contactPhone: z.string().max(50).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  policyNumber: z.string().max(100).optional(),
  carrier: z.string().max(200).optional(),
  deductible: z.union([z.string(), z.number()]).optional(),
  agentName: z.string().max(200).optional(),
});
export type ClaimIntakeInput = z.infer<typeof claimIntakeSchema>;

// ── Timeline Event Create ────────────────────────────────────
export const timelineCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional().default(""),
  eventType: z.string().max(100).optional(),
});
export type TimelineCreateInput = z.infer<typeof timelineCreateSchema>;

// ── Timeline Event Delete ────────────────────────────────────
export const timelineDeleteSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});
export type TimelineDeleteInput = z.infer<typeof timelineDeleteSchema>;
