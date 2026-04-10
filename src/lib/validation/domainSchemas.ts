import { z } from "zod";

// Phase 2 domain-level schemas & enums (strict + safe fallbacks using .catch)
// These are intentionally minimal & focused on high-traffic entities.

export const claimStatusEnum = z.enum(["new", "in_review", "approved", "closed"]).catch("new");
export const claimPriorityEnum = z.enum(["low", "medium", "high", "urgent"]).catch("medium");
export const claimLifecycleStageEnum = z
  .enum([
    "FILED",
    "ADJUSTER_REVIEW",
    "APPROVED",
    "DENIED",
    "APPEAL",
    "BUILD",
    "COMPLETED",
    "DEPRECIATION",
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .catch(undefined as any)
  .optional();

export const leadStageEnum = z
  .enum(["new", "qualified", "proposal", "negotiation", "won", "lost"])
  .catch("new");
export const leadTempEnum = z.enum(["cold", "warm", "hot"]).catch("warm");

export const teamRoleEnum = z.enum(["admin", "member", "viewer"]).catch("member");

export const claimCoreSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  propertyId: z.string(),
  projectId: z.string().nullable().optional(),
  claimNumber: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  damageType: z.string(),
  dateOfLoss: z.date(),
  status: claimStatusEnum,
  priority: claimPriorityEnum,
  lifecycleStage: claimLifecycleStageEnum,
  exposureCents: z.number().int().nullable().optional(),
  insured_name: z.string().nullable().optional(),
  homeownerEmail: z.string().email().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ClaimCore = z.infer<typeof claimCoreSchema>;

export const leadCoreSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  contactId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  source: z.string(),
  value: z.number().int().nullable().optional(),
  probability: z.number().int().nullable().optional(),
  stage: leadStageEnum,
  temperature: leadTempEnum,
  assignedTo: z.string().nullable().optional(),
  createdBy: z.string().nullable().optional(),
  followUpDate: z.date().nullable().optional(),
  closedAt: z.date().nullable().optional(),
  claimId: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type LeadCore = z.infer<typeof leadCoreSchema>;

// Creation schemas (request-body validation) — narrow subset.
export const leadCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  source: z.string().min(1).max(120).optional(),
  value: z.number().int().min(0).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  stage: leadStageEnum.optional(),
  temperature: leadTempEnum.optional(),
  assignedTo: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
  contactId: z.string().optional(),
  contactData: z
    .object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
});
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;

export function parseLeadCreate(data: unknown): LeadCreateInput {
  return leadCreateSchema.parse(data);
}
