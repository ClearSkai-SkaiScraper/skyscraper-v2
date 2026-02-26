/**
 * ============================================================================
 * Pipeline & Project Schemas — Sprint 2 Zod Blitz
 * ============================================================================
 *
 * Validation schemas for pipeline and project API routes:
 *  - Move project stage (PUT /api/pipeline)
 *  - Create project (POST /api/projects)
 */

import { z } from "zod";

// ── Pipeline Stages ──────────────────────────────────────────
export const pipelineStageEnum = z.enum([
  "LEAD",
  "QUALIFIED",
  "INSPECTION_SCHEDULED",
  "INSPECTED",
  "ESTIMATE_SENT",
  "INSURANCE_CLAIM",
  "APPROVED",
  "PRODUCTION",
  "FINAL_QA",
  "INVOICED",
  "PAID",
  "WARRANTY",
  "ARCHIVED",
]);

// ── Move Project Stage ───────────────────────────────────────
export const moveStageSchema = z.object({
  projectId: z.string().min(1, "Project ID is required").max(255),
  newStage: pipelineStageEnum,
  oldStage: pipelineStageEnum.optional(),
});
export type MoveStageInput = z.infer<typeof moveStageSchema>;

// ── Create Project ───────────────────────────────────────────
export const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title cannot exceed 500 characters"),
  leadId: z.string().max(255).optional().nullable(),
  propertyId: z.string().max(255).optional().nullable(),
  contactId: z.string().max(255).optional().nullable(),
  status: pipelineStageEnum.optional().default("LEAD"),
  startDate: z.string().datetime().optional().nullable(),
  targetEndDate: z.string().datetime().optional().nullable(),
  assignedTo: z.string().max(255).optional().nullable(),
  valueEstimate: z.number().min(0).max(100_000_000).optional().nullable(),
  notes: z.string().max(10_000).optional().nullable(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
