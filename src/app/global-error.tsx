"use client";

import { useEffect } from "react";

import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    logger.error("Global error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 text-center shadow-lg">
        <div className="mb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-900/30">
            <svg
              className="h-6 w-6 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-white">Something went wrong</h2>
        <p className="mb-4 text-sm text-slate-400">
          An unexpected error occurred. Please try again.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mb-4 overflow-auto rounded bg-slate-800 p-2 text-left text-xs text-slate-300">
            {error.message}
          </pre>
        )}
        <div className="space-y-2">
          <button
            onClick={reset}
            className="w-full rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="w-full rounded bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
