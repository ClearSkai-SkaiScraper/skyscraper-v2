import { logger } from "@/lib/logger";

// =====================================================
// ENVIRONMENT VALIDATION
// =====================================================
// Validates required environment variables at build/runtime
// Prevents half-broken production deployments
// Dev/Preview-safe: only throws in production
// =====================================================

// eslint-disable-next-line no-restricted-syntax
const IS_PROD = process.env.NODE_ENV === "production";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line no-restricted-syntax, @typescript-eslint/no-unused-vars
const IS_VERCEL = !!process.env.VERCEL;

// ===== BUILD-TIME CLERK KEY VALIDATION =====
// TEMPORARILY DISABLED - Using pk_test_ keys to avoid custom domain issues
// TODO: Re-enable when we have proper pk_live_ keys without custom domain
if (IS_PROD && false) {
  // eslint-disable-next-line no-restricted-syntax
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_live_")) {
    throw new Error(
      "❌ CLERK ERROR: Publishable key must start with pk_live_ in Production. Got: " +
        // eslint-disable-next-line no-restricted-syntax
        (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20) || "UNDEFINED")
    );
  }

  // eslint-disable-next-line no-restricted-syntax
  if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_live_")) {
    throw new Error(
      "❌ CLERK ERROR: Secret key must start with sk_live_ in Production. Got: " +
        // eslint-disable-next-line no-restricted-syntax
        (process.env.CLERK_SECRET_KEY?.substring(0, 20) || "UNDEFINED")
    );
  }

  logger.debug("✅ Clerk Production keys validated at build time");
}
// ============================================

// Critical server-side secrets (fail in production only)
// Made more lenient - only fail on absolutely critical vars
const requiredProd = ["DATABASE_URL", "CLERK_SECRET_KEY"];

// Public vars (provide fallbacks for dev/preview)
// NEXT_PUBLIC_SITE_URL is now optional since we have resilient fallback in src/env/index.ts
// SUPABASE vars are also optional - app should gracefully handle missing Supabase
const requiredPublic: string[] = [];

const optional = [
  "EMAIL_FROM",
  "SENTRY_DSN",
  "STRIPE_PRICE_SOLO",
  "STRIPE_PRICE_BUSINESS",
  "STRIPE_PRICE_ENTERPRISE",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

/**
 * Validates environment variables with dev/preview-safe fallbacks
 * - Production: Throws on missing required vars
 * - Dev/Preview: Warns but provides safe defaults for NEXT_PUBLIC_* vars
 */
export function validateEnv() {
  // eslint-disable-next-line no-restricted-syntax
  const missingProd = requiredProd.filter((k) => !process.env[k]);
  // eslint-disable-next-line no-restricted-syntax
  const missingPublic = requiredPublic.filter((k) => !process.env[k]);

  // PRODUCTION: Fail hard on missing vars
  if (IS_PROD && (missingProd.length || missingPublic.length)) {
    const allMissing = [...missingProd, ...missingPublic];
    throw new Error(
      `❌ Missing required environment variables:\n${allMissing.map((k) => `  - ${k}`).join("\n")}\n\n` +
        `Set them in Vercel → Settings → Environment Variables → Production.\n` +
        `See DEPLOYMENT_READINESS.md for complete list.`
    );
  }

  // DEV/PREVIEW: Warn about missing server vars but don't throw
  if (!IS_PROD && missingProd.length) {
    console.warn(
      `⚠️  Missing server-side environment variables (required in production):\n${missingProd.map((k) => `  - ${k}`).join("\n")}`
    );
  }

  // DEV/PREVIEW: Warn about missing public vars (will use fallbacks)
  if (!IS_PROD && missingPublic.length) {
    console.warn(
      `⚠️  Missing public environment variables (using fallbacks):\n${missingPublic.map((k) => `  - ${k}`).join("\n")}`
    );
  }

  // Warn about optional but recommended vars
  // eslint-disable-next-line no-restricted-syntax
  const missingOptional = optional.filter((k) => !process.env[k]);
  if (missingOptional.length) {
    console.warn(
      `ℹ️  Optional environment variables not set:\n${missingOptional.map((k) => `  - ${k}`).join("\n")}`
    );
  }

  return true;
}

/**
 * Get environment variable with dev/preview fallback
 * @param name - Environment variable name
 * @param options - Configuration options
 * @returns Environment variable value or fallback
 */
export function requireEnv(
  name: string,
  options: { publicVar?: boolean; fallback?: string; required?: boolean } = {}
): string {
  const { publicVar = false, fallback, required = true } = options;
  // eslint-disable-next-line no-restricted-syntax
  const val = process.env[name];

  // If value exists, return it
  if (val) return val;

  // If not required and has fallback, use it
  if (!required && fallback) {
    return fallback;
  }

  // Production: throw on missing required vars (but allow non-required ones)
  if (IS_PROD && required) {
    throw new Error(`❌ Missing required environment variable: ${name}`);
  }

  // Dev/Preview: return fallback for public vars
  if (!IS_PROD && publicVar) {
    const defaultFallback =
      name === "NEXT_PUBLIC_SITE_URL" ? "http://localhost:3000" : fallback || "";

    if (defaultFallback) {
      logger.warn(`⚠️  Using fallback for ${name}: ${defaultFallback}`);
      return defaultFallback;
    }
  }

  // Return custom fallback or empty string
  return fallback ?? "";
}

/**
 * Exported environment variables with safe defaults
 * Use these instead of direct process.env access for consistency
 * NEXT_PUBLIC_SITE_URL now uses resilient helper from src/env/index.ts
 */
export const SITE_URL = requireEnv("NEXT_PUBLIC_SITE_URL", {
  publicVar: true,
  fallback: "http://localhost:3000",
  required: false, // Not required anymore - we have env helper fallback
});

export const APP_URL = requireEnv("NEXT_PUBLIC_APP_URL", {
  publicVar: true,
  fallback: SITE_URL,
});

export const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL", {
  publicVar: true,
  fallback: "",
});

export const SUPABASE_ANON_KEY = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", {
  publicVar: true,
  fallback: "",
});

/**
 * Call once at app startup (server-side only)
 * Validates critical environment variables
 */
export function assertRequiredEnv() {
  validateEnv();
  validateEnvPatterns();

  if (!IS_PROD) {
    logger.debug("[env] Running in development mode with safe defaults");
  }
}

// Optional helper to log environment profile at runtime
export function logEnvProfile() {
  // eslint-disable-next-line no-restricted-syntax
  const profile = process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
  // eslint-disable-next-line no-restricted-syntax
  const region = process.env.VERCEL_REGION || "local";
  // eslint-disable-next-line no-restricted-syntax
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev";

  logger.debug(`[env] Profile: ${profile} | Region: ${region} | Commit: ${commit}`);
}

// Validate specific env patterns
export function validateEnvPatterns() {
  // Database URL should use SSL in production
  // eslint-disable-next-line no-restricted-syntax
  if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
    // eslint-disable-next-line no-restricted-syntax
    if (!process.env.DATABASE_URL.includes("sslmode=require")) {
      logger.warn("⚠️  DATABASE_URL should include ?sslmode=require in production");
    }
  }

  // Site URL should be https in production
  // eslint-disable-next-line no-restricted-syntax
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SITE_URL) {
    // eslint-disable-next-line no-restricted-syntax
    if (!process.env.NEXT_PUBLIC_SITE_URL.startsWith("https://")) {
      logger.warn("⚠️  NEXT_PUBLIC_SITE_URL should use https:// in production");
    }
  }
}
