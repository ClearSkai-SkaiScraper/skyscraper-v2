/**
 * Beta Mode Utilities
 * Single source of truth for beta testing configuration
 *
 * PRODUCTION DEFAULT: Beta mode is OFF (billing enforced).
 * To enable beta mode for testing, set NEXT_PUBLIC_BETA_MODE=true
 */

/**
 * Check if the app is in beta mode (no billing enforcement)
 * Returns TRUE if beta mode is active (billing disabled)
 * Returns FALSE if billing should be enforced (PRODUCTION DEFAULT)
 */
export function isBetaMode(): boolean {
  // Beta mode must be EXPLICITLY enabled — production default is OFF
  // eslint-disable-next-line no-restricted-syntax
  return process.env.NEXT_PUBLIC_BETA_MODE === "true";
}

export const BETA_PAYMENTS_DISABLED_MESSAGE =
  "Subscribe to access SkaiScraper Pro. Start your free trial today.";

/**
 * Check if billing enforcement is active
 * Inverse of isBetaMode() for readability in billing contexts
 */
export function isBillingEnforced(): boolean {
  return !isBetaMode();
}

/**
 * Get beta mode status message for display
 */
export function getBetaModeStatus(): {
  active: boolean;
  message: string;
  badge: string;
} {
  const active = isBetaMode();
  return {
    active,
    message: active
      ? "Beta Mode Active — All features unlocked for testing"
      : "Production Mode — Billing enforcement active",
    badge: active ? "🚀 BETA ACCESS" : "Production",
  };
}
