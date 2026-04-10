/**
 * Beta Mode Utilities
 * Single source of truth for beta testing configuration
 */

/**
 * Check if the app is in beta mode (no billing enforcement)
 * Returns TRUE if beta mode is active (billing disabled)
 * Returns FALSE if billing should be enforced
 */
export function isBetaMode(): boolean {
  // Beta mode is active unless explicitly disabled
  // eslint-disable-next-line no-restricted-syntax
  return process.env.NEXT_PUBLIC_BETA_MODE !== "false";
}

export const BETA_PAYMENTS_DISABLED_MESSAGE =
  "Payments are disabled during beta. A 3-day free trial will be enabled after beta testing concludes.";

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
