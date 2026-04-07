"use client";

import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ClaimsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ClaimsError]", error);
  }, [error]);

  return (
    <div className="container mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/40">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
        <h2 className="mt-4 text-xl font-bold text-red-700 dark:text-red-300">
          Claims Unavailable
        </h2>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          We couldn&apos;t load claims. This is usually temporary.
        </p>
        <p className="mt-2 rounded bg-red-100 p-2 font-mono text-xs text-red-800 dark:bg-red-900/50 dark:text-red-300">
          {error?.message || "Unknown error"} {error?.digest ? `(${error.digest})` : ""}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => reset()} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
