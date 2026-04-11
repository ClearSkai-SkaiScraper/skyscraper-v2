"use client";
/* eslint-disable react/jsx-no-comment-textnodes, no-restricted-syntax */

import { motion } from "framer-motion";
import Link from "next/link";

interface PaymentErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PaymentErrorBoundary({ error, reset }: PaymentErrorBoundaryProps) {
  const isCardError = error.message.includes("card") || error.message.includes("payment method");
  const isStripeError =
    error.message.includes("stripe") || error.message.includes("payment failed");
  const isInsufficientFunds =
    error.message.includes("insufficient") || error.message.includes("declined");
  const isExpiredCard = error.message.includes("expired") || error.message.includes("exp_");

  const getErrorContent = () => {
    if (isExpiredCard) {
      return {
        title: "Card Expired",
        description:
          "Your payment method has expired. Please update your card information and try again.",
        action: "Update Payment Method",
        actionUrl: "/billing",
        icon: "💳",
      };
    }

    if (isInsufficientFunds) {
      return {
        title: "Payment Declined",
        description:
          "Your payment was declined by your bank. Please check your account or try a different payment method.",
        action: "Try Different Card",
        actionUrl: "/billing",
        icon: "🏦",
      };
    }

    if (isCardError) {
      return {
        title: "Card Error",
        description:
          "There was an issue with your payment method. Please verify your card details and try again.",
        action: "Update Card",
        actionUrl: "/billing",
        icon: "💳",
      };
    }

    if (isStripeError) {
      return {
        title: "Payment Processing Error",
        description:
          "There was a problem processing your payment. Please try again or contact support.",
        action: "Try Again",
        actionUrl: "/billing",
        icon: "💰",
      };
    }

    return {
      title: "Payment Error",
      description:
        "We couldn't process your payment. Please try again or contact support for assistance.",
      action: "Retry Payment",
      actionUrl: "/billing",
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
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-error text-4xl">
          {icon}
        </div>

        <h1 className="mb-4 text-3xl font-bold text-neutral-900">{title}</h1>

        <p className="mb-8 text-neutral-600">{description}</p>

        <div className="space-y-3">
          <Link
            href={actionUrl}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#147BFF] px-6 py-3 font-medium text-white transition-colors hover:bg-[#0366D6]"
          >
            {action}
          </Link>

          <button
            onClick={reset}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-200 px-6 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-300"
          >
            Try Again
          </button>

          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-neutral-100 px-6 py-3 font-medium text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            Back to Dashboard
          </Link>

          <div className="border-t border-neutral-200 pt-4">
            <p className="mb-2 text-sm text-neutral-500">Need help?</p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/support"
                className="text-sm text-[#147BFF] transition-colors hover:text-[#0366D6]"
              >
                Contact Support
              </Link>
              <Link
                href="/billing/faq"
                className="text-sm text-[#147BFF] transition-colors hover:text-[#0366D6]"
              >
                Billing FAQ
              </Link>
            </div>
          </div>
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
