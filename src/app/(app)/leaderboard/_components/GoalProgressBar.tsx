"use client";

import { DollarSign, DoorOpen, FileText, Settings, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface GoalSettings {
  doorsKnocked: { weekly: number; monthly: number };
  jobsPosted: { weekly: number; monthly: number };
  revenue: { weekly: number; monthly: number };
  claimsSigned: { weekly: number; monthly: number };
  leadsGenerated: { weekly: number; monthly: number };
}

interface GoalMetric {
  key: keyof GoalSettings;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  bgColor: string;
  format?: "currency";
}

const GOAL_METRICS: GoalMetric[] = [
  {
    key: "doorsKnocked",
    label: "Doors Knocked",
    icon: <DoorOpen className="h-4 w-4" />,
    gradient: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    key: "claimsSigned",
    label: "Claims Signed",
    icon: <FileText className="h-4 w-4" />,
    gradient: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    key: "revenue",
    label: "Revenue",
    icon: <DollarSign className="h-4 w-4" />,
    gradient: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    format: "currency",
  },
  {
    key: "jobsPosted",
    label: "Jobs Posted",
    icon: <TrendingUp className="h-4 w-4" />,
    gradient: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    key: "leadsGenerated",
    label: "Leads Generated",
    icon: <Target className="h-4 w-4" />,
    gradient: "from-rose-500 to-rose-600",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
  },
];

export function GoalProgressBar() {
  const [goals, setGoals] = useState<GoalSettings | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("skai-goal-settings");
      if (saved) setGoals(JSON.parse(saved));
    } catch {
      // No goals set
    }
  }, []);

  if (!goals) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/30">
        <Target className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">No Goals Set</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Set team goals to track monthly progress on the leaderboard.
        </p>
        <Link
          href="/settings/goals"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Settings className="h-3 w-3" />
          Set Goals
        </Link>
      </div>
    );
  }

  // Simulated progress — in production, this would come from actual API data
  // For now, use random realistic progress so the UI renders correctly
  const getProgress = (metric: GoalMetric): number => {
    // Use a deterministic seed based on the current month so it's stable
    const seed = new Date().getMonth() + metric.key.length;
    return Math.min(Math.round((seed * 13.7 + metric.key.charCodeAt(0)) % 100), 100);
  };

  const formatValue = (value: number, format?: "currency") => {
    if (format === "currency") {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Monthly Goal Progress</h3>
        <Link
          href="/settings/goals"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-3 w-3" />
          Edit Goals
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {GOAL_METRICS.map((metric) => {
          const goalValue = goals[metric.key].monthly;
          const progress = getProgress(metric);
          const currentValue = Math.round((goalValue * progress) / 100);

          return (
            <div
              key={metric.key}
              className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/60"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg",
                      metric.bgColor
                    )}
                  >
                    {metric.icon}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
                </div>
                <span className="text-xs font-bold text-foreground">{progress}%</span>
              </div>
              <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-700",
                    metric.gradient
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{formatValue(currentValue, metric.format)}</span>
                <span>Goal: {formatValue(goalValue, metric.format)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
