"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { trackSubscriptionCompleted } from "@/lib/analytics.client";
import { logger } from "@/lib/logger";

function SuccessContent() {
  const sp = useSearchParams();

  // Snapshot values so they don't change mid-render
  const params = useMemo(() => {
    return {
      sessionId: sp?.get("session_id") ?? null,
      source: sp?.get("source") ?? null,
      status: sp?.get("status") ?? null,
    };
  }, [sp]);

  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    if (params.sessionId) {
      // Verify the session and track the success
      void verifySession(params.sessionId);
    } else {
      setLoading(false);
    }
  }, [params.sessionId]);

  const verifySession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/verify-session?session_id=${sessionId}`);
      const data = await response.json();

      if (data.success) {
        setSessionData(data.session);

        // Track successful subscription with trial
        if (data.session.mode === "subscription" && typeof window !== "undefined") {
          trackSubscriptionCompleted(
            data.session.metadata?.planKey || "unknown",
            data.session.amount_total / 100, // Convert from cents
            sessionId
          );
        }
      }
    } catch (error) {
      logger.error("Failed to verify session:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Confirming your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="mb-4 text-4xl font-bold text-gray-900">Welcome to SkaiScraper™</h1>

          <p className="mb-6 text-xl text-gray-700">
            Your 3-day free trial has started successfully
          </p>

          <div className="mx-auto mb-8 max-w-2xl rounded-xl bg-white p-8 shadow-lg">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">What happens next?</h2>

            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                  1
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">Explore All Features</h3>
                  <p className="text-gray-600">
                    You have full access to SkaiScraper™ for the next 3 days. Try AI mockups,
                    weather reports, and PDF generation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                  2
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">No Charge Until November 4th</h3>
                  <p className="text-gray-600">
                    Your trial ends on November 4th. You&apos;ll only be charged if you keep your
                    subscription active.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                  3
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">Share Your Feedback</h3>
                  <p className="text-gray-600">
                    Help us improve by sharing feedback. Beta users get bonus tokens!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/contact#feedback"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Leave Feedback
            </Link>
          </div>

          {sessionData && (
            <div className="mt-8 text-sm text-gray-500">
              <p>Session ID: {params.sessionId}</p>
              <p>Trial ends: November 4, 2025</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
