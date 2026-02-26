/**
 * ============================================================================
 * Invoice Schemas — Sprint 1 Zod Blitz
 * ============================================================================
 *
 * Validation schemas for invoice-related API routes:
 *  - Receipt upload metadata
 */

import { z } from "zod";

// ── Receipt Upload Metadata ──────────────────────────────────
export const receiptUploadSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
});
export type ReceiptUploadInput = z.infer<typeof receiptUploadSchema>;

// ── Receipt File Constraints ─────────────────────────────────
export const RECEIPT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
export const RECEIPT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];
