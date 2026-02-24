"use client";

/**
 * Branding CTA Banner
 * Global banner shown when branding is incomplete
 */

import { Palette, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function BrandingCtaBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void checkBrandingStatus();

    // Also check if branding-complete class was added by BrandingProvider
    const checkInterval = setInterval(() => {
      if (document.documentElement.classList.contains("branding-complete")) {
        setShow(false);
        setLoading(false);
        clearInterval(checkInterval);
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, []);

  async function checkBrandingStatus() {
    try {
      // Check if BrandingProvider already marked branding as complete
      if (document.documentElement.classList.contains("branding-complete")) {
        setShow(false);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/branding/status");
      if (res.ok) {
        const data = await res.json();
        // API returns { isComplete, branding: {...}, requirements: {...} }
        const branding = data.branding || {};
        const incomplete = !(branding.logoUrl && branding.companyName && branding.colorPrimary);

        // Check if user dismissed this session
        const wasDismissed = sessionStorage.getItem("branding-banner-dismissed") === "true";

        // Remove any stale localStorage flags
        localStorage.removeItem("show-branding-banner");

        setShow(incomplete && !wasDismissed);
      }
    } catch (error) {
      console.error("Failed to check branding status:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    setShow(false);
    sessionStorage.setItem("branding-banner-dismissed", "true");
  }

  if (loading || !show || dismissed) return null;

  return (
    <div className="border-b border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Palette className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            Complete your company branding to unlock polished exports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings/branding"
            className="rounded-md bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
          >
            Open Branding
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-md p-1 text-orange-600 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
