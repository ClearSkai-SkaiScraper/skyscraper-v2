/**
 * DamageDeltaCard — "Find More Damage Than the Adjuster"
 *
 * THE #1 sales-closing component. Shows:
 * - Adjuster's scope: X items → $Y
 * - Our AI scope: X items → $Y
 * - DELTA: +N items → +$Z in missed revenue
 * - "Generate Rebuttal" and "Build Supplement" action buttons
 *
 * This is the visual "aha moment" that makes contractors say:
 * "I need this right now."
 */
"use client";

import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  FileText,
  Layers,
  ShieldAlert,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DeltaData {
  adjuster: {
    itemCount: number;
    totalAmount: number;
    items: Array<{ description: string; amount: number }>;
  };
  ai: {
    itemCount: number;
    totalAmount: number;
    items: Array<{
      description: string;
      amount: number;
      confidence?: number;
      damageType?: string;
    }>;
  };
  missedItems: Array<{
    description: string;
    estimatedAmount: number;
    category: string;
    confidence?: number;
  }>;
  underpaidAreas: string[];
}

interface DamageDeltaCardProps {
  claimId: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDollars(dollars: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function DamageDeltaCard({ claimId, className }: DamageDeltaCardProps) {
  const [delta, setDelta] = useState<DeltaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDelta() {
      try {
        setLoading(true);
        const res = await fetch(`/api/claims/${claimId}/damage-delta`);
        if (!res.ok) {
          // No delta data yet — this is normal for new claims
          if (res.status === 404) {
            setDelta(null);
            return;
          }
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) setDelta(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDelta();
    return () => {
      cancelled = true;
    };
  }, [claimId]);

  // Don't render if no data (claim hasn't been analyzed yet)
  if (loading) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/60",
          className
        )}
      >
        <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-4 h-24 rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  if (error || !delta) return null;

  const deltaItems = delta.ai.itemCount - delta.adjuster.itemCount;
  const deltaAmount = delta.ai.totalAmount - delta.adjuster.totalAmount;
  const hasSignificantDelta = deltaItems > 0 || deltaAmount > 0;

  if (!hasSignificantDelta && delta.missedItems.length === 0) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 shadow-lg transition-all",
        deltaAmount > 5000
          ? "border-red-400/80 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:border-red-600/60 dark:from-red-950/40 dark:via-orange-950/30 dark:to-amber-950/20"
          : deltaAmount > 2000
            ? "border-amber-400/80 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:border-amber-600/60 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/20"
            : "border-emerald-400/80 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:border-emerald-600/60 dark:from-emerald-950/40 dark:via-green-950/30 dark:to-teal-950/20",
        className
      )}
    >
      {/* Urgency ribbon */}
      {deltaAmount > 5000 && (
        <div className="absolute right-0 top-0 rounded-bl-xl bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-md">
          🚨 HIGH VALUE
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-red-500 shadow-md">
            <ShieldAlert className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Missed Damage Detected</h3>
            <p className="text-sm text-muted-foreground">
              AI found damage the adjuster didn&apos;t document
            </p>
          </div>
        </div>

        {/* The Big Delta — THE visual moment */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {/* Adjuster column */}
          <div className="rounded-xl border border-slate-200/60 bg-white/60 p-4 text-center dark:border-slate-700/60 dark:bg-slate-800/40">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Adjuster
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-700 dark:text-slate-300">
              {delta.adjuster.itemCount}
            </p>
            <p className="text-xs text-muted-foreground">items</p>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
              {formatDollars(delta.adjuster.totalAmount)}
            </p>
          </div>

          {/* Arrow + Delta */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-red-500">
              <ArrowRight className="h-5 w-5 text-white" />
            </div>
            <div className="mt-2 rounded-lg bg-red-100 px-3 py-1 dark:bg-red-900/30">
              <p className="text-xs font-bold text-red-700 dark:text-red-300">
                +{deltaItems} missed
              </p>
            </div>
          </div>

          {/* AI column */}
          <div className="rounded-xl border-2 border-emerald-300/80 bg-emerald-50/60 p-4 text-center dark:border-emerald-700/60 dark:bg-emerald-900/20">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Our AI
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {delta.ai.itemCount}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">items</p>
            <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              {formatDollars(delta.ai.totalAmount)}
            </p>
          </div>
        </div>

        {/* Revenue Delta — THE number */}
        <div className="mb-5 rounded-xl border-2 border-dashed border-amber-400/60 bg-amber-50/40 p-4 text-center dark:border-amber-600/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Potential Additional Recovery
            </span>
          </div>
          <p className="mt-1 text-3xl font-black text-amber-700 dark:text-amber-300">
            +{formatDollars(deltaAmount)}
          </p>
        </div>

        {/* Missed Items List */}
        {delta.missedItems.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What the Adjuster Missed
            </p>
            <div className="space-y-2">
              {delta.missedItems.slice(0, 5).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-red-200/60 bg-red-50/40 px-3 py-2 dark:border-red-800/40 dark:bg-red-950/20"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-sm font-medium text-foreground">{item.description}</span>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      {item.category}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-red-700 dark:text-red-300">
                    +{formatDollars(item.estimatedAmount)}
                  </span>
                </div>
              ))}
              {delta.missedItems.length > 5 && (
                <p className="text-center text-xs text-muted-foreground">
                  +{delta.missedItems.length - 5} more missed items
                </p>
              )}
            </div>
          </div>
        )}

        {/* Underpaid Areas */}
        {delta.underpaidAreas.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Likely Underpaid Areas
            </p>
            <div className="flex flex-wrap gap-2">
              {delta.underpaidAreas.map((area, i) => (
                <span
                  key={i}
                  className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <DollarSign className="mr-1 inline h-3 w-3" />
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ACTION BUTTONS — outcome-driven */}
        <div className="flex flex-wrap gap-2.5">
          <Link
            href={`/claims/rebuttal-builder?claimId=${claimId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
          >
            <FileText className="h-4 w-4" />
            Generate Rebuttal Packet
          </Link>
          <Link
            href={`/claims/${claimId}/supplement`}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
          >
            <Layers className="h-4 w-4" />
            Build Supplement
          </Link>
          <Link
            href={`/claims/${claimId}/scope`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Zap className="h-4 w-4" />
            View Full Scope
          </Link>
        </div>
      </div>
    </div>
  );
}
