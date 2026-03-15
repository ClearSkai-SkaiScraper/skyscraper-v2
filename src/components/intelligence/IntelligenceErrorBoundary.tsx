"use client";

/**
 * Intelligence Error Boundary
 *
 * Wraps intelligence panels with graceful error handling.
 * Shows a user-friendly fallback when an engine fails instead of crashing.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw } from "lucide-react";
import React from "react";

interface Props {
  children: React.ReactNode;
  /** Panel name for the error message */
  panelName?: string;
  /** Optional compact mode */
  compact?: boolean;
  /** Optional className */
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class IntelligenceErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[IntelligenceErrorBoundary] ${this.props.panelName ?? "Panel"} crashed:`,
      error,
      errorInfo
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { panelName = "Intelligence Panel", compact } = this.props;

      if (compact) {
        return (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/30",
              this.props.className
            )}
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-400">{panelName} unavailable</span>
            <button
              onClick={this.handleRetry}
              className="ml-auto text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }

      return (
        <Card className={cn("border-amber-200 dark:border-amber-800", this.props.className)}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              {panelName} Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This panel encountered an error and couldn&apos;t load. This usually resolves on
              retry.
            </p>
            {this.state.error && (
              <p className="mt-2 font-mono text-xs text-red-500/70">
                {this.state.error.message.slice(0, 200)}
              </p>
            )}
            <button
              onClick={this.handleRetry}
              className="mt-3 flex items-center gap-1.5 rounded-md bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-900/60"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap any intelligence component with error boundary
 */
export function withIntelligenceErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  panelName: string
) {
  const WrappedComponent = (props: P) => (
    <IntelligenceErrorBoundary panelName={panelName}>
      <Component {...props} />
    </IntelligenceErrorBoundary>
  );
  WrappedComponent.displayName = `withErrorBoundary(${panelName})`;
  return WrappedComponent;
}
