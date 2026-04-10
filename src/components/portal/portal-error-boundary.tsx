"use client";
/* eslint-disable react/jsx-no-comment-textnodes, no-restricted-syntax */

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

/**
 * PortalErrorBoundary — Shared error UI for portal sub-routes.
 *
 * Drop this into any portal route's error.tsx:
 *   export { default } from "@/components/portal/portal-error-boundary";
 *
 * Or wrap with custom messaging:
 *   export default function MyError(props) {
 *     return <PortalErrorBoundary {...props} title="Claims Error" />;
 *   }
 */
export default function PortalErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  useEffect(() => {
    logger.error("[Portal Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 bg-white/80 backdrop-blur-sm dark:border-red-900 dark:bg-slate-900/80">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>
            Something went wrong loading this page. Don&apos;t worry, your data is safe.
          </CardDescription>
        </CardHeader>
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        <CardContent className="space-y-4">
          // eslint-disable-next-line no-restricted-syntax
          // eslint-disable-next-line no-restricted-syntax
          {process.env.NODE_ENV === "development" && error.message && (
            <div className="rounded-lg bg-red-50 p-3 text-sm dark:bg-red-900/20">
              <p className="font-medium text-red-800 dark:text-red-300">Error Details:</p>
              <p className="mt-1 text-red-700 dark:text-red-400">{error.message}</p>
              {error.digest && <p className="mt-1 text-xs text-red-500">Digest: {error.digest}</p>}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={reset}
              variant="default"
              className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => (window.location.href = "/portal")}
            >
              <Home className="h-4 w-4" /> Go to Portal
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            If this problem persists, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
