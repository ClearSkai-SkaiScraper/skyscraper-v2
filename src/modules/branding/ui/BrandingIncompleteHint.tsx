"use client";

/**
 * Branding Incomplete Hint
 * Small inline notification when branding is not complete
 */

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function BrandingIncompleteHint() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void checkBrandingStatus();
  }, []);

  async function checkBrandingStatus() {
    try {
      const res = await fetch("/api/branding/status");
      if (res.ok) {
        const data = await res.json();
        // API returns { isComplete, branding: {...}, requirements: {...} }
        const branding = data.branding || {};
        const incomplete = !(branding.logoUrl && branding.companyName && branding.colorPrimary);
        setShow(incomplete);
      }
    } catch (error) {
      console.error("Failed to check branding status:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !show) return null;

  return (
    <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600 dark:text-orange-400" />
        <div className="flex-1">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            Branding is not complete — exports will use defaults.{" "}
            <Link href="/settings/branding" className="font-medium underline hover:no-underline">
              Complete branding
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
