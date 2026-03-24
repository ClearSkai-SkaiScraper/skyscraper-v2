"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function DocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { component: "documents-error-boundary" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-sm dark:bg-slate-900">
        <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Documents Error</h2>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          Something went wrong loading documents. Please try again.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={() => reset()} variant="default">
            Try again
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard">Dashboard</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
