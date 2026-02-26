/**
 * ============================================================================
 * Report Schemas — Sprint 2 Zod Blitz
 * ============================================================================
 *
 * Validation schemas for report generation API routes:
 *  - Generate report (POST /api/reports/generate)
 */

import { z } from "zod";

// ── Section Keys ─────────────────────────────────────────────
export const sectionKeyEnum = z.enum([
  "cover",
  "executive-summary",
  "scope-matrix",
  "photo-grid",
  "weather",
  "line-items",
  "supplements",
  "codes",
  "damage-assessment",
  "timeline",
  "inspector-notes",
  "appendix",
]);

// ── Generate Report ──────────────────────────────────────────
export const generateReportSchema = z.object({
  claimId: z.string().min(1, "Claim ID is required").max(255),
  orgTemplateId: z.string().max(255).optional().nullable(),
  template: z.string().max(100).optional(),
  sections: z.array(sectionKeyEnum).optional(),
  addOns: z.array(z.string().max(100)).optional(),
  inputs: z.record(z.string(), z.unknown()).optional(),
  aiNotes: z.string().max(50_000).optional().nullable(),
});
export type GenerateReportInput = z.infer<typeof generateReportSchema>;
