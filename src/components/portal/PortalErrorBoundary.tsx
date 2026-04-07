"use client";

import * as Sentry from "@sentry/nextjs";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PortalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console and monitoring service
    console.error("[PORTAL_ERROR_BOUNDARY] Caught error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Send to Sentry
    Sentry.captureException(error, {
      tags: { boundary: "portal" },
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="max-w-md rounded-xl border-2 border-red-200 bg-red-50 p-8 text-center shadow-lg dark:border-red-800 dark:bg-red-950/30">
            <div className="mb-4 inline-flex rounded-full bg-red-100 p-4 dark:bg-red-900/40">
              <svg
                className="h-8 w-8 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Portal Error</h2>
            <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
              {this.state.error?.message || "Something went wrong loading this page."}
            </p>
            <p className="mb-6 text-xs text-gray-600 dark:text-gray-400">
              Our team has been notified. Try refreshing or returning to the portal home.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="block w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Refresh Page
              </button>
              <a
                href="/portal"
                className="block w-full rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
              >
                Return to Portal
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
