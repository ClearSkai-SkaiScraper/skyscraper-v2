"use client";

import {
  ChevronDown,
  DollarSign,
  DoorOpen,
  FileText,
  Pencil,
  Save,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GoalData {
  category: string;
  weekly: number;
  monthly: number;
}

interface TeamStats {
  totalRevenue: number;
  totalClaims: number;
  totalLeads: number;
  totalDoors: number;
  totalJobs: number;
}

interface GoalMetric {
  category: string;
  label: string;
  statKey: keyof TeamStats;
  icon: React.ReactNode;
  gradient: string;
  bgColor: string;
  format?: "currency";
}

const GOAL_METRICS: GoalMetric[] = [
  {
    category: "doors_knocked",
    statKey: "totalDoors",
    label: "Doors Knocked",
    icon: <DoorOpen className="h-4 w-4" />,
    gradient: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    category: "claims_signed",
    statKey: "totalClaims",
    label: "Claims Signed",
    icon: <FileText className="h-4 w-4" />,
    gradient: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  {
    category: "revenue",
    statKey: "totalRevenue",
    label: "Revenue",
    icon: <DollarSign className="h-4 w-4" />,
    gradient: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    format: "currency",
  },
  {
    category: "jobs_posted",
    statKey: "totalJobs",
    label: "Jobs Posted",
    icon: <TrendingUp className="h-4 w-4" />,
    gradient: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    category: "leads_generated",
    statKey: "totalLeads",
    label: "Leads Generated",
    icon: <Target className="h-4 w-4" />,
    gradient: "from-rose-500 to-rose-600",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
  },
];

// Quick presets
const PRESETS = [
  {
    label: "🌱 Starter",
    goals: {
      doors_knocked: { w: 50, m: 200 },
      claims_signed: { w: 3, m: 12 },
      revenue: { w: 30000, m: 120000 },
      jobs_posted: { w: 8, m: 32 },
      leads_generated: { w: 15, m: 60 },
    },
  },
  {
    label: "🚀 Standard",
    goals: {
      doors_knocked: { w: 100, m: 400 },
      claims_signed: { w: 5, m: 20 },
      revenue: { w: 75000, m: 300000 },
      jobs_posted: { w: 15, m: 60 },
      leads_generated: { w: 25, m: 100 },
    },
  },
  {
    label: "🔥 Aggressive",
    goals: {
      doors_knocked: { w: 200, m: 800 },
      claims_signed: { w: 10, m: 40 },
      revenue: { w: 150000, m: 600000 },
      jobs_posted: { w: 30, m: 120 },
      leads_generated: { w: 50, m: 200 },
    },
  },
  {
    label: "👑 Enterprise",
    goals: {
      doors_knocked: { w: 350, m: 1400 },
      claims_signed: { w: 20, m: 80 },
      revenue: { w: 250000, m: 1000000 },
      jobs_posted: { w: 50, m: 200 },
      leads_generated: { w: 100, m: 400 },
    },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function GoalProgressBar() {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const [editing, setEditing] = useState(false);
  const [editGoals, setEditGoals] = useState<Map<string, { weekly: number; monthly: number }>>(
    new Map()
  );
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load goals from API (DB-backed) with localStorage fallback for migration
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/goals");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.goals?.length > 0) {
            setGoals(data.data.goals);
            const map = new Map<string, { weekly: number; monthly: number }>();
            for (const g of data.data.goals) {
              map.set(g.category, { weekly: g.weekly, monthly: g.monthly });
            }
            setEditGoals(map);
            setLoaded(true);
            return;
          }
        }
      } catch {
        // Fall through to localStorage
      }

      // Fallback: migrate from localStorage if present
      try {
        const saved = localStorage.getItem("skai-goal-settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          const migrated: GoalData[] = [];
          const map = new Map<string, { weekly: number; monthly: number }>();
          const keyMap: Record<string, string> = {
            doorsKnocked: "doors_knocked",
            claimsSigned: "claims_signed",
            revenue: "revenue",
            jobsPosted: "jobs_posted",
            leadsGenerated: "leads_generated",
          };
          for (const [key, category] of Object.entries(keyMap)) {
            if (parsed[key]) {
              migrated.push({
                category,
                weekly: parsed[key].weekly || 0,
                monthly: parsed[key].monthly || 0,
              });
              map.set(category, {
                weekly: parsed[key].weekly || 0,
                monthly: parsed[key].monthly || 0,
              });
            }
          }
          if (migrated.length > 0) {
            setGoals(migrated);
            setEditGoals(map);
            // Auto-migrate to DB in background
            fetch("/api/goals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ goals: migrated }),
            }).catch(() => {});
          }
        }
      } catch {
        // No goals anywhere
      }
      setLoaded(true);
    })();
  }, []);

  // Fetch real team performance data from leaderboard API
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/finance/leaderboard");
        if (!res.ok) return;
        const data = await res.json();
        const members = data.data?.leaderboard || data.leaderboard || [];
        const summary = data.data?.summary;

        let totalRevenue = 0;
        let totalClaims = 0;
        let totalLeads = 0;
        let totalJobs = 0;

        for (const m of members) {
          totalRevenue += m.revenue || m.totalRevenue || 0;
          totalClaims += m.claimsSigned || m.signedClaims || m.claims || 0;
          totalLeads += m.leadsGenerated || m.leads || 0;
          totalJobs += m.jobsCompleted || m.jobs || 0;
        }

        // Doors come from summary (now real canvass_pins count)
        const totalDoors =
          summary?.totalDoors ??
          members.reduce(
            (s: number, m: { doorsKnocked?: number; doors?: number }) =>
              s + (m.doorsKnocked || m.doors || 0),
            0
          );

        setStats({ totalRevenue, totalClaims, totalLeads, totalJobs, totalDoors });
      } catch {
        // Use zeros if API fails
      }
    })();
  }, []);

  const handleSaveGoals = useCallback(async () => {
    setSaving(true);
    try {
      const goalsArray: GoalData[] = [];
      editGoals.forEach((val, cat) => {
        goalsArray.push({ category: cat, weekly: val.weekly, monthly: val.monthly });
      });

      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: goalsArray }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setGoals(goalsArray);
      setEditing(false);
      // Also sync to localStorage for backward compat
      const lsFormat: Record<string, { weekly: number; monthly: number }> = {};
      const reverseMap: Record<string, string> = {
        doors_knocked: "doorsKnocked",
        claims_signed: "claimsSigned",
        revenue: "revenue",
        jobs_posted: "jobsPosted",
        leads_generated: "leadsGenerated",
      };
      editGoals.forEach((val, cat) => {
        const key = reverseMap[cat] || cat;
        lsFormat[key] = val;
      });
      try {
        localStorage.setItem("skai-goal-settings", JSON.stringify(lsFormat));
      } catch {}
      toast.success("Goals saved!");
    } catch {
      toast.error("Failed to save goals");
    } finally {
      setSaving(false);
    }
  }, [editGoals]);

  const updateGoal = (category: string, p: "weekly" | "monthly", value: number) => {
    setEditGoals((prev) => {
      const next = new Map(prev);
      const existing = next.get(category) || { weekly: 0, monthly: 0 };
      next.set(category, { ...existing, [p]: value });
      return next;
    });
  };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    const map = new Map<string, { weekly: number; monthly: number }>();
    for (const [cat, vals] of Object.entries(preset.goals)) {
      map.set(cat, { weekly: vals.w, monthly: vals.m });
    }
    setEditGoals(map);
  };

  const formatValue = (value: number, format?: "currency") => {
    if (format === "currency") return `$${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  if (!loaded) return null;

  if (goals.length === 0 && !editing) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/30">
        <Target className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">No Goals Set</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Set team goals to track monthly progress on the leaderboard.
        </p>
        <button
          type="button"
          onClick={() => {
            // Initialize default goals for editing
            const defaults = new Map<string, { weekly: number; monthly: number }>();
            defaults.set("doors_knocked", { weekly: 100, monthly: 400 });
            defaults.set("claims_signed", { weekly: 5, monthly: 20 });
            defaults.set("revenue", { weekly: 75000, monthly: 300000 });
            defaults.set("jobs_posted", { weekly: 15, monthly: 60 });
            defaults.set("leads_generated", { weekly: 25, monthly: 100 });
            setEditGoals(defaults);
            setEditing(true);
          }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Target className="h-3 w-3" />
          Set Goals
        </button>
      </div>
    );
  }

  // Build goal map for rendering
  const goalMap = new Map<string, { weekly: number; monthly: number }>();
  for (const g of goals) {
    goalMap.set(g.category, { weekly: g.weekly, monthly: g.monthly });
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
                  const map = new Map<string, { weekly: number; monthly: number }>();
                  for (const g of goals) {
                    map.set(g.category, { weekly: g.weekly, monthly: g.monthly });
                  }
                  setEditGoals(map);
                  setEditing(false);
                }}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGoals}
                disabled={saving}
                className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-3 w-3" />
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
              Edit Goals
            </button>
          )}
        </div>
      </div>

      {/* Presets row in edit mode */}
      {editing && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Presets:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {GOAL_METRICS.map((metric) => {
          const source = editing ? editGoals.get(metric.category) : goalMap.get(metric.category);
          const goalValue = source?.[period] ?? 0;
          const currentValue = stats?.[metric.statKey] ?? 0;
          const adjustedCurrent =
            period === "weekly" ? Math.round(currentValue * 0.28) : currentValue;
          const progress =
            goalValue > 0 ? Math.min(Math.round((adjustedCurrent / goalValue) * 100), 100) : 0;

          return (
            <div
              key={metric.category}
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
                {!editing && (
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
                )}
              </div>

              {!editing && (
                <div className="mb-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r transition-all duration-700",
                      progress >= 100 ? "from-emerald-500 to-emerald-400" : metric.gradient
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {editing ? (
                <div className="space-y-1.5">
                  <div>
                    <label className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                      Weekly
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editGoals.get(metric.category)?.weekly ?? 0}
                      onChange={(e) =>
                        updateGoal(metric.category, "weekly", parseInt(e.target.value) || 0)
                      }
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                      Monthly
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editGoals.get(metric.category)?.monthly ?? 0}
                      onChange={(e) =>
                        updateGoal(metric.category, "monthly", parseInt(e.target.value) || 0)
                      }
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
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
