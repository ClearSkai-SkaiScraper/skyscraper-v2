"use client";

/**
 * DunningBanner — Shows when subscription payment has failed
 *
 * Red banner at the top of the dashboard warning about payment issues.
 * Links to billing settings to update payment method.
 */

import { AlertTriangle, CreditCard, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function DunningBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useSWR("/api/billing/seats", fetcher, {
    refreshInterval: 60000, // Check every minute
    revalidateOnFocus: true,
  });

  // Don't show if dismissed this session, or if subscription is healthy
  const status = data?.subscription?.status;
  const needsDunning =
    status === "past_due" ||
    status === "unpaid" ||
    status === "incomplete" ||
    status === "incomplete_expired";

  if (dismissed || !needsDunning) return null;

  return (
    <div className="relative border-b border-red-200 bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 text-white dark:from-red-800 dark:to-red-700">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Payment Failed</p>
            <p className="text-xs text-red-100">
              {status === "past_due"
                ? "Your subscription payment failed. Please update your payment method to avoid service interruption."
                : status === "incomplete_expired"
                  ? "Your subscription setup expired. Please start a new subscription."
                  : "There's an issue with your subscription payment. Please check your billing settings."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/settings/billing">
            <Button
              size="sm"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <CreditCard className="mr-1.5 h-4 w-4" />
              Update Payment
            </Button>
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
