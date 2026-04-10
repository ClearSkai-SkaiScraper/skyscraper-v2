"use client";

/**
 * ============================================================================
 * GenericErrorBoundary — Reusable error.tsx component
 * ============================================================================
 *
 * Drop into any route segment's error.tsx to get a polished error page
 * with retry, navigation, and support link. Fully branded for SkaiScraper.
 *
 * Usage in error.tsx:
 *   export { GenericErrorBoundary as default } from "@/components/errors/GenericErrorBoundary";
 *
 * Or with customisation:
 *   export default function ErrorPage(props) {
 *     return <GenericErrorBoundary {...props} title="Claims Error" />;
 *   }
 */

import { useEffect } from "react";

interface GenericErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Custom heading — defaults to "Something went wrong" */
  title?: string;
  /** Custom sub-message */
  description?: string;
  /** Show the technical error message (dev only) */
  showDetails?: boolean;
}

export function GenericErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
  description,
  // eslint-disable-next-line no-restricted-syntax
  showDetails = process.env.NODE_ENV === "development",
}: GenericErrorBoundaryProps) {
  useEffect(() => {
    // Log to external error tracking (Sentry, etc.)
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg
          className="h-8 w-8 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>

      <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
        {description ||
          "We hit an unexpected error. This has been logged and our team has been notified."}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Try Again
        </button>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Go to Dashboard
        </button>
      </div>

      {/* Dev details */}
      {showDetails && (
        <details className="mt-8 w-full max-w-lg rounded-lg border border-gray-200 bg-gray-50 p-4 text-left dark:border-gray-700 dark:bg-gray-900">
          <summary className="cursor-pointer text-sm font-medium text-gray-500 dark:text-gray-400">
            Technical Details
          </summary>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-red-600 dark:text-red-400">
            {error.message}
            {error.digest && `\n\nDigest: ${error.digest}`}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}

      {/* Support link */}
      <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
        Persistent issue?{" "}
        <a href="/feedback" className="text-blue-500 underline hover:text-blue-600">
          Contact support
        </a>
        {error.digest && (
          <span className="ml-2">
            (Ref: <code className="text-xs">{error.digest}</code>)
          </span>
        )}
      </p>
    </div>
  );
}

export default GenericErrorBoundary;
