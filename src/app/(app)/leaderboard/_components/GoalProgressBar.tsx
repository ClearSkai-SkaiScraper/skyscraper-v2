"use client";

import {
  ChevronDown,
  DollarSign,
  DoorOpen,
  FileText,
  Pencil,
  Settings,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GoalSettings {
  doorsKnocked: { weekly: number; monthly: number };
  jobsPosted: { weekly: number; monthly: number };
  revenue: { weekly: number; monthly: number };
  claimsSigned: { weekly: number; monthly: number };
  leadsGenerated: { weekly: number; monthly: number };
}

interface TeamStats {
  totalRevenue: number;
  totalClaims: number;
  totalLeads: number;
  totalDoors: number;
  totalJobs: number;
}

interface GoalMetric {
  key: keyof GoalSettings;
  statKey: keyof TeamStats;
  label: string;
  icon: React.ReactNode;
  gradient: string;
  bgColor: string;
  format?: "currency";
}

const GOAL_METRICS: GoalMetric[] = [
  {
    key: "doorsKnocked",
    statKey: "totalDoors",
    label: "Doors Knocked",
    icon: <DoorOpen className="h-4 w-4" />,
    gradient: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    key: "claimsSigned",
    statKey: "totalClaims",
    label: "Claims Signed",
    icon: <FileText className="h-4 w-4" />,
    gradient: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    key: "revenue",
    statKey: "totalRevenue",
    label: "Revenue",
    icon: <DollarSign className="h-4 w-4" />,
    gradient: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    format: "currency",
  },
  {
    key: "jobsPosted",
    statKey: "totalJobs",
    label: "Jobs Posted",
    icon: <TrendingUp className="h-4 w-4" />,
    gradient: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    key: "leadsGenerated",
    statKey: "totalLeads",
    label: "Leads Generated",
    icon: <Target className="h-4 w-4" />,
    gradient: "from-rose-500 to-rose-600",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function GoalProgressBar() {
  const [goals, setGoals] = useState<GoalSettings | null>(null);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const [editing, setEditing] = useState(false);
  const [editGoals, setEditGoals] = useState<GoalSettings | null>(null);

  // Load goals from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("skai-goal-settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        setGoals(parsed);
        setEditGoals(parsed);
      }
    } catch {
      // No goals set
    }
  }, []);

  // Fetch real team performance data from leaderboard API
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/finance/leaderboard");
        if (!res.ok) return;
        const data = await res.json();
        const members = data.data?.leaderboard || data.leaderboard || [];

        let totalRevenue = 0;
        let totalClaims = 0;
        let totalLeads = 0;
        let totalJobs = 0;
        let totalDoors = 0;

        for (const m of members) {
          totalRevenue += m.revenue || m.totalRevenue || 0;
          totalClaims += m.claimsSigned || m.signedClaims || m.claims || 0;
          totalLeads += m.leadsGenerated || m.leads || 0;
          totalJobs += m.jobsCompleted || m.jobs || 0;
          totalDoors += m.doorsKnocked || m.doors || 0;
        }

        setStats({ totalRevenue, totalClaims, totalLeads, totalJobs, totalDoors });
      } catch {
        // Use zeros if API fails
      }
    })();
  }, []);

  const handleSaveGoals = useCallback(() => {
    if (!editGoals) return;
    try {
      localStorage.setItem("skai-goal-settings", JSON.stringify(editGoals));
      setGoals(editGoals);
      setEditing(false);
      toast.success("Goals updated!");
    } catch {
      toast.error("Failed to save goals");
    }
  }, [editGoals]);

  const updateGoal = (key: keyof GoalSettings, p: "weekly" | "monthly", value: number) => {
    setEditGoals((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: { ...prev[key], [p]: value } };
    });
  };

  const formatValue = (value: number, format?: "currency") => {
    if (format === "currency") return `$${value.toLocaleString()}`;
    return value.toLocaleString();
  };

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

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            {period === "monthly" ? "Monthly" : "Weekly"} Goal Progress
          </h3>
          <button
            type="button"
            onClick={() => setPeriod((p) => (p === "monthly" ? "weekly" : "monthly"))}
            className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {period === "monthly" ? "Weekly" : "Monthly"}
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditGoals(goals);
                  setEditing(false);
                }}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGoals}
                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Save
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
              <Link
                href="/settings/goals"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-3 w-3" />
                Full Settings
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {GOAL_METRICS.map((metric) => {
          const goalValue = goals[metric.key][period];
          const currentValue = stats?.[metric.statKey] ?? 0;
          const adjustedCurrent =
            period === "weekly" ? Math.round(currentValue * 0.28) : currentValue;
          const progress =
            goalValue > 0 ? Math.min(Math.round((adjustedCurrent / goalValue) * 100), 100) : 0;

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
                <span
                  className={cn(
                    "text-xs font-bold",
                    progress >= 100
                      ? "text-emerald-600"
                      : progress >= 70
                        ? "text-blue-600"
                        : progress >= 40
                          ? "text-amber-600"
                          : "text-slate-500"
                  )}
                >
                  {progress}%
                </span>
              </div>

              <div className="mb-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-700",
                    progress >= 100 ? "from-emerald-500 to-emerald-400" : metric.gradient
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {editing ? (
                <div className="mt-1.5">
                  <input
                    type="number"
                    value={editGoals?.[metric.key]?.[period] || 0}
                    onChange={(e) => updateGoal(metric.key, period, parseInt(e.target.value) || 0)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{formatValue(adjustedCurrent, metric.format)}</span>
                  <span>Goal: {formatValue(goalValue, metric.format)}</span>
                </div>
              )}

              {progress >= 100 && !editing && (
                <div className="mt-1 text-center text-[10px] font-bold text-emerald-600">
                  🎯 Goal Achieved!
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
