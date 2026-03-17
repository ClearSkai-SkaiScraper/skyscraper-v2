"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

import { getAnalyticsConsent } from "@/lib/analytics/consent";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    capture_pageleave: true,
    // ── Consent Gate ─────────────────────────────────────────────────────
    // Start opted-out. All capture() calls silently no-op until consent
    // is granted via setAnalyticsConsent("granted").
    // See: src/lib/analytics/consent.ts + src/hooks/useConsent.ts
    opt_out_capturing_by_default: true,
  });

  // Apply any previously stored consent
  const storedConsent = getAnalyticsConsent();
  if (storedConsent === "granted") {
    posthog.opt_in_capturing();
  }

  // React to consent changes in real-time (e.g., user toggles in Settings)
  window.addEventListener("skai-consent-change", (e) => {
    const detail = (e as CustomEvent).detail;
    if (detail === "granted") {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }
  });
}

export function PostHogPageview(): JSX.Element {
  useEffect(() => {
    if (typeof window !== "undefined") {
      posthog?.capture("$pageview");
    }
  }, []);

  return <></>;
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

// Analytics helper functions
export const analytics = {
  // Subscription events
  subscriptionActivated: (plan: string, orgId: string) => {
    posthog?.capture("subscription_activated", {
      plan,
      orgId,
    });
  },

  // Payment events
  paidActionSuccess: (action: string, amount?: number, tokensGranted?: number) => {
    posthog?.capture("paid_action_success", {
      action,
      amount,
      tokensGranted,
    });
  },

  paidActionBlocked: (action: string, reason: string, balance?: number) => {
    posthog?.capture("paid_action_blocked", {
      action,
      reason,
      balance,
    });
  },

  // Top-up events
  topupCompleted: (amount: number, bonus: number, newBalance: number) => {
    posthog?.capture("topup_completed", {
      amount,
      bonus,
      newBalance,
    });
  },

  // Low balance events
  lowBalanceBannerShown: (balance: number, threshold: number) => {
    posthog?.capture("low_balance_banner_shown", {
      balance,
      threshold,
    });
  },

  // Tool usage events
  toolUsed: (tool: string, tokensSpent: number, success: boolean) => {
    posthog?.capture("tool_used", {
      tool,
      tokensSpent,
      success,
    });
  },

  // User identification
  identify: (userId: string, properties?: Record<string, any>) => {
    posthog?.identify(userId, properties);
  },

  // Reset on logout
  reset: () => {
    posthog?.reset();
  },
};
