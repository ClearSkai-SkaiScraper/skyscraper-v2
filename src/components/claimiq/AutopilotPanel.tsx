"use client";

/**
 * ClaimIQ™ Autopilot Panel
 *
 * Intelligent one-click fix panel that:
 *   1. Shows all missing data with categorized actions
 *   2. One-click "Fix" buttons for auto-resolvable items
 *   3. "Run Autopilot" to execute ALL autonomous actions
 *   4. Live progress tracking during execution
 *   5. Smart routing for manual/prompt items
 *
 * Replaces the static "Still Needed" list in SectionRow.
 */

import {
  AlertCircle,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  Database,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type AutopilotActionState,useClaimIQStore } from "@/stores/claimIQStore";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AutopilotPlan {
  claimId: string;
  totalActions: number;
  autonomousActions: number;
  promptActions: number;
  estimatedTime: number;
  estimatedTokens: number;
  actions: Array<{
    field: string;
    action: "collect" | "derive" | "generate" | "prompt";
    label: string;
    description: string;
    endpoint?: string;
    route?: string;
    estimatedTime?: number;
    tokenCost?: number;
    autonomous: boolean;
    priority: number;
  }>;
}

interface AutopilotPanelProps {
  claimId: string;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Action type config
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_CONFIG = {
  collect: {
    icon: <Cloud className="h-3.5 w-3.5" />,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    label: "Fetch",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  derive: {
    icon: <Database className="h-3.5 w-3.5" />,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
    label: "Compute",
    badgeColor: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  },
  generate: {
    icon: <Sparkles className="h-3.5 w-3.5" />,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    label: "AI Generate",
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  prompt: {
    icon: <ExternalLink className="h-3.5 w-3.5" />,
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-800",
    border: "border-gray-200 dark:border-gray-700",
    label: "You Provide",
    badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AutopilotPanel({ claimId, className }: AutopilotPanelProps) {
  const [plan, setPlan] = useState<AutopilotPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningField, setRunningField] = useState<string | null>(null);
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());
  const [failedFields, setFailedFields] = useState<Map<string, string>>(new Map());
  const [expanded, setExpanded] = useState(true);

  const {
    autopilotStatus,
    autopilotProgress,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    autopilotActions,
    setAutopilotPlan: setStorePlan,
    startAutopilot,
    updateAutopilotAction,
    advanceAutopilot,
    completeAutopilot,
    pauseAutopilot,
    resetAutopilot,
    refreshAfterChange,
  } = useClaimIQStore();

  // ── Fetch autopilot plan ──────────────────────────────────────────────
  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/claims-folder/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, mode: "plan" }),
      });
      if (!res.ok) throw new Error("Failed to fetch autopilot plan");
      const data = await res.json();
      setPlan(data.plan);

      // Seed the Zustand store
      const storeActions: AutopilotActionState[] = data.plan.actions.map((a: any) => ({
        field: a.field,
        label: a.label,
        status: "pending" as const,
        autonomous: a.autonomous,
        message: null,
        durationMs: null,
      }));
      setStorePlan(storeActions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [claimId, setStorePlan]);

  useEffect(() => {
    void fetchPlan();
  }, [fetchPlan]);

  // ── Execute single action ─────────────────────────────────────────────
  const executeOne = useCallback(
    async (field: string) => {
      setRunningField(field);
      updateAutopilotAction(field, { status: "running" });

      try {
        const res = await fetch("/api/claims-folder/autopilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claimId, mode: "execute-one", field }),
        });

        const data = await res.json();

        if (data.success && data.result?.success) {
          setCompletedFields((prev) => new Set([...prev, field]));
          updateAutopilotAction(field, {
            status: "completed",
            message: data.result.message,
            durationMs: data.result.durationMs,
          });
          // Refresh readiness
          void refreshAfterChange(claimId, `autopilot_${field}`);
        } else {
          setFailedFields((prev) => new Map([...prev, [field, data.result?.message || "Failed"]]));
          updateAutopilotAction(field, {
            status: "error",
            message: data.result?.message || "Failed",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error";
        setFailedFields((prev) => new Map([...prev, [field, msg]]));
        updateAutopilotAction(field, { status: "error", message: msg });
      } finally {
        setRunningField(null);
      }
    },
    [claimId, updateAutopilotAction, refreshAfterChange]
  );

  // ── Execute ALL autonomous actions ────────────────────────────────────
  const executeAll = useCallback(async () => {
    if (!plan) return;
    startAutopilot();

    const autoActions = plan.actions.filter((a) => a.autonomous);

    for (const action of autoActions) {
      if (useClaimIQStore.getState().autopilotStatus === "paused") {
        break;
      }
      if (completedFields.has(action.field)) continue;

      await executeOne(action.field);
      advanceAutopilot();

      // Small delay between actions
      await new Promise((r) => setTimeout(r, 500));
    }

    completeAutopilot();
    // Final refresh
    await refreshAfterChange(claimId, "autopilot_complete");
    // Re-fetch plan to update remaining items
    await fetchPlan();
  }, [
    plan,
    startAutopilot,
    completedFields,
    executeOne,
    advanceAutopilot,
    completeAutopilot,
    refreshAfterChange,
    claimId,
    fetchPlan,
  ]);

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
          <span className="ml-2 text-sm text-gray-500">Building autopilot plan...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !plan) {
    return (
      <Card className={cn("border-red-200 dark:border-red-800", className)}>
        <CardContent className="py-4 text-center text-sm text-red-500">
          {error || "Unable to build plan"}
        </CardContent>
      </Card>
    );
  }

  if (plan.totalActions === 0) {
    return (
      <Card className={cn("border-emerald-200 dark:border-emerald-800", className)}>
        <CardContent className="flex items-center gap-3 py-4">
          <Check className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              All data is present!
            </p>
            <p className="text-xs text-gray-500">Your claim packet is ready to generate.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const autoActions = plan.actions.filter((a) => a.autonomous);
  const promptActions = plan.actions.filter((a) => !a.autonomous);
  const isRunning = autopilotStatus === "running";
  const isPaused = autopilotStatus === "paused";
  const isDone = autopilotStatus === "completed";

  return (
    <Card className={cn("overflow-hidden border-purple-200 dark:border-purple-800", className)}>
      {/* Header */}
      <CardHeader
        className="cursor-pointer bg-gradient-to-r from-purple-50 to-indigo-50 pb-3 dark:from-purple-950/30 dark:to-indigo-950/30"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-purple-700 dark:text-purple-300">
            <Bot className="h-4.5 w-4.5" />
            ClaimIQ Autopilot
            <Badge
              variant="outline"
              className="ml-1 gap-1 text-[10px] text-purple-600 dark:text-purple-400"
            >
              {plan.totalActions} actions
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Run All Button */}
            {autoActions.length > 0 && !isDone && (
              <Button
                size="sm"
                variant="default"
                className="h-7 gap-1.5 bg-purple-600 px-3 text-xs hover:bg-purple-700"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isRunning) {
                    pauseAutopilot();
                  } else if (isPaused) {
                    void executeAll();
                  } else {
                    void executeAll();
                  }
                }}
                disabled={autoActions.every((a) => completedFields.has(a.field))}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-3 w-3" /> Pause
                  </>
                ) : (
                  <>
                    <Wand2 className="h-3 w-3" /> Run Autopilot
                  </>
                )}
              </Button>
            )}
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Progress bar during execution */}
        {(isRunning || isPaused || isDone) && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-purple-200 dark:bg-purple-800">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isDone ? "bg-emerald-500" : "bg-purple-500"
              )}
              style={{ width: `${autopilotProgress}%` }}
            />
          </div>
        )}

        {/* Summary line */}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-purple-600 dark:text-purple-400">
            {plan.autonomousActions} auto-fixable
          </span>
          {" · "}
          <span>{plan.promptActions} need your input</span>
          {plan.estimatedTime > 0 && (
            <>
              {" · "}
              <span>
                ~
                {plan.estimatedTime < 60
                  ? `${plan.estimatedTime}s`
                  : `${Math.ceil(plan.estimatedTime / 60)}m`}
              </span>
            </>
          )}
        </p>
      </CardHeader>

      {/* Action List */}
      {expanded && (
        <CardContent className="space-y-4 pt-4">
          {/* Autonomous Actions */}
          {autoActions.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <Zap className="h-3 w-3" />
                Auto-fixable ({autoActions.length})
              </h4>
              <div className="space-y-1.5">
                {autoActions.map((action) => {
                  const config = ACTION_CONFIG[action.action];
                  const isCompleted = completedFields.has(action.field);
                  const isFailed = failedFields.has(action.field);
                  const isCurrentlyRunning = runningField === action.field;

                  return (
                    <div
                      key={action.field}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-2.5 transition-all",
                        isCompleted
                          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                          : isFailed
                            ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                            : cn(config.border, config.bg)
                      )}
                    >
                      {/* Status icon */}
                      <span className={isCompleted ? "text-emerald-500" : config.color}>
                        {isCurrentlyRunning ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : isFailed ? (
                          <X className="h-4 w-4 text-red-500" />
                        ) : (
                          config.icon
                        )}
                      </span>

                      {/* Label */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isCompleted
                              ? "text-emerald-700 line-through dark:text-emerald-400"
                              : "text-gray-900 dark:text-gray-100"
                          )}
                        >
                          {action.label}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {action.description}
                        </p>
                        {isFailed && (
                          <p className="mt-0.5 text-[11px] text-red-500">
                            {failedFields.get(action.field)}
                          </p>
                        )}
                      </div>

                      {/* Action type badge */}
                      <Badge className={cn("shrink-0 text-[9px]", config.badgeColor)}>
                        {config.label}
                      </Badge>

                      {/* Fix button */}
                      {!isCompleted && !isCurrentlyRunning && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0 gap-1 px-2.5 text-xs"
                          onClick={() => executeOne(action.field)}
                          disabled={isRunning}
                        >
                          {isFailed ? (
                            <>
                              <RefreshCw className="h-3 w-3" /> Retry
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" /> Fix
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manual / Prompt Actions */}
          {promptActions.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <AlertCircle className="h-3 w-3" />
                Needs Your Input ({promptActions.length})
              </h4>
              <div className="space-y-1.5">
                {promptActions.map((action) => {
                  const config = ACTION_CONFIG.prompt;

                  return (
                    <div
                      key={action.field}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-2.5",
                        config.border,
                        config.bg
                      )}
                    >
                      <span className={config.color}>{config.icon}</span>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {action.label}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {action.description}
                        </p>
                      </div>

                      {action.route && (
                        <Link href={action.route}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 shrink-0 gap-1 px-2.5 text-xs"
                          >
                            Go <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Done state */}
          {isDone && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
              <Check className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Autopilot Complete
                </p>
                <p className="text-xs text-gray-500">
                  {completedFields.size} actions completed.{" "}
                  {promptActions.length > 0 &&
                    `${promptActions.length} items need your manual input.`}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-7 gap-1 text-xs"
                onClick={() => {
                  resetAutopilot();
                  setCompletedFields(new Set());
                  setFailedFields(new Map());
                  void fetchPlan();
                }}
              >
                <RefreshCw className="h-3 w-3" /> Re-scan
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
