"use client";
/* eslint-disable react/jsx-no-comment-textnodes, no-restricted-syntax */

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * RouteErrorBoundary — Shared error UI for pro dashboard sub-routes.
 *
 * Usage in any route's error.tsx:
 *   "use client";
 *   export { default } from "@/components/shared/route-error-boundary";
 *
 * Or with custom title/description:
 *   import RouteErrorBoundary from "@/components/shared/route-error-boundary";
 *   export default function MyError(props: { error: Error & { digest?: string }; reset: () => void }) {
 *     return <RouteErrorBoundary {...props} title="Claims Error" backHref="/claims" />;
 *   }
 */
export default function RouteErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
  description = "We couldn\u2019t load this page. This is usually temporary.",
  backHref = "/dashboard",
  backLabel = "Dashboard",
  sentryTag = "route-error-boundary",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  sentryTag?: string;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { component: sentryTag },
      extra: { digest: error.digest },
    });
    console.error(`[${sentryTag}]`, error.message);
  }, [error, sentryTag]);

  return (
    <div className="container mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/40">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
        <h2 className="mt-4 text-xl font-bold text-red-700 dark:text-red-300">{title}</h2>
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{description}</p>
        // eslint-disable-next-line no-restricted-syntax
        // eslint-disable-next-line no-restricted-syntax
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mt-4 rounded-lg bg-red-100 p-3 text-left text-xs dark:bg-red-900/30">
            <p className="font-mono text-red-800 dark:text-red-300">{error.message}</p>
            {error.digest && <p className="mt-1 font-mono text-red-500">Digest: {error.digest}</p>}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => reset()} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="ghost" className="gap-2">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
