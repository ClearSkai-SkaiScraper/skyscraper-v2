"use client";

import { FileText, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const BANNER_DISMISSED_KEY = "skai-cover-page-banner-dismissed";

export function CoverPageBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(BANNER_DISMISSED_KEY) === "true";
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
  };

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-4 py-3 dark:border-amber-800/40 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30">
      {/* Accent shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50 dark:via-white/5" />

      <div className="relative flex items-center gap-3">
        <div className="shrink-0 rounded-lg bg-amber-500/10 p-1.5 dark:bg-amber-500/20">
          <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="flex-1 text-sm text-amber-900 dark:text-amber-200">
          <span className="font-medium">Almost there!</span> After you finish your company branding,
          head over to{" "}
          <Link
            href="/settings/branding/cover-page"
            className="font-semibold underline decoration-amber-400 underline-offset-2 hover:decoration-amber-600"
          >
            complete your cover page
          </Link>
          !
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-amber-600 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/40 dark:hover:text-amber-200"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
