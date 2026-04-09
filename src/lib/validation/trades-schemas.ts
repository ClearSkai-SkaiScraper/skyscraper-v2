/**
 * ============================================================================
 * Trades Schemas — Sprint 1 Zod Blitz
 * ============================================================================
 *
 * Validation schemas for trades-related API routes:
 *  - Company PATCH (edit profile)
 *  - Connection requests (create, accept/decline)
 */

import { z } from "zod";

// ── Hex Color ────────────────────────────────────────────────
const hexColorOrEmpty = z
  .string()
  .regex(/^(#[0-9A-Fa-f]{6})?$/, "Invalid hex color")
  .optional()
  .default("");

// ── Company PATCH Schema ─────────────────────────────────────
export const tradesCompanyUpdateSchema = z.object({
  // Core company fields
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  logo: z.string().max(2000).optional(),
  coverPhoto: z.string().max(2000).optional(),
  website: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zip: z.string().max(20).optional(),
  specialties: z.array(z.string()).optional(), // JSON array
  yearsInBusiness: z.union([z.string(), z.number()]).optional(),
  licenseNumber: z.string().max(100).optional(),

  // Extended member-level fields
  tagline: z.string().max(500).optional(),
  aboutCompany: z.string().max(10000).optional(),
  motto: z.string().max(500).optional(),
  foundedYear: z.union([z.string(), z.number()]).optional(),
  teamSize: z.string().max(50).optional(),
  hoursOfOperation: z.string().max(500).optional(),
  officePhone: z.string().max(50).optional(),
  mobilePhone: z.string().max(50).optional(),
  emergencyAvailable: z.boolean().optional(),
  freeEstimates: z.boolean().optional(),
  warrantyInfo: z.string().max(2000).optional(),
  socialLinks: z.record(z.string()).optional(), // JSON object
  paymentMethods: z.array(z.string()).optional(), // JSON array
  languages: z.array(z.string()).optional(), // JSON array
  rocNumber: z.string().max(100).optional(),
  insuranceProvider: z.string().max(200).optional(),
});
export type TradesCompanyUpdateInput = z.infer<typeof tradesCompanyUpdateSchema>;

// ── Connection Request (POST) ────────────────────────────────
export const connectionRequestSchema = z.object({
  addresseeId: z.string().min(1, "addresseeId is required"),
  message: z.string().max(1000).optional(),
});
export type ConnectionRequestInput = z.infer<typeof connectionRequestSchema>;

// ── Connection Action (PATCH — accept/decline/block) ─────────
export const connectionActionSchema = z.object({
  connectionId: z.string().min(1, "connectionId is required"),
  action: z.enum(["accept", "decline", "block"], {
    errorMap: () => ({ message: "Action must be accept, decline, or block" }),
  }),
});
export type ConnectionActionInput = z.infer<typeof connectionActionSchema>;
