"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type ConsentState,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "@/lib/analytics/consent";

/**
 * React hook for managing analytics consent state.
 *
 * Usage:
 *   const { analyticsAllowed, grant, deny } = useConsent();
 *   if (!analyticsAllowed) return <ConsentBanner onAccept={grant} onDecline={deny} />;
 */
export function useConsent() {
  const [consent, setConsent] = useState<ConsentState>("unset");

  useEffect(() => {
    // Read persisted consent on mount
    setConsent(getAnalyticsConsent());

    // Listen for changes (e.g., from Settings page)
    const handler = (e: Event) => {
      setConsent((e as CustomEvent<ConsentState>).detail);
    };
    window.addEventListener("skai-consent-change", handler);
    return () => window.removeEventListener("skai-consent-change", handler);
  }, []);

  const grant = useCallback(() => setAnalyticsConsent("granted"), []);
  const deny = useCallback(() => setAnalyticsConsent("denied"), []);

  return {
    /** Current consent state: "granted" | "denied" | "unset" */
    consent,
    /** true only when consent === "granted" */
    analyticsAllowed: consent === "granted",
    /** Set consent to "granted" — enables PostHog capturing */
    grant,
    /** Set consent to "denied" — disables PostHog capturing */
    deny,
  };
}
