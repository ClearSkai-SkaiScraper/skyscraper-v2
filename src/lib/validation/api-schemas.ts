/**
 * ============================================================================
 * Shared API Schemas — Sprint 1 Zod Blitz
 * ============================================================================
 *
 * Common Zod schemas reused across many API routes:
 *  - IDs (orgId, claimId, userId)
 *  - Pagination & search params
 *  - Date range filters
 *  - Sort params
 */

import { z } from "zod";

// ── ID Schemas ───────────────────────────────────────────────
export const idSchema = z.string().min(1, "ID is required").max(255);
export const orgIdSchema = z.string().min(1, "Organization ID is required");
export const claimIdSchema = z.string().min(1, "Claim ID is required");
export const userIdSchema = z.string().min(1, "User ID is required");
export const invoiceIdSchema = z.string().min(1, "Invoice ID is required");
export const contactIdSchema = z.string().min(1, "Contact ID is required");

// ── Pagination ───────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).optional(),
});
export type PaginationParams = z.infer<typeof paginationSchema>;

// ── Search / Filter ──────────────────────────────────────────
export const searchSchema = z.object({
  q: z.string().max(500).optional(),
  search: z.string().max(500).optional(),
  filter: z.string().max(200).optional(),
  status: z.string().max(50).optional(),
});

// ── Sort ─────────────────────────────────────────────────────
export const sortSchema = z.object({
  sortBy: z.string().max(100).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ── Date Range ───────────────────────────────────────────────
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ── Common Enums ─────────────────────────────────────────────
export const damageTypeEnum = z.enum([
  "HAIL",
  "WIND",
  "FIRE",
  "WATER",
  "STORM",
  "LIGHTNING",
  "OTHER",
  "UNKNOWN",
]);

export const priorityEnum = z.enum(["low", "medium", "high", "urgent"]).default("medium");

export const claimStatusEnum = z.enum([
  "new",
  "INTAKE",
  "FIELD_INSPECTION",
  "ASSESSMENT",
  "in_review",
  "approved",
  "SUPPLEMENTING",
  "BUILD",
  "COMPLETED",
  "closed",
  "DENIED",
]);
