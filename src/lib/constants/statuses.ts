/**
 * Centralized Status Constants
 *
 * Single source of truth for all status string values used across the platform.
 * These MUST match the Prisma schema defaults and enum values exactly.
 *
 * Convention:
 * - Prisma enums → UPPERCASE (ReviewStatus, SupplementStatus, PipelineStage)
 * - Plain String fields → match the @default() in schema.prisma
 */

// ─── Review Statuses ─────────────────────────────────────────────────
// `reviews` model uses ReviewStatus enum (UPPERCASE)
export const REVIEW_STATUS = {
  PENDING: "PENDING",
  PUBLISHED: "PUBLISHED",
  FLAGGED: "FLAGGED",
} as const;

// `trade_reviews` model uses plain String field (lowercase)
export const TRADE_REVIEW_STATUS = {
  PENDING: "pending",
  PUBLISHED: "published",
  FLAGGED: "flagged",
} as const;

// ─── Depreciation Statuses ───────────────────────────────────────────
// Both depreciation_packages and depreciation_trackers default to "PENDING" (UPPERCASE)
export const DEPRECIATION_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  APPROVED: "APPROVED",
  DENIED: "DENIED",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  CLOSED: "CLOSED",
} as const;

// ─── Supplement Statuses ─────────────────────────────────────────────
// SupplementStatus Prisma enum (UPPERCASE)
export const SUPPLEMENT_STATUS = {
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  DENIED: "DENIED",
  DISPUTED: "DISPUTED",
  DRAFT: "DRAFT",
} as const;

// ─── Client Connection Statuses ──────────────────────────────────────
// ClientProConnection uses plain String field. Canonical: lowercase.
export const CONNECTION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  CONNECTED: "connected",
  REJECTED: "rejected",
  EXPIRED: "expired",
} as const;

// ─── Claim Statuses ──────────────────────────────────────────────────
// claims.status is a plain String @default("active") — lowercase
export const CLAIM_STATUS = {
  ACTIVE: "active",
  PENDING: "pending",
  APPROVED: "approved",
  DENIED: "denied",
  CLOSED: "closed",
  DRAFT: "draft",
} as const;

// PipelineStage Prisma enum — UPPERCASE
export const PIPELINE_STAGE = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  INSPECTED: "INSPECTED",
  ESTIMATE_SENT: "ESTIMATE_SENT",
  APPROVED: "APPROVED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CLOSED: "CLOSED",
} as const;
