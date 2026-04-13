/**
 * Stalled Claims Widget — "Never Lose a Claim Again"
 *
 * Dashboard widget that shows claims at risk of falling through the cracks.
 * Color-coded by staleness:
 *   🔴 Critical (14+ days)
 *   🟡 Warning (7-13 days)
 *   🟢 Watch (5-6 days)
 */
"use client";

import {
  AlertTriangle,
  ArrowRight,
  Clock,
  DollarSign,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface StalledClaim {
  id: string;
  claimNumber: string | null;
  status: string | null;
  propertyAddress: string | null;
  homeownerName: string | null;
  claimAmount: number | null;
  daysSinceUpdate: number;
  tier: "critical" | "warning" | "watch";
}

interface StalledSummary {
  total: number;
  critical: number;
  warning: number;
  watch: number;
  totalAtRiskValue: number;
}

export default function StalledClaimsWidget() {
  const [claims, setClaims] = useState<StalledClaim[]>([]);
  const [summary, setSummary] = useState<StalledSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStalled = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/claims/stalled?limit=10");
      if (!res.ok) return;
      const data = await res.json();
      setClaims(data.claims || []);
      setSummary(data.summary || null);
    } catch {
      // fail silently — not critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStalled();
  }, [fetchStalled]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking for stalled claims...</span>
        </div>
      </div>
    );
  }

  if (!summary || summary.total === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-6 shadow-sm backdrop-blur-sm dark:border-emerald-800/60 dark:bg-emerald-950/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Clock className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              All Claims Active
            </p>
            <p className="text-xs text-muted-foreground">No stalled claims detected — nice work!</p>
          </div>
        </div>
      </div>
    );
  }

  const tierConfig = {
    critical: {
      bg: "bg-red-50 dark:bg-red-950/20",
      border: "border-red-200 dark:border-red-800",
      dot: "bg-red-500",
      text: "text-red-700 dark:text-red-300",
      label: "Critical",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/20",
      border: "border-amber-200 dark:border-amber-800",
      dot: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      label: "Warning",
    },
    watch: {
      bg: "bg-yellow-50 dark:bg-yellow-950/20",
      border: "border-yellow-200 dark:border-yellow-800",
      dot: "bg-yellow-500",
      text: "text-yellow-700 dark:text-yellow-300",
      label: "Watch",
    },
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-6 shadow-sm backdrop-blur-sm",
        summary.critical > 0
          ? "border-red-300/60 bg-red-50/30 dark:border-red-800/60 dark:bg-red-950/10"
          : "border-amber-300/60 bg-amber-50/30 dark:border-amber-800/60 dark:bg-amber-950/10"
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              summary.critical > 0
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-amber-100 dark:bg-amber-900/30"
            )}
          >
            <AlertTriangle
              className={cn("h-5 w-5", summary.critical > 0 ? "text-red-600" : "text-amber-600")}
            />
          </div>
          <div>
            <h3 className="font-bold text-foreground">
              {summary.total} Stalled Claim{summary.total !== 1 ? "s" : ""}
            </h3>
            <p className="text-xs text-muted-foreground">
              {summary.critical > 0 && (
                <span className="font-semibold text-red-600">{summary.critical} critical</span>
              )}
              {summary.critical > 0 && summary.warning > 0 && " · "}
              {summary.warning > 0 && (
                <span className="text-amber-600">{summary.warning} warning</span>
              )}
              {(summary.critical > 0 || summary.warning > 0) && summary.watch > 0 && " · "}
              {summary.watch > 0 && <span className="text-yellow-600">{summary.watch} watch</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {summary.totalAtRiskValue > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-red-100/80 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <DollarSign className="h-3 w-3" />
              {(summary.totalAtRiskValue / 100).toLocaleString()} at risk
            </div>
          )}
          <button
            type="button"
            onClick={fetchStalled}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Claims list */}
      <div className="space-y-2">
        {claims.slice(0, 5).map((claim) => {
          const config = tierConfig[claim.tier];
          return (
            <Link
              key={claim.id}
              href={`/claims/${claim.id}/overview`}
              className={cn(
                "flex items-center justify-between rounded-xl border p-3 transition-all hover:shadow-md",
                config.bg,
                config.border
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("h-2.5 w-2.5 rounded-full", config.dot)} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {claim.claimNumber || claim.propertyAddress || "Unnamed"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                        config.text,
                        config.bg
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                  {claim.homeownerName && (
                    <p className="text-xs text-muted-foreground">{claim.homeownerName}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <p className={cn("text-sm font-bold", config.text)}>
                    {claim.daysSinceUpdate}d idle
                  </p>
                  {claim.claimAmount && (
                    <p className="text-[10px] text-muted-foreground">
                      ${(claim.claimAmount / 100).toLocaleString()}
                    </p>
                  )}
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* See all link */}
      {claims.length > 5 && (
        <Link
          href="/claims?status=stalled"
          className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          View all {summary.total} stalled claims
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
