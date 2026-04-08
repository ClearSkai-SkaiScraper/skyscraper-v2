"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorCardProps {
  /** The error object from the error boundary */
  error: Error & { digest?: string };
  /** Reset function provided by Next.js error boundary */
  reset: () => void;
  /** Module name for console + Sentry tagging (e.g. "Claims", "Billing") */
  module: string;
  /** Fallback navigation href (defaults to /dashboard) */
  fallbackHref?: string;
  /** Fallback navigation label (defaults to "Dashboard") */
  fallbackLabel?: string;
  /** Additional className */
  className?: string;
}

/**
 * Shared error card for Next.js error.tsx boundaries.
 *
 * Logs to console, reports to Sentry, and shows a user-friendly error with
 * retry + navigation actions.
 *
 * @example
 * // src/app/(app)/claims/error.tsx
 * "use client";
 * import { ErrorCard } from "@/components/ui/error-card";
 * export default function ClaimsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
 *   return <ErrorCard error={error} reset={reset} module="Claims" />;
 * }
 */
export function ErrorCard({
  error,
  reset,
  module,
  fallbackHref = "/dashboard",
  fallbackLabel = "Dashboard",
  className,
}: ErrorCardProps) {
  useEffect(() => {
    console.error(`[${module}Error]`, error);
    Sentry.captureException(error, {
      tags: { module: module.toLowerCase() },
    });
  }, [error, module]);

  return (
    <div className={cn("container mx-auto max-w-2xl px-6 py-16", className)}>
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/40">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-red-900 dark:text-red-100">
          {module} Unavailable
        </h2>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          {error?.message || "An unexpected error occurred."}
          {error?.digest && <span className="ml-1 text-xs text-red-500/70">({error.digest})</span>}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => reset()} variant="outline" size="sm">
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={fallbackHref}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {fallbackLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
