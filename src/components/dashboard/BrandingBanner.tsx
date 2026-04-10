"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface BrandingBannerProps {
  brandingCompleted: boolean;
  onboardingCompleted: boolean;
}

export function BrandingBanner({ brandingCompleted, onboardingCompleted }: BrandingBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("branding-banner-dismissed") === "true";
    }
    return false;
  });
  const [showBanner, setShowBanner] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [initComplete, setInitComplete] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("branding-banner-dismissed", "true");
    } catch {
      // localStorage may be unavailable
    }
  };

  useEffect(() => {
    // Hide banner if branding-complete class exists on html
    if (
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("branding-complete")
    ) {
      setShowBanner(false);
      return;
    }

    // DISABLED: Auto-initialize was causing infinite reload loops
    // because brandingCompleted/onboardingCompleted flags don't exist in DB schema.
    // Users should manually click "Complete Branding" button instead.
    // if (!brandingCompleted && !onboardingCompleted && !initializing && !initComplete) {
    //   handleInitialize();
    // }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleInitialize() {
    setInitializing(true);
    try {
      const response = await fetch("/api/org/initialize", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setInitComplete(true);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        logger.warn("[BrandingBanner] Initialization failed:", data);
        // Silently handle error - don't block demo
      }
    } catch (error) {
      logger.error("[BrandingBanner] Network error:", error);
      // Silently handle error - don't block demo
    } finally {
      setInitializing(false);
    }
  }

  // D-3 FIX: Hide banner only when BOTH flags are true
  const shouldHideBanner = brandingCompleted && onboardingCompleted;

  if (shouldHideBanner || dismissed || !showBanner) {
    return null;
  }

  // Determine banner message based on completion state
  const title = !brandingCompleted ? "Finish your company branding" : "Complete account setup";
  const description = !brandingCompleted
    ? "Complete your profile to unlock PDFs & client-facing assets"
    : "Finish the onboarding wizard to activate all features";

  return (
    <div className="mb-6 w-full rounded-xl border border-yellow-300/50 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎨</span>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300">{description}</p>
            {initializing && (
              <p className="mt-1 text-sm text-blue-400">Setting up your account...</p>
            )}
            {initComplete && (
              <p className="mt-1 text-sm font-bold text-green-400">
                ✅ Account ready! Reloading...
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!initComplete && !initializing && (
            <Link
              href={!brandingCompleted ? "/settings/branding" : "/onboarding"}
              className="rounded-lg bg-[color:var(--primary)] px-4 py-2 font-medium text-white hover:opacity-90"
            >
              {!brandingCompleted ? "Complete Branding →" : "Finish Onboarding →"}
            </Link>
          )}
          <button
            onClick={handleDismiss}
            className="px-3 py-2 text-gray-200 transition-colors hover:text-white"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
