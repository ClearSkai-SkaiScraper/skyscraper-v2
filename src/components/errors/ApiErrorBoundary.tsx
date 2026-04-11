"use client";
/* eslint-disable react/jsx-no-comment-textnodes, no-restricted-syntax */

import { motion } from "framer-motion";
import Link from "next/link";

interface ApiErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ApiErrorBoundary({ error, reset }: ApiErrorBoundaryProps) {
  const isNetworkError = error.message.includes("fetch") || error.message.includes("network");
  const isRateLimitError = error.message.includes("rate limit") || error.message.includes("429");
  const isServerError =
    error.message.includes("500") || error.message.includes("Internal Server Error");
  const is404Error = error.message.includes("404") || error.message.includes("Not Found");

  const getErrorContent = () => {
    if (isRateLimitError) {
      return {
        title: "Rate Limit Exceeded",
        description: "You've made too many requests. Please wait a moment before trying again.",
        action: "Try Again",
        icon: "🚦",
        color: "orange",
      };
    }

    if (isNetworkError) {
      return {
        title: "Connection Error",
        description:
          "Unable to connect to our servers. Please check your internet connection and try again.",
        action: "Retry",
        icon: "📡",
        color: "blue",
      };
    }

    if (isServerError) {
      return {
        title: "Server Error",
        description:
          "Our servers are experiencing issues. We've been notified and are working on a fix.",
        action: "Try Again",
        icon: "🔧",
        color: "red",
      };
    }

    if (is404Error) {
      return {
        title: "Not Found",
        description: "The resource you're looking for doesn't exist or has been moved.",
        action: "Go Back",
        icon: "🔍",
        color: "gray",
      };
    }

    return {
      title: "API Error",
      description: "There was a problem communicating with our servers. Please try again.",
      action: "Retry",
      icon: "⚡",
      color: "red",
    };
  };

  const { title, description, action, icon, color } = getErrorContent();

  const colorClasses = {
    blue: "bg-blue-500",
    red: "bg-red-500",
    orange: "bg-orange-500",
    gray: "bg-gray-500",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div
          className={`mx-auto mb-6 h-24 w-24 ${
            colorClasses[color as keyof typeof colorClasses]
          } flex items-center justify-center rounded-3xl text-4xl`}
        >
          {icon}
        </div>

        <h1 className="mb-4 text-3xl font-bold text-neutral-900">{title}</h1>

        <p className="mb-8 text-neutral-600">{description}</p>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#147BFF] px-6 py-3 font-medium text-white transition-colors hover:bg-[#0366D6]"
          >
            {action}
          </button>

          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-200 px-6 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-300"
          >
            Back to Dashboard
          </Link>

          <Link
            href="/support"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-700"
          >
            Contact Support
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
