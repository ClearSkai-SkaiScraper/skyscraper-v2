"use client";

/**
 * ============================================================================
 * GracePeriodBanner — Shown when subscription is past_due
 * ============================================================================
 *
 * Displays a non-dismissible warning banner at the top of the dashboard
 * when a Stripe subscription enters payment_failed / past_due status.
 * Gives users a clear CTA to update their payment method.
 */

import { useRouter } from "next/navigation";

import { usePlan } from "@/hooks/usePlan";

export function GracePeriodBanner() {
  const router = useRouter();
  const { plan, isPastDue, isLoading } = usePlan();

  if (isLoading || !isPastDue) return null;

  // Calculate days remaining in grace period (72 hours from period end)
  const periodEnd = plan?.currentPeriodEnd ? new Date(plan.currentPeriodEnd) : null;
  const graceEnd = periodEnd ? new Date(periodEnd.getTime() + 72 * 60 * 60 * 1000) : null;
  const hoursRemaining = graceEnd
    ? Math.max(0, Math.ceil((graceEnd.getTime() - Date.now()) / (1000 * 60 * 60)))
    : 0;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/30">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Payment Failed — Action Required
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Your last payment didn&apos;t go through.
              {hoursRemaining > 0
                ? ` You have ${hoursRemaining} hours to update your payment method before your account is downgraded.`
                : " Please update your payment method immediately to avoid service interruption."}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/billing")}
          className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700"
        >
          Update Payment →
        </button>
      </div>
    </div>
  );
}

export default GracePeriodBanner;
