"use client";

import { useEffect } from "react";

export default function FinancialError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ClaimFinancial] Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <div className="mb-4 text-4xl">💵</div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">Financial Analysis Error</h2>
        <p className="mb-6 text-gray-600">
          Something went wrong loading the financial analysis for this claim. This is usually
          temporary — try refreshing.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700"
          >
            Try Again
          </button>
          <a
            href="/claims"
            className="rounded-lg border border-gray-300 px-6 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Claims
          </a>
        </div>
      </div>
    </div>
  );
}
