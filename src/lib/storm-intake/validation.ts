/**
 * Form Validation Schemas for Storm Intake
 * Using Zod for runtime validation
 */

import { z } from "zod";

export const step1Schema = z.object({
  address: z.string().min(10, "Address must be at least 10 characters").max(500),
});

export const step2Schema = z.object({
  roofType: z.enum(["SHINGLE", "TILE", "METAL", "FLAT", "FOAM", "OTHER"], {
    errorMap: () => ({ message: "Please select a valid roof type" }),
  }),
  houseSqFt: z
    .number()
    .int()
    .positive()
    .min(100, "Square footage must be at least 100")
    .max(50000, "Square footage cannot exceed 50,000")
    .optional(),
  yearBuilt: z
    .number()
    .int()
    .min(1800, "Year built must be after 1800")
    .max(new Date().getFullYear(), "Year built cannot be in the future")
    .optional(),
});

export const step3Schema = z.object({
  damageIndicators: z
    .array(
      z.enum([
        "MISSING_SHINGLES",
        "DENTED_GUTTERS",
        "HAIL_MARKS",
        "CRACKED_SIDING",
        "WATER_LEAKS",
        "WIND_DAMAGE",
        "OTHER",
      ])
    )
    .min(1, "Please select at least one damage indicator"),
  damageDescription: z.string().max(2000, "Description cannot exceed 2000 characters").optional(),
});

export const step4Schema = z.object({
  homeownerName: z.string().min(2, "Name must be at least 2 characters").max(200).optional(),
  homeownerPhone: z
    .string()
    .regex(/^[\d\s()+\-\.ext]+$/, "Invalid phone number format")
    .min(10, "Phone number must be at least 10 digits")
    .max(30)
    .optional(),
  homeownerEmail: z.string().email("Invalid email address").max(200).optional(),
});

export const fileUploadSchema = z.object({
  file: z.instanceof(File).refine((file) => file.size <= 50 * 1024 * 1024, {
    message: "File size must be less than 50MB",
  }),
  type: z.enum(["image/jpeg", "image/png", "image/heic", "video/mp4", "video/quicktime"], {
    errorMap: () => ({ message: "Invalid file type. Only JPG, PNG, HEIC, MP4, MOV allowed" }),
  }),
});

// Helper to validate partial data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateStep(stepNumber: number, data: any) {
  switch (stepNumber) {
    case 1:
      return step1Schema.safeParse(data);
    case 2:
      return step2Schema.safeParse(data);
    case 3:
      return step3Schema.safeParse(data);
    case 4:
      return step4Schema.safeParse(data);
    default:
      return { success: true, data };
  }
}
