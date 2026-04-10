"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * SubscriptionGate — shown when a user's trial has expired or they have no subscription.
 * Replaces the dashboard content with a clean paywall.
 * Platform admins never see this (checked server-side before rendering).
 *
 * PASSTHROUGH ROUTES: /settings/billing and /settings/* are always accessible
 * so users can manage their subscription even when expired.
 */
export function SubscriptionGate({
  orgName,
  children,
}: {
  orgName?: string;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();

  // Always let users access billing/settings pages to subscribe or manage
  const passthroughPrefixes = ["/settings", "/billing", "/support", "/sign-out"];
  const isPassthrough = passthroughPrefixes.some((p) => pathname?.startsWith(p));

  if (isPassthrough && children) {
    return <>{children}</>;
  }
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-900">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <svg
            className="h-8 w-8 text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Subscribe to Continue
        </h1>

        {/* Description */}
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {orgName ? (
            <>
              <strong>{orgName}</strong>&apos;s free trial has ended.
            </>
          ) : (
            "Your free trial has ended."
          )}{" "}
          Subscribe to SkaiScraper Pro to unlock your full dashboard — AI damage analysis, report
          builder, claim management, and more.
        </p>

        {/* Price */}
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            $80<span className="text-base font-normal text-slate-500">/seat/month</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Includes unlimited AI analysis, reports, claims, and team collaboration
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/settings/billing"
          className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Start Subscription →
        </Link>

        {/* Secondary */}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
          <Link
            href="/sign-out"
            className="underline hover:text-slate-700 dark:hover:text-slate-300"
          >
            Sign out
          </Link>
          <span>·</span>
          <Link
            href="/support"
            className="underline hover:text-slate-700 dark:hover:text-slate-300"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
