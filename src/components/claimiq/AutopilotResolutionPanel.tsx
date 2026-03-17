"use client";

/**
 * AutopilotResolutionPanel
 *
 * Claim-level panel showing what the autopilot can resolve automatically.
 * Groups actions by type: COLLECT, DERIVE, GENERATE, PROMPT — with estimated
 * time and token costs.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Cpu,
  FileText,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* Types (mirrors autopilot engine)                                    */
/* ------------------------------------------------------------------ */

type ActionType = "collect" | "derive" | "generate" | "prompt";

interface AutopilotAction {
  field: string;
  section: string;
  actionType: ActionType;
  description: string;
  estimatedMinutes: number;
  estimatedTokens: number;
  confidence: number;
  dataSource?: string;
}

interface AutopilotPlan {
  claimId: string;
  totalActions: number;
  autonomousActions: number;
  promptActions: number;
  estimatedTime: number;
  estimatedTokens: number;
  actions: AutopilotAction[];
}

interface Props {
  claimId: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const ACTION_META: Record<
  ActionType,
  { label: string; icon: React.ReactNode; color: string; badgeColor: string }
> = {
  collect: {
    label: "Collect",
    icon: <ClipboardList className="h-4 w-4" />,
    color: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  derive: {
    label: "Derive",
    icon: <Cpu className="h-4 w-4" />,
    color: "text-purple-600 dark:text-purple-400",
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  generate: {
    label: "Generate",
    icon: <FileText className="h-4 w-4" />,
    color: "text-green-600 dark:text-green-400",
    badgeColor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  prompt: {
    label: "Prompt User",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-amber-600 dark:text-amber-400",
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Map API action types → component ActionType */
function mapActionType(raw: string): ActionType {
  const lower = raw.toLowerCase();
  if (lower === "collect" || lower === "evidence") return "collect";
  if (lower === "derive" || lower === "financial" || lower === "strategic") return "derive";
  if (lower === "generate" || lower === "document") return "generate";
  if (lower === "prompt" || lower === "communicate") return "prompt";
  return "collect"; // safe fallback
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function AutopilotResolutionPanel({ claimId, className }: Props) {
  const [plan, setPlan] = useState<AutopilotPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedType, setExpandedType] = useState<ActionType | null>(null);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/autopilot`);
      if (!res.ok) {
        // Treat API failure as empty plan
        setPlan({
          claimId,
          totalActions: 0,
          autonomousActions: 0,
          promptActions: 0,
          estimatedTime: 0,
          estimatedTokens: 0,
          actions: [],
        });
        return;
      }
      const json = await res.json();
      // Normalize API shape to component's expected shape
      const actions: AutopilotAction[] = (json.actions ?? []).map((a: any) => ({
        field: a.field ?? a.title ?? "Action",
        section: a.section ?? a.type ?? "general",
        actionType: mapActionType(a.type ?? a.actionType ?? "collect"),
        description: a.description ?? "",
        estimatedMinutes: a.estimatedMinutes ?? 0,
        estimatedTokens: a.estimatedTokens ?? 0,
        confidence: a.confidence ?? (a.completed ? 1.0 : 0.7),
        dataSource: a.dataSource,
      }));
      const completedCount = json.completedCount ?? 0;
      const pendingActions = actions.filter((a: any) => a.confidence < 1.0);
      setPlan({
        claimId: json.claimId ?? claimId,
        totalActions: json.totalActions ?? actions.length,
        autonomousActions: completedCount,
        promptActions: json.pendingCount ?? pendingActions.length,
        estimatedTime: json.estimatedTimeMinutes ?? 0,
        estimatedTokens: actions.reduce(
          (sum: number, a: AutopilotAction) => sum + a.estimatedTokens,
          0
        ),
        actions,
      });
    } catch {
      // Network error — show empty plan, not red
      setPlan({
        claimId,
        totalActions: 0,
        autonomousActions: 0,
        promptActions: 0,
        estimatedTime: 0,
        estimatedTokens: 0,
        actions: [],
      });
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!plan || plan.totalActions === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Bot className="h-4 w-4" />
          Add claim details to generate an autopilot resolution plan.
        </CardContent>
      </Card>
    );
  }

  const grouped = groupByType(plan.actions);
  const autoPct =
    plan.totalActions > 0 ? Math.round((plan.autonomousActions / plan.totalActions) * 100) : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-indigo-500" />
          Autopilot Resolution Plan
        </CardTitle>
        <CardDescription>
          {plan.totalActions} actions · {plan.autonomousActions} autonomous · {plan.promptActions}{" "}
          require input
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                style={{ width: `${autoPct}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            {autoPct}% auto
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
            <p className="font-semibold">{plan.estimatedTime} min</p>
            <p className="text-muted-foreground">Est. Time</p>
          </div>
          <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
            <p className="font-semibold">{plan.estimatedTokens.toLocaleString()}</p>
            <p className="text-muted-foreground">Est. Tokens</p>
          </div>
          <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
            <p className="font-semibold">{plan.totalActions}</p>
            <p className="text-muted-foreground">Total Actions</p>
          </div>
        </div>

        {/* Action groups */}
        <div className="space-y-2">
          {(["derive", "generate", "collect", "prompt"] as ActionType[]).map((type) => {
            const actions = grouped[type] ?? [];
            if (actions.length === 0) return null;
            const meta = ACTION_META[type];
            const expanded = expandedType === type;

            return (
              <div key={type} className="rounded-lg border bg-white/80 dark:bg-slate-900/60">
                <button
                  onClick={() => setExpandedType(expanded ? null : type)}
                  className="flex w-full items-center gap-2 p-3 text-left text-sm"
                >
                  <span className={meta.color}>{meta.icon}</span>
                  <span className="flex-1 font-medium">{meta.label}</span>
                  <Badge className={cn("text-[10px]", meta.badgeColor)}>{actions.length}</Badge>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {expanded && (
                  <div className="space-y-2 border-t px-3 pb-3 pt-2">
                    {actions.map((a, i) => (
                      <div
                        key={`${a.field}-${i}`}
                        className="flex items-start justify-between text-xs"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-slate-700 dark:text-slate-300">
                            {a.field}
                          </p>
                          <p className="text-muted-foreground">{a.description}</p>
                          {a.dataSource && (
                            <p className="text-[10px] text-indigo-500">Source: {a.dataSource}</p>
                          )}
                        </div>
                        <div className="ml-2 text-right">
                          <span className="font-mono text-[10px]">{a.estimatedMinutes}m</span>
                          <Badge variant="outline" className="ml-1 text-[9px]">
                            {Math.round(a.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function groupByType(actions: AutopilotAction[]): Partial<Record<ActionType, AutopilotAction[]>> {
  const map: Partial<Record<ActionType, AutopilotAction[]>> = {};
  for (const a of actions) {
    if (!map[a.actionType]) map[a.actionType] = [];
    map[a.actionType]!.push(a);
  }
  return map;
}
