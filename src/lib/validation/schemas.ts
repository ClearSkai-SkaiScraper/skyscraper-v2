/**
 * Validation Schemas for ClearSKai Forms
 *
 * Using Zod for runtime type checking and validation
 * Provides consistent error messages and security against invalid inputs
 */

import { z } from "zod";

/**
 * Common reusable schemas
 */
export const uuidSchema = z.string().uuid("Invalid ID format");
export const phoneSchema = z.string().regex(/^\+?[\d\s\-()]+$/, "Invalid phone format");
export const urlSchema = z.string().url("Invalid URL format");
export const dateSchema = z.string().datetime().or(z.date());

/**
 * Sign In Schema
 */
export const signInSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters"),
});

export type SignInData = z.infer<typeof signInSchema>;

/**
 * Sign Up Schema
 * Enforces stronger password requirements
 */
export const signUpSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type SignUpData = z.infer<typeof signUpSchema>;

/**
 * Contact Form Schema
 */
export const contactSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name must be less than 120 characters")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  message: z
    .string()
    .min(5, "Message must be at least 5 characters")
    .max(4000, "Message must be less than 4000 characters")
    .trim(),
});

export type ContactData = z.infer<typeof contactSchema>;

/**
 * Demo Request Schema
 */
export const demoRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name must be less than 120 characters")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  company: z.string().max(160, "Company name must be less than 160 characters").trim().optional(),
  phone: z.string().max(40, "Phone number must be less than 40 characters").trim().optional(),
  message: z.string().max(1000, "Message must be less than 1000 characters").trim().optional(),
});

export type DemoRequestData = z.infer<typeof demoRequestSchema>;

/**
 * Password Reset Schema
 */
export const passwordResetSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
});

export type PasswordResetData = z.infer<typeof passwordResetSchema>;

/**
 * Claim schemas
 */
export const createClaimSchema = z.object({
  claimNumber: z.string().min(1).max(50),
  clientId: uuidSchema,
  propertyAddress: z.string().min(1).max(500),
  dateOfLoss: dateSchema.optional(),
  insuranceCarrier: z.string().max(200).optional(),
  policyNumber: z.string().max(100).optional(),
  claimAmount: z.number().min(0).optional(),
  description: z.string().max(5000).optional(),
});

export const updateClaimSchema = createClaimSchema.partial();

/**
 * Lead schemas
 */
export const createLeadSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  source: z.string().max(100).optional(),
  stage: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]).optional(),
  temperature: z.enum(["cold", "warm", "hot"]).optional(),
  value: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  contactId: uuidSchema,
  assignedTo: uuidSchema.optional(),
  followUpDate: dateSchema.optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

/**
 * Contact/Client schemas
 */
export const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email("Invalid email format").optional(),
  phone: phoneSchema.optional(),
  company: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2).optional(),
  zip: z.string().max(10).optional(),
});

export const updateContactSchema = createContactSchema.partial();

/**
 * Document schemas
 */
export const createDocumentSchema = z.object({
  filename: z.string().min(1).max(255),
  fileUrl: urlSchema,
  fileType: z.string().max(100),
  fileSize: z.number().min(0),
  claimId: uuidSchema.optional(),
  jobId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  isSharedWithClient: z.boolean().optional(),
  accessLevel: z.enum(["PRIVATE", "TEAM", "CLIENT", "PUBLIC"]).optional(),
});

/**
 * Message schemas
 */
export const createMessageSchema = z.object({
  threadId: uuidSchema,
  body: z.string().min(1).max(10000),
  attachments: z
    .array(
      z.object({
        url: urlSchema,
        name: z.string().max(255),
        type: z.string().max(100),
        size: z.number().min(0),
      })
    )
    .optional(),
});

/**
 * Validation helper function
 */
export async function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
      throw new Error(`Validation failed: ${messages.join(", ")}`);
    }
    throw error;
  }
}

/**
 * Middleware wrapper for API routes
 */
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return async (data: unknown): Promise<T> => {
    return validateRequest(schema, data);
  };
}

/**
 * Helper function to format Zod errors into user-friendly messages
 */
export function formatZodError(error: z.ZodError): string {
  const firstError = error.errors[0];
  return firstError?.message || "Validation failed";
}

/**
 * Claim Generation Form Validation
 */
export const ClaimGenerateSchema = z.object({
  claimNumber: z.string().optional(),
  policyNumber: z.string().optional(),
  carrier: z.string().optional(),
  damageType: z.enum(["HAIL", "WIND", "FIRE", "WATER", "STORM", "OTHER"], {
    required_error: "Please select a damage type",
  }),
  dateOfLoss: z
    .string()
    .optional()
    .refine((val) => !val || !Number.isNaN(Date.parse(val)), { message: "Invalid date format" }),
  description: z.string().optional(),
  estimatedValue: z
    .string()
    .optional()
    .refine((val) => !val || (!Number.isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
      message: "Estimated value must be a positive number",
    }),
  propertyAddress: z.string().min(5, "Property address is required (min 5 characters)"),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{5}(-\d{4})?$/.test(val), {
      message: "ZIP code must be 5 digits or ZIP+4 format",
    }),
});

export type ClaimGenerateInput = z.infer<typeof ClaimGenerateSchema>;

/**
 * Organization Branding Form Validation
 */
export const BrandingSchema = z.object({
  companyName: z.string().min(2, "Company name is required (min 2 characters)"),
  license: z.string().optional().or(z.literal("")),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || /^[\d\s\-\(\)\+\.]+$/.test(val), {
      message: "Invalid phone number format",
    }),
  email: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "Invalid email address",
    }),
  website: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => {
        if (!val) return true;
        try {
          new URL(val.startsWith("http") ? val : `https://${val}`);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid website URL" }
    ),
  colorPrimary: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .or(z.literal("")),
  colorAccent: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
  teamPhotoUrl: z.string().optional().or(z.literal("")),
  companyAddress: z.string().optional().or(z.literal("")),
});

export type BrandingInput = z.infer<typeof BrandingSchema>;

/**
 * Client Portal Invite Validation
 */
export const ClientInviteSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  email: z.string().email("Valid email address is required"),
});

export type ClientInviteInput = z.infer<typeof ClientInviteSchema>;

/**
 * Proposal Publish Validation
 */
export const ProposalPublishSchema = z.object({
  emailRecipients: z.array(z.string().email()).optional(),
  message: z.string().optional(),
});

export type ProposalPublishInput = z.infer<typeof ProposalPublishSchema>;
