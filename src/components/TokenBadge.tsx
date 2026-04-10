"use client";
import { AlertTriangle, CreditCard, Zap } from "lucide-react";
import useSWR from "swr";

import { useTokenGate } from "./TokenGate";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TokenBadgeProps = {
  orgId?: string;
  userId?: string;
  className?: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function TokenBadge({ orgId, userId, className = "" }: TokenBadgeProps) {
  const { showTopUpModal } = useTokenGate();

  const { data: tokenData } = useSWR("/api/org/tokens", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30000, // Refresh every 30 seconds to keep count current
  });

  const { data: storageData } = useSWR("/api/health/storage", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60000, // Check storage status every minute
  });

  const { data: planData } = useSWR("/api/org/plan", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 300000, // Refresh plan data every 5 minutes
  });

  const walletBalance = tokenData?.ai ?? 0;
  const dolBalance = tokenData?.dolCheck ?? 0;
  const weatherBalance = tokenData?.dolFull ?? 0;
  const totalTokens = walletBalance + dolBalance + weatherBalance;

  const planName = planData?.planName || "Solo";
  const planStatus = planData?.status || "active";

  const storageEnabled = storageData?.enabled ?? true;
  const storageReady = storageData?.ready ?? true;

  // Show warning state if storage is disabled or not ready
  if (!storageEnabled || !storageReady) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
        <AlertTriangle className="h-3 w-3" />
        <span className="hidden sm:inline">Uploads disabled (awaiting billing verification)</span>
        <span className="sm:hidden">Uploads disabled</span>
      </div>
    );
  }

  // Low token warning
  if (totalTokens < 100) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-800 ${className}`}
      >
        <AlertTriangle className="h-3 w-3" />
        <span>{totalTokens.toLocaleString()} tokens remaining</span>
        <button
          onClick={() => showTopUpModal(totalTokens)}
          className="ml-2 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
        >
          Add Tokens
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-blue-900">{planName} Plan</span>
        </div>
        <div className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-600">{planStatus}</div>
      </div>

      <div className="mt-2 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-green-600" />
          <span className="text-slate-700">{walletBalance.toLocaleString()} AI</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-blue-600" />
          <span className="text-slate-700">{dolBalance.toLocaleString()} DOL</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-orange-600" />
          <span className="text-slate-700">{weatherBalance.toLocaleString()} Weather</span>
        </div>
      </div>
    </div>
  );
}
