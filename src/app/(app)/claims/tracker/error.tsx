"use client";

import { useEffect } from "react";

export default function TrackerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ClaimsTracker] Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
        <div className="mb-4 text-4xl">📊</div>
        <h2 className="mb-2 text-xl font-bold text-white">Claims Tracker Unavailable</h2>
        <p className="mb-6 text-slate-400">
          The pipeline tracker encountered an issue loading your claims. This is usually temporary.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Try Again
          </button>
          <a
            href="/claims"
            className="rounded-lg border border-white/20 px-6 py-2.5 font-medium text-slate-300 transition-colors hover:bg-white/10"
          >
            Claims List
          </a>
        </div>
      </div>
    </div>
  );
}
