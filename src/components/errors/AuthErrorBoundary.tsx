"use client";
/* eslint-disable react/jsx-no-comment-textnodes, no-restricted-syntax */

import { motion } from "framer-motion";
import Link from "next/link";

interface AuthErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthErrorBoundary({ error, reset }: AuthErrorBoundaryProps) {
  const isAuthError = error.message.includes("auth") || error.message.includes("unauthorized");
  const isTokenError = error.message.includes("token") || error.message.includes("insufficient");
  const isSubscriptionError =
    error.message.includes("subscription") || error.message.includes("plan");

  const getErrorContent = () => {
    if (isTokenError) {
      return {
        title: "Insufficient Tokens",
        description:
          "You don't have enough tokens to perform this action. Please purchase more tokens or upgrade your plan.",
        action: "Purchase Tokens",
        actionUrl: "/billing",
        icon: "💰",
      };
    }

    if (isSubscriptionError) {
      return {
        title: "Subscription Required",
        description:
          "This feature requires an active subscription. Please upgrade your plan to continue.",
        action: "View Plans",
        actionUrl: "/pricing",
        icon: "⭐",
      };
    }

    if (isAuthError) {
      return {
        title: "Authentication Required",
        description: "You need to sign in to access this feature. Please log in and try again.",
        action: "Sign In",
        actionUrl: "/sign-in",
        icon: "🔐",
      };
    }

    return {
      title: "Access Error",
      description:
        "There was a problem accessing this resource. Please try again or contact support.",
      action: "Try Again",
      actionUrl: null,
      icon: "⚠️",
    };
  };

  const { title, description, action, actionUrl, icon } = getErrorContent();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-6 text-6xl">{icon}</div>

        <h1 className="mb-4 text-3xl font-bold text-neutral-900">{title}</h1>

        <p className="mb-8 text-neutral-600">{description}</p>

        <div className="space-y-3">
          {actionUrl ? (
            <Link
              href={actionUrl}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#147BFF] px-6 py-3 font-medium text-white transition-colors hover:bg-[#0366D6]"
            >
              {action}
            </Link>
          ) : (
            <button
              onClick={reset}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#147BFF] px-6 py-3 font-medium text-white transition-colors hover:bg-[#0366D6]"
            >
              {action}
            </button>
          )}

          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-200 px-6 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-300"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* eslint-disable-next-line no-restricted-syntax */}
        {process.env.NODE_ENV === "development" && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-sm text-neutral-500">
              Error Details (Development)
            </summary>
            <pre className="mt-2 overflow-auto rounded-lg bg-neutral-100 p-4 text-xs text-neutral-700">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </motion.div>
    </div>
  );
}
