/**
 * Centralized Environment Configuration
 *
 * This module provides typed, validated access to environment variables.
 * Import from here instead of using process.env directly.
 *
 * Usage:
 *   import { config } from "@/lib/config";
 *   const url = config.SUPABASE_URL;
 *
 * Benefits:
 * - Runtime validation with clear error messages
 * - TypeScript autocomplete for all env vars
 * - Default values for optional vars
 * - Single source of truth
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition
// ─────────────────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // ── Core Infrastructure ──
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url().optional(), // Optional during build
  DIRECT_URL: z.string().url().optional(),

  // ── Supabase ──
  SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),

  // ── Clerk Auth ──
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),

  // ── OpenAI ──
  OPENAI_API_KEY: z.string().min(1).optional(),

  // ── Stripe ──
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),

  // ── Weather APIs ──
  WEATHERSTACK_API_KEY: z.string().min(1).optional(),
  VISUAL_CROSSING_API_KEY: z.string().min(1).optional(),
  TOMORROW_IO_API_KEY: z.string().min(1).optional(),

  // ── Mapbox ──
  MAPBOX_ACCESS_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1).optional(),

  // ── Twilio ──
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_PHONE_NUMBER: z.string().min(1).optional(),

  // ── Resend (Email) ──
  RESEND_API_KEY: z.string().min(1).optional(),

  // ── Sentry ──
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // ── Upstash Redis ──
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // ── Feature Flags ──
  ENABLE_AI_FEATURES: z.coerce.boolean().default(true),
  ENABLE_WEATHER_REPORTS: z.coerce.boolean().default(true),
  ENABLE_CLIENT_PORTAL: z.coerce.boolean().default(true),

  // ── Build Phase ──
  BUILD_PHASE: z.coerce.boolean().default(false),
  VERCEL: z.coerce.boolean().default(false),
});

// ─────────────────────────────────────────────────────────────────────────────
// Parse & Export
// ─────────────────────────────────────────────────────────────────────────────

function parseEnv() {
  // During build phase, skip strict validation
  if (process.env.BUILD_PHASE === "1" || process.env.VERCEL_ENV === "production") {
    return envSchema.partial().parse(process.env);
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);

    // In development, throw to fail fast
    if (process.env.NODE_ENV === "development") {
      throw new Error("Invalid environment configuration");
    }
  }

  return result.success ? result.data : envSchema.partial().parse(process.env);
}

export const config = parseEnv();

// ─────────────────────────────────────────────────────────────────────────────
// Helper Getters (with runtime checks)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get Supabase URL (prefers non-public version)
 */
export function getSupabaseUrl(): string {
  const url = config.SUPABASE_URL || config.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL is required");
  return url;
}

/**
 * Get Supabase service role key (server-side only)
 */
export function getSupabaseServiceKey(): string {
  if (!config.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side operations");
  }
  return config.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Get OpenAI API key
 */
export function getOpenAIKey(): string {
  if (!config.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for AI features");
  }
  return config.OPENAI_API_KEY;
}

/**
 * Check if we're in production
 */
export function isProduction(): boolean {
  return config.NODE_ENV === "production";
}

/**
 * Check if we're in development
 */
export function isDevelopment(): boolean {
  return config.NODE_ENV === "development";
}

/**
 * Check if AI features are enabled
 */
export function isAIEnabled(): boolean {
  return config.ENABLE_AI_FEATURES && !!config.OPENAI_API_KEY;
}

// Type export for external use
export type Config = z.infer<typeof envSchema>;
