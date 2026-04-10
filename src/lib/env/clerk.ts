import { logger } from "@/lib/logger";

// =====================================================
// CLERK ENVIRONMENT VALIDATION
// =====================================================
// Validates Clerk environment variables at runtime
// Ensures proper configuration for authentication
// =====================================================

// eslint-disable-next-line no-restricted-syntax
const IS_PROD = process.env.NODE_ENV === "production";
// eslint-disable-next-line no-restricted-syntax
const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Validates Clerk environment variables are properly configured
 * Called at app startup to fail fast if auth won't work
 */
export function validateClerkEnvironment(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required public key
  // eslint-disable-next-line no-restricted-syntax
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    errors.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set");
  } else {
    // Validate format
    if (!publishableKey.startsWith("pk_test_") && !publishableKey.startsWith("pk_live_")) {
      errors.push(
        `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY has invalid format: ${publishableKey.substring(0, 20)}...`
      );
    }
    // Production should use live keys (warning only, not error)
    if (IS_PROD && publishableKey.startsWith("pk_test_")) {
      warnings.push(
        "⚠️  Using test Clerk keys in production. This may cause authentication issues on custom domains."
      );
    }
  }

  // Check required secret key (server-side only)
  if (typeof window === "undefined") {
    // eslint-disable-next-line no-restricted-syntax
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      errors.push("CLERK_SECRET_KEY is not set");
    } else {
      if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_live_")) {
        errors.push(`CLERK_SECRET_KEY has invalid format: ${secretKey.substring(0, 20)}...`);
      }
      if (IS_PROD && secretKey.startsWith("sk_test_")) {
        warnings.push("⚠️  Using test Clerk secret key in production");
      }
    }
  }

  // Check optional redirect URLs
  // eslint-disable-next-line no-restricted-syntax
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL;
  // eslint-disable-next-line no-restricted-syntax
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL;
  // eslint-disable-next-line no-restricted-syntax
  const afterSignInUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL;
  // eslint-disable-next-line no-restricted-syntax
  const afterSignUpUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL;

  if (!signInUrl) {
    warnings.push(
      "NEXT_PUBLIC_CLERK_SIGN_IN_URL not set. Clerk will use default. Consider setting to /sign-in"
    );
  }

  if (!signUpUrl) {
    warnings.push(
      "NEXT_PUBLIC_CLERK_SIGN_UP_URL not set. Clerk will use default. Consider setting to /sign-up"
    );
  }

  if (!afterSignInUrl) {
    warnings.push(
      "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL not set. Users will stay on current page after sign in. Consider setting to /dashboard"
    );
  }

  if (!afterSignUpUrl) {
    warnings.push(
      "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL not set. Users will stay on current page after sign up. Consider setting to /dashboard"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Logs validation results
 * Call this at runtime only (not during build)
 * NOTE: Do NOT call at module level - Vercel builds don't have env vars
 */
export function logClerkValidation(): void {
  // Skip during Vercel build phase - env vars not available
  // eslint-disable-next-line no-restricted-syntax
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const result = validateClerkEnvironment();

  if (result.errors.length > 0) {
    logger.error("❌ CLERK VALIDATION FAILED:");
    result.errors.forEach((err) => console.error(`   - ${err}`));
    // Don't throw - just log. Throwing breaks the build.
    // Auth will fail gracefully at runtime if misconfigured.
  }

  if (result.warnings.length > 0 && IS_DEV) {
    logger.warn("⚠️  CLERK CONFIGURATION WARNINGS:");
    result.warnings.forEach((warn) => console.warn(`   - ${warn}`));
  }

  if (result.valid && result.warnings.length === 0) {
    logger.debug("✅ Clerk environment validated");
  }
}

// Note: Auto-validation removed - causes Vercel build failures
// Validation now happens via /api/health endpoints at runtime
