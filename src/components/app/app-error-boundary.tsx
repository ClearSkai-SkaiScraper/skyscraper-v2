"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * AppErrorBoundary — Shared error UI for (app) sub-routes.
 *
 * Drop this into any (app) route's error.tsx:
 *   export { default } from "@/components/app/app-error-boundary";
 */
export default function AppErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  const pathname = usePathname();

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { component: "app-error-boundary", pathname: pathname || "unknown" },
      extra: { digest: error.digest },
    });
  }, [error, pathname]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-lg dark:border-red-900 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          Something went wrong. Please try again or return to the dashboard.
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        </p>
        // eslint-disable-next-line no-restricted-syntax
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-left text-sm dark:bg-red-900/20">
            <p className="font-medium text-red-800 dark:text-red-300">Error:</p>
            <p className="mt-1 text-red-700 dark:text-red-400">{error.message}</p>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset} className="flex-1 gap-2 bg-sky-600 hover:bg-sky-700">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => (window.location.href = "/dashboard")}
          >
            <Home className="h-4 w-4" /> Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
