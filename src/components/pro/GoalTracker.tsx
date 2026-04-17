"use client";

import { Award, CheckCircle, Flame, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  period: "daily" | "weekly" | "monthly";
  icon: React.ReactNode;
  color: string;
}

interface GoalTrackerProps {
  className?: string;
}

const DEFAULT_GOALS: Goal[] = [
  {
    id: "claims",
    label: "Claims Closed",
    current: 12,
    target: 20,
    unit: "claims",
    period: "weekly",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "blue",
  },
  {
    id: "revenue",
    label: "Revenue",
    current: 47500,
    target: 75000,
    unit: "dollars",
    period: "weekly",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "green",
  },
  {
    id: "inspections",
    label: "Inspections",
    current: 8,
    target: 15,
    unit: "inspections",
    period: "weekly",
    icon: <Target className="h-4 w-4" />,
    color: "purple",
  },
  {
    id: "leads",
    label: "Leads Generated",
    current: 34,
    target: 50,
    unit: "leads",
    period: "weekly",
    icon: <Zap className="h-4 w-4" />,
    color: "amber",
  },
];

export function GoalTracker({ className }: GoalTrackerProps) {
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS);
  const [streak, setStreak] = useState(5);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Fetch goals from API
    void fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/dashboard/goals");
      if (res.ok) {
        const data = await res.json();
        if (data.goals) setGoals(data.goals);
        if (data.streak) setStreak(data.streak);
      }
    } catch {
      // Use default goals
    }
  };

  const getProgressColor = (goal: Goal) => {
    const percent = (goal.current / goal.target) * 100;
    if (percent >= 100) return "bg-green-500";
    if (percent >= 75) return "bg-blue-500";
    if (percent >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; light: string }> = {
      blue: { bg: "bg-blue-500", text: "text-blue-500", light: "bg-blue-100 dark:bg-blue-900" },
      green: {
        bg: "bg-green-500",
        text: "text-green-500",
        light: "bg-green-100 dark:bg-green-900",
      },
      purple: {
        bg: "bg-purple-500",
        text: "text-purple-500",
        light: "bg-purple-100 dark:bg-purple-900",
      },
      amber: {
        bg: "bg-amber-500",
        text: "text-amber-500",
        light: "bg-amber-100 dark:bg-amber-900",
      },
    };
    return colors[color] || colors.blue;
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === "dollars") {
      return `$${(value / 100).toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  const totalProgress =
    goals.reduce((sum, g) => sum + (g.current / g.target) * 100, 0) / goals.length;

  return (
    <div className={cn("rounded-2xl border bg-card p-6", className)}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Weekly Goals</h3>
            <p className="text-sm text-muted-foreground">Track your progress</p>
          </div>
        </div>

        {/* Streak Badge */}
        <div className="flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 dark:bg-orange-900/30">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
            {streak} week streak!
          </span>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-6 rounded-xl bg-muted/50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm font-bold">{Math.round(totalProgress)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              totalProgress >= 100 ? "bg-green-500" : "bg-gradient-to-r from-blue-500 to-purple-500"
            )}
            style={{ width: `${Math.min(totalProgress, 100)}%` }}
          />
        </div>
        {totalProgress >= 100 && (
          <div className="mt-2 flex items-center gap-2 text-green-600 dark:text-green-400">
            <Award className="h-4 w-4" />
            <span className="text-sm font-medium">All goals achieved! 🎉</span>
          </div>
        )}
      </div>

      {/* Individual Goals */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const percent = Math.min((goal.current / goal.target) * 100, 100);
          const colors = getColorClasses(goal.color);
          const isComplete = percent >= 100;

          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full",
                      colors.light
                    )}
                  >
                    <span className={colors.text}>{goal.icon}</span>
                  </div>
                  <span className="text-sm font-medium">{goal.label}</span>
                  {isComplete && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{formatValue(goal.current, goal.unit)}</span>
                  <span className="text-sm text-muted-foreground">
                    {" / "}
                    {formatValue(goal.target, goal.unit)}
                  </span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    getProgressColor(goal)
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setIsEditing(!isEditing)}
        >
          Edit Goals
        </Button>
        <Button size="sm" className="flex-1 bg-[#117CFF] hover:bg-[#0066DD]" asChild>
          <a href="/leaderboard">View Leaderboard</a>
        </Button>
      </div>
    </div>
  );
}

// Compact version for sidebar
export function GoalTrackerCompact({ className }: { className?: string }) {
  const goals = DEFAULT_GOALS.slice(0, 2);
  const totalProgress =
    goals.reduce((sum, g) => sum + (g.current / g.target) * 100, 0) / goals.length;

  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Weekly Goals</span>
        </div>
        <span className="text-xs font-bold text-muted-foreground">
          {Math.round(totalProgress)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
          style={{ width: `${Math.min(totalProgress, 100)}%` }}
        />
      </div>
    </div>
  );
}
