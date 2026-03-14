"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function ClaimsReadyFolderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[ClaimsReadyFolder] Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
          Claims Assembly Error
        </h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Something went wrong loading the Claims Assembly. Try refreshing — if the issue persists,
          contact support.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/claims")}>
            Back to Claims
          </Button>
        </div>
        {error.digest && <p className="mt-4 text-xs text-gray-400">Error ID: {error.digest}</p>}
      </div>
    </div>
  );
}
