"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ClaimWorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { component: "claim-workspace-error-boundary" },
      extra: { digest: error.digest },
    });
    console.error("[Claim Workspace Error]", error.message, error.stack);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/40">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="mt-4 text-xl font-bold text-amber-700 dark:text-amber-300">
          Page Load Error
        </h2>
        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
          This page failed to load. This is usually temporary — try refreshing.
        </p>
        {error.message && (
          <p className="mt-2 rounded bg-amber-100 p-2 font-mono text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            {error.message.slice(0, 200)}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => reset()} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/claims">
              <ArrowLeft className="h-4 w-4" />
              Back to Claims
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
