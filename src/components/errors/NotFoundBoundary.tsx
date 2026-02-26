"use client";

/**
 * ============================================================================
 * NotFoundBoundary — Reusable not-found.tsx component
 * ============================================================================
 *
 * Drop into any route segment's not-found.tsx:
 *   export { NotFoundBoundary as default } from "@/components/errors/NotFoundBoundary";
 */

interface NotFoundBoundaryProps {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function NotFoundBoundary({
  title = "Page Not Found",
  description = "The page you're looking for doesn't exist or has been moved.",
  backHref = "/dashboard",
  backLabel = "Back to Dashboard",
}: NotFoundBoundaryProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <span className="text-3xl">🔍</span>
      </div>

      <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>

      <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">{description}</p>

      <a
        href={backHref}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {backLabel}
      </a>
    </div>
  );
}

export default NotFoundBoundary;
