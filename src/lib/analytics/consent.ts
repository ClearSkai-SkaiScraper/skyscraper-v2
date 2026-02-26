/**
 * Analytics Consent Management
 *
 * Provides consent state for PostHog and other tracking tools.
 * Required by TRACKING_CONFIG in @/lib/privacy/config.ts where
 * posthog.requiresConsent === true.
 *
 * Consent states:
 *   - "granted"  → PostHog captures fire normally
 *   - "denied"   → PostHog silently no-ops all captures
 *   - "unset"    → Treated as denied (opt-in model)
 */

const CONSENT_KEY = "skai-analytics-consent";

export type ConsentState = "granted" | "denied" | "unset";

/**
 * Read stored analytics consent from localStorage.
 * Returns "unset" on SSR or if never configured.
 */
export function getAnalyticsConsent(): ConsentState {
  if (typeof window === "undefined") return "unset";
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "granted" || stored === "denied") return stored;
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
  return "unset";
}

/**
 * Persist analytics consent choice.
 * Dispatches a custom event so PostHog can react in real-time.
 */
export function setAnalyticsConsent(consent: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // localStorage unavailable
  }
  window.dispatchEvent(new CustomEvent("skai-consent-change", { detail: consent }));
}

/**
 * Quick boolean check — true only when explicitly granted.
 */
export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === "granted";
}
