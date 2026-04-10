"use client";

import { AlertTriangle, ChevronDown, Home, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

/**
 * Global Error Recovery Boundary
 *
 * Catches unhandled errors and shows a user-friendly recovery screen
 * with actionable buttons: Retry, Go Home, Report.
 *
 * This is designed for the app shell — catches errors that escape
 * page-level error.tsx boundaries.
 *
 * Usage:
 *   <GlobalErrorRecovery>
 *     <AppContent />
 *   </GlobalErrorRecovery>
 */
export class GlobalErrorRecovery extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    console.error("[GlobalErrorRecovery] Uncaught error:", error, errorInfo);

    // Report to Sentry if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== "undefined" && (window as any).Sentry) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Sentry.captureException(error, {
        extra: { componentStack: errorInfo.componentStack },
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
  };

  handleHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  };

  handleReport = () => {
    // Open feedback widget if available, otherwise mailto
    const errorMsg = this.state.error?.message || "Unknown error";
    const url = typeof window !== "undefined" ? window.location.href : "";

    if (typeof window !== "undefined") {
      const subject = encodeURIComponent("Bug Report: Application Error");
      const body = encodeURIComponent(
        `Error: ${errorMsg}\nPage: ${url}\nTimestamp: ${new Date().toISOString()}`
      );
      window.open(`mailto:support@skaiscrape.com?subject=${subject}&body=${body}`);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
          <div className="w-full max-w-md space-y-6 text-center">
            {/* Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>

            {/* Message */}
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Something went wrong
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                We hit an unexpected error. Your data is safe — you can retry or go back to the
                dashboard.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={this.handleHome}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </button>
            </div>

            {/* Report link */}
            <button
              onClick={this.handleReport}
              className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Report this issue
            </button>

            // eslint-disable-next-line react/jsx-no-comment-textnodes
            {/* Expandable error details (dev only) */}
            // eslint-disable-next-line no-restricted-syntax
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mt-4 text-left">
                <button
                  onClick={() => this.setState((s) => ({ ...s, showDetails: !s.showDetails }))}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
                >
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      this.state.showDetails ? "rotate-180" : ""
                    }`}
                  />
                  Error details
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-zinc-100 p-3 text-xs text-red-700 dark:bg-zinc-900 dark:text-red-400">
                    {this.state.error.message}
                    {"\n\n"}
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
