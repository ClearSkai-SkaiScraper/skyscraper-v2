import React from "react";

import { logger } from "@/lib/logger";

import ApiErrorBoundary from "./ApiErrorBoundary";
import AuthErrorBoundary from "./AuthErrorBoundary";
import PaymentErrorBoundary from "./PaymentErrorBoundary";

/**
 * Smart error boundary that chooses the appropriate error component
 * based on the error type and context
 */
export function SmartErrorBoundary({
  error,
  reset,
  context = "general",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  context?: "auth" | "payment" | "api" | "general";
}) {
  // Determine error type from message and context
  const errorMessage = error.message.toLowerCase();

  const isAuthError =
    context === "auth" ||
    errorMessage.includes("auth") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("token") ||
    errorMessage.includes("subscription") ||
    errorMessage.includes("insufficient");

  const isPaymentError =
    context === "payment" ||
    errorMessage.includes("stripe") ||
    errorMessage.includes("payment") ||
    errorMessage.includes("card") ||
    errorMessage.includes("declined") ||
    errorMessage.includes("billing");

  const isApiError =
    context === "api" ||
    errorMessage.includes("fetch") ||
    errorMessage.includes("network") ||
    errorMessage.includes("500") ||
    errorMessage.includes("404") ||
    errorMessage.includes("rate limit");

  if (isAuthError) {
    return <AuthErrorBoundary error={error} reset={reset} />;
  }

  if (isPaymentError) {
    return <PaymentErrorBoundary error={error} reset={reset} />;
  }

  if (isApiError) {
    return <ApiErrorBoundary error={error} reset={reset} />;
  }

  // Default to API error boundary for unknown errors
  return <ApiErrorBoundary error={error} reset={reset} />;
}

// HOC for wrapping components with smart error boundary
export function withSmartErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  context?: "auth" | "payment" | "api" | "general"
) {
  return function SmartErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundaryWrapper context={context}>
        <Component {...props} />
      </ErrorBoundaryWrapper>
    );
  };
}

// React Error Boundary component
class ErrorBoundaryWrapper extends React.Component<
  { children: React.ReactNode; context?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; context?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);

    // Report to error tracking service in production
    // eslint-disable-next-line no-restricted-syntax
    if (process.env.NODE_ENV === "production") {
      // Sentry is already configured, errors will be automatically captured
      logger.error("Production error:", error);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <SmartErrorBoundary
          error={this.state.error}
          reset={() => this.setState({ hasError: false, error: null })}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          context={this.props.context as any}
        />
      );
    }

    return this.props.children;
  }
}

// Export the wrapper for direct use
export { ErrorBoundaryWrapper };
