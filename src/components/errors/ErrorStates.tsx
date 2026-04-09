/**
 * Error State Components
 *
 * User-friendly error messages with actionable next steps.
 * Consistent error UX across the application.
 *
 * NOTE: Trimmed in Lane G2 — only actively-used exports remain.
 * For full-page errors use: next.js error.tsx boundaries
 * For empty states use: @/components/ui/empty-state
 * For inline errors use: form-level validation in shadcn Form
 */

import { AlertCircle, Mail, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onRetry?: () => void;
  variant?: "error" | "warning" | "info";
  showSupport?: boolean;
}

/**
 * Generic error message component
 */
export function ErrorMessage({
  title,
  message,
  actionLabel,
  actionHref,
  onRetry,
  variant = "error",
  showSupport = true,
}: ErrorMessageProps) {
  const variantStyles = {
    error:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
    warning:
      "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
    info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
  };

  const iconColor = {
    error: "text-red-500",
    warning: "text-yellow-500",
    info: "text-blue-500",
  };

  return (
    <div className={cn("rounded-lg border p-6", variantStyles[variant])}>
      <div className="flex items-start gap-4">
        <AlertCircle className={cn("h-6 w-6 flex-shrink-0", iconColor[variant])} />
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm opacity-90">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}

            {actionHref && actionLabel && (
              <Link href={actionHref}>
                <Button variant="outline" size="sm">
                  {actionLabel}
                </Button>
              </Link>
            )}

            {showSupport && (
              <Link href="/feedback">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Support
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Claim not found error
 */
export function ClaimNotFoundError({ claimId }: { claimId: string }) {
  return (
    <ErrorMessage
      title="Claim Not Found"
      message={`We couldn't find claim "${claimId}". It may have been deleted or you don't have permission to view it.`}
      actionLabel="Go to Claims"
      actionHref="/claims"
      variant="warning"
    />
  );
}


