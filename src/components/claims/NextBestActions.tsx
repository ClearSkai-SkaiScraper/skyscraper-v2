/**
 * NextBestActions — "Auto Win Engine"
 *
 * After AI scan, shows revenue-increasing actions the contractor
 * can take with ONE CLICK. Each action shows:
 * - What to add (soft metals, code upgrade, ventilation, etc.)
 * - How much it adds to the claim (+$1,200)
 * - One-click "Add to Scope" button
 *
 * This turns the AI from a detector into a revenue maximizer.
 */
"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface NextAction {
  id: string;
  title: string;
  description: string;
  category:
    | "soft_metals"
    | "code_upgrade"
    | "ventilation"
    | "collateral"
    | "measurement"
    | "depreciation"
    | "general";
  estimatedAmount: number;
  confidence: number;
  rationale: string;
  xactimateCode?: string;
  added?: boolean;
}

interface NextBestActionsProps {
  claimId: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Category styling
// ---------------------------------------------------------------------------
const categoryConfig: Record<
  NextAction["category"],
  { label: string; color: string; bg: string; icon: string }
> = {
  soft_metals: {
    label: "Soft Metals",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    icon: "🔩",
  },
  code_upgrade: {
    label: "Code Upgrade",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50 dark:bg-purple-900/30",
    icon: "📋",
  },
  ventilation: {
    label: "Ventilation",
    color: "text-teal-700 dark:text-teal-300",
    bg: "bg-teal-50 dark:bg-teal-900/30",
    icon: "💨",
  },
  collateral: {
    label: "Collateral Damage",
    color: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-50 dark:bg-orange-900/30",
    icon: "🏚️",
  },
  measurement: {
    label: "Measurement Correction",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    icon: "📐",
  },
  depreciation: {
    label: "Recoverable Depreciation",
    color: "text-green-700 dark:text-green-300",
    bg: "bg-green-50 dark:bg-green-900/30",
    icon: "💰",
  },
  general: {
    label: "Additional Item",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-50 dark:bg-slate-900/30",
    icon: "📌",
  },
};

function formatDollars(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function NextBestActions({ claimId, className }: NextBestActionsProps) {
  const [actions, setActions] = useState<NextAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchActions() {
      try {
        setLoading(true);
        const res = await fetch(`/api/claims/${claimId}/next-actions`);
        if (!res.ok) {
          if (res.status === 404) {
            setActions([]);
            return;
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) setActions(data.actions || []);
      } catch {
        // Silent fail — actions are supplementary
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchActions();
    return () => {
      cancelled = true;
    };
  }, [claimId]);

  async function handleAddToScope(action: NextAction) {
    setAddingId(action.id);
    try {
      const res = await fetch(`/api/claims/${claimId}/scope`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: action.title,
          category: action.category,
          estimatedAmount: action.estimatedAmount,
          xactimateCode: action.xactimateCode,
          rationale: action.rationale,
          source: "ai_next_action",
        }),
      });

      if (res.ok) {
        setActions((prev) => prev.map((a) => (a.id === action.id ? { ...a, added: true } : a)));
        toast.success(
          `Added "${action.title}" to scope — +${formatDollars(action.estimatedAmount)}`
        );
      } else {
        toast.error("Failed to add to scope");
      }
    } catch {
      toast.error("Failed to add to scope");
    } finally {
      setAddingId(null);
    }
  }

  // Don't render when loading or no actions
  if (loading) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/60",
          className
        )}
      >
        <div className="h-6 w-44 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-4 space-y-3">
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (actions.length === 0) return null;

  const pendingActions = actions.filter((a) => !a.added);
  const addedActions = actions.filter((a) => a.added);
  const totalPotential = pendingActions.reduce((sum, a) => sum + a.estimatedAmount, 0);
  const totalAdded = addedActions.reduce((sum, a) => sum + a.estimatedAmount, 0);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border-2 border-emerald-300/60 bg-gradient-to-br from-emerald-50/80 via-green-50/60 to-teal-50/40 shadow-md backdrop-blur-sm transition-all dark:border-emerald-700/40 dark:from-emerald-950/30 dark:via-green-950/20 dark:to-teal-950/10",
        className
      )}
    >
      <div className="p-6">
        {/* Header */}
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-foreground">Increase This Claim</h3>
              <p className="text-sm text-muted-foreground">
                {pendingActions.length} actions available • {formatDollars(totalPotential)}{" "}
                potential
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalAdded > 0 && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                +{formatDollars(totalAdded)} added
              </span>
            )}
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Actions List */}
        {expanded && (
          <div className="mt-5 space-y-3">
            {/* Total Potential Banner */}
            {pendingActions.length > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-emerald-100/60 px-4 py-3 dark:bg-emerald-900/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Total Revenue Opportunity
                  </span>
                </div>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                  +{formatDollars(totalPotential)}
                </span>
              </div>
            )}

            {/* Individual Actions */}
            {actions.map((action) => {
              const cat = categoryConfig[action.category] || categoryConfig.general;
              const isAdding = addingId === action.id;

              return (
                <div
                  key={action.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all",
                    action.added
                      ? "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20"
                      : "border-slate-200/60 bg-white/60 hover:border-emerald-300 hover:shadow-sm dark:border-slate-700/60 dark:bg-slate-800/40 dark:hover:border-emerald-700"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Action details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat.icon}</span>
                        <h4 className="text-sm font-bold text-foreground">{action.title}</h4>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            cat.bg,
                            cat.color
                          )}
                        >
                          {cat.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                      {action.xactimateCode && (
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          Xactimate: {action.xactimateCode}
                        </p>
                      )}
                    </div>

                    {/* Right: Amount + Add button */}
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                        +{formatDollars(action.estimatedAmount)}
                      </span>
                      {action.added ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToScope(action)}
                          disabled={isAdding}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110 disabled:opacity-50"
                        >
                          {isAdding ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                          Add to Scope
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Rationale Toggle */}
            <div className="flex items-center gap-2 rounded-lg bg-slate-50/60 px-3 py-2 dark:bg-slate-800/40">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-[11px] text-muted-foreground">
                These recommendations are based on AI damage analysis, local building codes, and
                historical approval patterns for your carrier.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
