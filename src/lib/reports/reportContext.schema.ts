import { z } from "zod";

/**
 * REPORT CONTEXT SCHEMA
 *
 * Single source of truth for the shape of context returned by /api/reports/context
 * This prevents schema mismatches and documents the exact contract.
 */

// Organization branding (matches actual DB schema)
export const OrganizationContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullable(),
  pdfHeaderText: z.string().nullable(),
  pdfFooterText: z.string().nullable(),
});

// Claim details
export const ClaimContextSchema = z.object({
  id: z.string(),
  claimNumber: z.string(),
  insured_name: z.string().nullable(),
  propertyAddress: z.string().nullable(),
  lossDate: z.string().nullable(),
  lossType: z.string().nullable(),
  damageType: z.string().nullable(),
  status: z.string(),
  carrier: z.string().nullable(),
  policyNumber: z.string().nullable(),
  adjusterName: z.string().nullable(),
  adjusterEmail: z.string().nullable(),
  adjusterPhone: z.string().nullable(),
});

// Property details
export const PropertyContextSchema = z.object({
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .nullable(),
});

// Weather data
export const WeatherContextSchema = z
  .object({
    lossDate: z.string().nullable(),
    hailSize: z.string(),
    windSpeed: z.string(),
    precipitation: z.string(),
    provider: z.string(),
    source: z.string(),
    eventStart: z.string().nullable(),
    eventEnd: z.string().nullable(),
    verificationStatement: z.string().nullable(),
  })
  .nullable();

// Photo
export const PhotoSchema = z.object({
  id: z.string(),
  url: z.string(),
  type: z.string().nullable(),
  caption: z.string().nullable(),
  timestamp: z.string(),
  metadata: z.record(z.unknown()).nullable(),
});

// Media
export const MediaContextSchema = z.object({
  photos: z.array(PhotoSchema),
  photosByCategory: z.object({
    ROOF: z.array(PhotoSchema),
    EXTERIOR: z.array(PhotoSchema),
    INTERIOR: z.array(PhotoSchema),
    DETAIL: z.array(PhotoSchema),
    AERIAL: z.array(PhotoSchema),
    OTHER: z.array(PhotoSchema),
  }),
  totalPhotos: z.number(),
});

// Note
export const NoteSchema = z.object({
  id: z.string(),
  content: z.string(),
  authorName: z.string().nullable(),
  authorId: z.string(),
  createdAt: z.string(),
  category: z.string().nullable(),
});

// Finding
export const FindingSchema = z.object({
  id: z.string(),
  category: z.string(),
  description: z.string(),
  severity: z.string().nullable(),
  location: z.string().nullable(),
  detectedAt: z.string(),
  status: z.string(),
});

// Template
export const TemplateContextSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    category: z.string().nullable(),
    structure: z.record(z.unknown()),
    placeholders: z.array(z.string()),
    version: z.string(),
  })
  .nullable();

// Scopes
export const ScopesContextSchema = z.object({
  adjuster: z.record(z.unknown()).nullable(),
  contractor: z.record(z.unknown()).nullable(),
});

// Main Report Context
export const ReportContextSchema = z.object({
  reportId: z.string(),
  generatedAt: z.string(),
  generatedBy: z.string(),
  company: OrganizationContextSchema,
  claim: ClaimContextSchema,
  property: PropertyContextSchema,
  scopes: ScopesContextSchema,
  variances: z.record(z.unknown()).nullable(),
  weather: WeatherContextSchema,
  media: MediaContextSchema,
  notes: z.array(NoteSchema),
  findings: z.array(FindingSchema),
  evidence: z.record(z.unknown()).nullable(),
  carrierStrategy: z.record(z.unknown()).nullable(),
  template: TemplateContextSchema,
});

// Type inference
export type ReportContext = z.infer<typeof ReportContextSchema>;
export type OrganizationContext = z.infer<typeof OrganizationContextSchema>;
export type ClaimContext = z.infer<typeof ClaimContextSchema>;
export type PropertyContext = z.infer<typeof PropertyContextSchema>;
export type WeatherContext = z.infer<typeof WeatherContextSchema>;
export type MediaContext = z.infer<typeof MediaContextSchema>;
export type Photo = z.infer<typeof PhotoSchema>;
export type Note = z.infer<typeof NoteSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type TemplateContext = z.infer<typeof TemplateContextSchema>;
