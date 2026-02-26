"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ONBOARDING_STEPS } from "@/hooks/useOnboardingTracking";
import { cn } from "@/lib/utils";
import { BarChart3, CheckCircle2, Lightbulb, Loader2, TrendingDown, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface StepMetric {
  stepId: string;
  label: string;
  startedCount: number;
  completedCount: number;
  dropOffCount: number;
  dropOffRate: number;
  avgDurationMs: number;
}

export default function OnboardingAnalyticsPage() {
  const [metrics, setMetrics] = useState<StepMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchMetrics = useCallback(async () => {
    try {
      // Fetch onboarding events from pilot feedback
      const res = await fetch("/api/pilot/feedback?limit=100");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      const items = data.data?.items || [];

      // Parse onboarding events
      const stepCounts: Record<string, number> = {};
      const stepDurations: Record<string, number[]> = {};
      const userSteps: Record<string, Set<string>> = {};

      for (const item of items) {
        const meta = item.metadata as Record<string, unknown> | null;
        const msg = (meta?.message as string) || "";

        if (msg.startsWith("onboarding:")) {
          const stepId = msg.replace("onboarding:", "");
          stepCounts[stepId] = (stepCounts[stepId] || 0) + 1;

          // Track per-user steps
          const uid = item.userId || "unknown";
          if (!userSteps[uid]) userSteps[uid] = new Set();
          userSteps[uid].add(stepId);
        }
      }

      const totalUsersCount = Object.keys(userSteps).length;
      setTotalUsers(totalUsersCount);

      // Build funnel metrics
      const funnelMetrics: StepMetric[] = ONBOARDING_STEPS.map((step, idx) => {
        const completed = stepCounts[step.id] || 0;
        const prevCompleted =
          idx === 0 ? totalUsersCount || completed : stepCounts[ONBOARDING_STEPS[idx - 1].id] || 0;
        const started = Math.max(completed, prevCompleted);
        const dropped = started - completed;
        const dropRate = started > 0 ? (dropped / started) * 100 : 0;
        const durations = stepDurations[step.id] || [];
        const avgDuration =
          durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

        return {
          stepId: step.id,
          label: step.label,
          startedCount: started,
          completedCount: completed,
          dropOffCount: dropped,
          dropOffRate: dropRate,
          avgDurationMs: avgDuration,
        };
      });

      setMetrics(funnelMetrics);
    } catch {
      console.error("Failed to load onboarding analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Find highest drop-off step
  const worstStep = metrics.reduce(
    (worst, step) => (step.dropOffRate > (worst?.dropOffRate || 0) ? step : worst),
    null as StepMetric | null
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Onboarding Analytics</h1>
        <p className="text-muted-foreground">
          Track where users drop off and optimize the activation funnel.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStat label="Total Users" value={totalUsers} icon={Users} color="indigo" />
        <QuickStat
          label="Fully Activated"
          value={metrics.find((m) => m.stepId === "activated")?.completedCount ?? 0}
          icon={CheckCircle2}
          color="emerald"
        />
        <QuickStat
          label="Biggest Drop-Off"
          value={worstStep ? `${worstStep.dropOffRate.toFixed(0)}%` : "—"}
          subtitle={worstStep?.label}
          icon={TrendingDown}
          color="red"
        />
        <QuickStat
          label="Steps Tracked"
          value={ONBOARDING_STEPS.length}
          icon={BarChart3}
          color="blue"
        />
      </div>

      {/* Funnel visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Onboarding Funnel</CardTitle>
          <CardDescription>
            Each step shows how many users reached it and how many dropped off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.map((step, idx) => (
              <div key={step.stepId}>
                <div className="flex items-center gap-3">
                  {/* Step number */}
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                      step.completedCount > 0
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                    )}
                  >
                    {idx + 1}
                  </div>

                  {/* Step info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{step.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{step.completedCount}</span>
                        {step.dropOffRate > 30 && (
                          <Badge variant="destructive" className="text-[10px]">
                            -{step.dropOffRate.toFixed(0)}% drop
                          </Badge>
                        )}
                        {step.dropOffRate > 0 && step.dropOffRate <= 30 && (
                          <Badge variant="secondary" className="text-[10px]">
                            -{step.dropOffRate.toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress
                      value={totalUsers > 0 ? (step.completedCount / totalUsers) * 100 : 0}
                      className="mt-1 h-2"
                    />
                  </div>
                </div>

                {/* Arrow between steps */}
                {idx < metrics.length - 1 && (
                  <div className="ml-3 flex h-4 items-center">
                    <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalUsers === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium">No onboarding data yet</p>
                <p className="text-sm text-muted-foreground">
                  Data will appear here as users go through the onboarding flow. The tracking hook
                  is active and collecting events.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization hints */}
      {worstStep && worstStep.dropOffRate > 20 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-800 dark:text-amber-200">
              <Lightbulb className="h-4 w-4" />
              Optimization Suggestion
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-700 dark:text-amber-300">
            <p>
              <strong>{worstStep.label}</strong> has a {worstStep.dropOffRate.toFixed(0)}% drop-off
              rate. Consider:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Adding inline help or tooltips at this step</li>
              <li>Reducing the number of required fields</li>
              <li>Adding a progress indicator showing how close they are to completion</li>
              <li>Sending a follow-up email to users who stall at this step</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function QuickStat({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            color === "indigo" && "bg-indigo-100 text-indigo-600 dark:bg-indigo-950",
            color === "emerald" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-950",
            color === "red" && "bg-red-100 text-red-600 dark:bg-red-950",
            color === "blue" && "bg-blue-100 text-blue-600 dark:bg-blue-950"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">
            {label}
            {subtitle && <span className="ml-1">· {subtitle}</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
