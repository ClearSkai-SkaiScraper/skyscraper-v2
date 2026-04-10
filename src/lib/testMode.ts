import { logger } from "@/lib/logger";

/**
 * Test Mode Helper
 * Centralized test mode detection and feature unlocking
 */

export function isTestMode(): boolean {
  // eslint-disable-next-line no-restricted-syntax
  return process.env.NEXT_PUBLIC_TEST_MODE === "true";
}

function isFreeBetaMode(): boolean {
  // Default to FREE_BETA unless explicitly disabled.
  // This keeps billing/tokens inactive during beta testing in production.
  // eslint-disable-next-line no-restricted-syntax
  return process.env.FREE_BETA?.toLowerCase() !== "false";
}

function isStripeConfigured(): boolean {
  // eslint-disable-next-line no-restricted-syntax
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getTestModeConfig() {
  if (!isTestMode()) {
    return {
      unlimitedClaims: false,
      unlimitedAI: false,
      bypassBilling: false,
      forceOnboardingComplete: false,
      unlockAllFeatures: false,
    };
  }

  return {
    unlimitedClaims: true,
    unlimitedAI: true,
    bypassBilling: true,
    forceOnboardingComplete: true,
    unlockAllFeatures: true,
  };
}

/**
 * Use this in billing checks to bypass limits in test mode
 */
export function shouldBypassBilling(): boolean {
  if (isTestMode()) return true;

  // Explicit kill switch (server-side)
  // eslint-disable-next-line no-restricted-syntax
  const disabled = process.env.BILLING_DISABLED?.toLowerCase();
  if (disabled === "1" || disabled === "true" || disabled === "yes") return true;

  // Beta mode (default unless explicitly disabled)
  if (isFreeBetaMode()) return true;

  // Defensive: if Stripe isn't configured, don't block app usage.
  if (!isStripeConfigured()) return true;

  return false;
}

/**
 * Use this to check if features should be unlocked
 */
export function shouldUnlockFeature(featureName: string): boolean {
  if (isTestMode()) {
    logger.debug(`[TestMode] Feature "${featureName}" unlocked`);
    return true;
  }
  return false;
}
