/**
 * Feature Flags & Environment Helpers (Phase 1A)
 *
 * Provides safe environment variable access with feature flag support.
 * Guards against missing vars in dev/preview while failing fast in production.
 */

// ========== FEATURE FLAGS ==========

export interface FeatureFlags {
  TEST_PAGES: boolean;
  PDF_EXPORT: boolean;
  ZIP_EXPORT: boolean;
  AUTOSAVE: boolean;
  RETAIL_WIZARD: boolean;
  CLAIMS_WIZARD: boolean;
}

/**
 * Get feature flags from environment
 * Defaults to false if not explicitly set to "true"
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    // eslint-disable-next-line no-restricted-syntax
    TEST_PAGES: process.env.FEATURE_TEST_PAGES === "true",
    // eslint-disable-next-line no-restricted-syntax
    PDF_EXPORT: process.env.FEATURE_PDF_EXPORT === "true",
    // eslint-disable-next-line no-restricted-syntax
    ZIP_EXPORT: process.env.FEATURE_ZIP_EXPORT === "true",
    // eslint-disable-next-line no-restricted-syntax
    AUTOSAVE: process.env.FEATURE_AUTOSAVE !== "false", // default ON
    // eslint-disable-next-line no-restricted-syntax
    RETAIL_WIZARD: process.env.FEATURE_RETAIL_WIZARD !== "false", // default ON
    // eslint-disable-next-line no-restricted-syntax
    CLAIMS_WIZARD: process.env.FEATURE_CLAIMS_WIZARD !== "false", // default ON
  };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}

/**
 * Assert a feature is enabled, throw if not
 * Use this in API routes to fail fast
 */
export function assertFeatureEnabled(feature: keyof FeatureFlags): void {
  if (!isFeatureEnabled(feature)) {
    throw new Error(`Feature "${feature}" is disabled. Enable it in environment variables.`);
  }
}

// ========== ENVIRONMENT VARIABLES ==========

/**
 * Check if running in production
 */
export const IS_PROD =
  // eslint-disable-next-line no-restricted-syntax
  process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

/**
 * Check if running in preview (Vercel preview deployments)
 */
// eslint-disable-next-line no-restricted-syntax
export const IS_PREVIEW = process.env.VERCEL_ENV === "preview";

/**
 * Check if running in development
 */
// eslint-disable-next-line no-restricted-syntax
export const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Safe environment variable getter with fallback
 * In production, logs a warning for missing vars instead of crashing
 */
export function getEnv(key: string, fallback?: string): string {
  // eslint-disable-next-line no-restricted-syntax
  const value = process.env[key];

  // In production, warn if required var is missing (but don't crash)
  if (IS_PROD && !value && !fallback) {
    console.warn(
      `[env] Missing environment variable: ${key}. ` +
        `Set it in Vercel dashboard or .env.production`
    );
  }

  return value || fallback || "";
}

/**
 * Get public environment variable (NEXT_PUBLIC_*)
 */
export function getPublicEnv(key: string, fallback?: string): string {
  const fullKey = key.startsWith("NEXT_PUBLIC_") ? key : `NEXT_PUBLIC_${key}`;
  return getEnv(fullKey, fallback);
}

// ========== COMMON ENV VARS (with safe fallbacks) ==========

// SITE_URL: Always provide a fallback to prevent production crashes.
// Priority: NEXT_PUBLIC_SITE_URL → VERCEL_URL → hardcoded domain → localhost
export const SITE_URL = (() => {
  // eslint-disable-next-line no-restricted-syntax
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim()) return explicit.replace(/\/$/, "");
  // eslint-disable-next-line no-restricted-syntax
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim()) return `https://${vercel.replace(/\/$/, "")}`;
  if (IS_DEV) return "http://localhost:3000";
  return "https://skaiscrape.com"; // Production hardcoded fallback
})();

export const APP_URL = SITE_URL;

export const DATABASE_URL = getEnv("DATABASE_URL");

export const SUPABASE_URL = getPublicEnv("SUPABASE_URL");

export const SUPABASE_ANON_KEY = getPublicEnv("SUPABASE_ANON_KEY");

// Lazy getter to avoid build-time evaluation in Vercel
// CLERK_SECRET_KEY is only available at runtime, not during static build
export function getClerkSecretKey(): string {
  return getEnv("CLERK_SECRET_KEY");
}
/** @deprecated Use getClerkSecretKey() for lazy evaluation */
export const CLERK_SECRET_KEY = IS_PROD ? "" : getEnv("CLERK_SECRET_KEY", "");

export const CLERK_PUBLISHABLE_KEY = getPublicEnv("CLERK_PUBLISHABLE_KEY");

// ========== RUNTIME CHECKS ==========

/**
 * Validate that all critical environment variables are set
 * Call this at app startup (layout.tsx or middleware)
 */
export function validateEnvironment(): void {
  const required = [
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  ];

  const missing: string[] = [];

  for (const key of required) {
    const value = key.startsWith("NEXT_PUBLIC_")
      ? getPublicEnv(key.replace("NEXT_PUBLIC_", ""))
      : getEnv(key);

    if (!value && IS_PROD) {
      missing.push(key);
    }
  }

  if (missing.length > 0 && IS_PROD) {
    throw new Error(
      `Missing critical environment variables in production: ${missing.join(", ")}. ` +
        `Deploy will fail. Set them in Vercel dashboard.`
    );
  }

  if (missing.length > 0 && IS_DEV) {
    console.warn(
      `⚠️ Warning: Missing environment variables in dev: ${missing.join(", ")}. ` +
        `Some features may not work. Copy .env.example to .env.local and fill in values.`
    );
  }
}

/**
 * Export feature flags as a singleton
 */
export const features = getFeatureFlags();
