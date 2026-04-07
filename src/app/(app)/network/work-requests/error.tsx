"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function WorkRequestsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[WORK_REQUESTS_ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-950/20">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
              <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-700 dark:text-red-300">
                Failed to load work requests
              </h2>
              <p className="mt-2 text-sm text-red-600/80 dark:text-red-400/80">
                {error.message || "Something went wrong. Please try again."}
              </p>
              {error.digest && (
                <p className="mt-1 text-xs text-red-500/60">Error ID: {error.digest}</p>
              )}
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" onClick={() => router.push("/trades/jobs")}>
                Go to Job Board
              </Button>
              <Button onClick={reset} className="gap-2 bg-red-600 hover:bg-red-700">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
