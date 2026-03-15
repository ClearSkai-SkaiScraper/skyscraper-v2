"use client";

/**
 * ClaimIQ Analytics Dashboard
 *
 * Org-wide readiness analytics: score distribution, top missing fields,
 * most blocked sections, and autopilot opportunity stats.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BarChart3, Loader2, RefreshCw, Target, TrendingUp, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* Types (matches analytics engine output)                             */
/* ------------------------------------------------------------------ */

interface ScoreDistribution {
  grade: string;
  count: number;
  percentage: number;
}

interface MissingFieldStat {
  field: string;
  count: number;
  percentage: number;
  fixRate: number;
}

interface BlockedSectionStat {
  sectionKey: string;
  sectionLabel: string;
  blockedCount: number;
  blockedPercentage: number;
  avgCompleteness: number;
}

interface ReadinessAnalytics {
  orgId: string;
  computedAt: string;
  totalClaims: number;
  avgScore: number;
  scoreDistribution: ScoreDistribution[];
  topMissingFields: MissingFieldStat[];
  topBlockedSections: BlockedSectionStat[];
  readinessTiers: {
    packetReady: number;
    almostReady: number;
    needsWork: number;
    incomplete: number;
  };
  autopilotOpportunity: {
    totalAutoFixable: number;
    autoFixablePercentage: number;
    estimatedTimeSavedMinutes: number;
  };
}

interface Props {
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ClaimIQAnalyticsDashboard({ className }: Props) {
  const [data, setData] = useState<ReadinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/claimiq/analytics");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={cn("border-red-200 dark:border-red-900", className)}>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error ?? "No data"}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="mr-1 inline h-3 w-3" /> Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  const tiers = data.readinessTiers;
  const ap = data.autopilotOpportunity;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              ClaimIQ Analytics
            </CardTitle>
            <CardDescription>Org-wide readiness across {data.totalClaims} claims</CardDescription>
          </div>
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </CardHeader>

        <CardContent>
          {/* Score overview */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <TierCard
              label="Packet Ready"
              value={tiers.packetReady}
              total={data.totalClaims}
              color="green"
            />
            <TierCard
              label="Almost Ready"
              value={tiers.almostReady}
              total={data.totalClaims}
              color="blue"
            />
            <TierCard
              label="Needs Work"
              value={tiers.needsWork}
              total={data.totalClaims}
              color="amber"
            />
            <TierCard
              label="Incomplete"
              value={tiers.incomplete}
              total={data.totalClaims}
              color="red"
            />
          </div>

          {/* Average score */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-500" />
              <span className="text-sm text-muted-foreground">Avg Score:</span>
              <span className="text-lg font-bold">{Math.round(data.avgScore)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Distribution */}
      {data.scoreDistribution.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              {data.scoreDistribution.map((d) => {
                const maxPct = Math.max(...data.scoreDistribution.map((s) => s.percentage), 1);
                const height = Math.max((d.percentage / maxPct) * 80, 4);
                return (
                  <div key={d.grade} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-medium">{d.count}</span>
                    <div
                      className={cn(
                        "w-full rounded-t-sm",
                        d.grade === "A"
                          ? "bg-green-500"
                          : d.grade === "B"
                            ? "bg-blue-500"
                            : d.grade === "C"
                              ? "bg-amber-500"
                              : d.grade === "D"
                                ? "bg-orange-500"
                                : "bg-red-500"
                      )}
                      style={{ height: `${height}px` }}
                    />
                    <span className="text-xs font-semibold">{d.grade}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top missing fields */}
        {data.topMissingFields.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Most Missing Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.topMissingFields.slice(0, 8).map((f) => (
                <div key={f.field} className="flex items-center justify-between text-xs">
                  <span className="truncate text-slate-600 dark:text-slate-400">{f.field}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{f.count}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {f.fixRate}% fixed
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Top blocked sections */}
        {data.topBlockedSections.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Most Blocked Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.topBlockedSections.slice(0, 8).map((s) => (
                <div key={s.sectionKey} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-slate-600 dark:text-slate-400">
                      {s.sectionLabel}
                    </span>
                    <span className="font-mono">
                      {s.blockedCount} ({s.blockedPercentage}%)
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${s.avgCompleteness}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Autopilot opportunity */}
      {ap.totalAutoFixable > 0 && (
        <Card className="border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/20">
          <CardContent className="flex items-center gap-4 py-4">
            <Zap className="h-8 w-8 text-indigo-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                Autopilot Opportunity
              </p>
              <p className="text-xs text-muted-foreground">
                {ap.totalAutoFixable} items ({ap.autoFixablePercentage}% of gaps) can be
                auto-resolved — saving ~{Math.round(ap.estimatedTimeSavedMinutes)} minutes
              </p>
            </div>
            <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="h-5 w-5" />
              <span className="text-lg font-bold">{ap.autoFixablePercentage}%</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function TierCard({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: "green" | "blue" | "amber" | "red";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const colorMap = {
    green: "text-green-600 dark:text-green-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  };

  return (
    <div className="rounded-lg border bg-white/80 p-3 text-center dark:bg-slate-900/60">
      <p className={cn("text-xl font-bold", colorMap[color])}>{value}</p>
      <p className="text-[10px] text-muted-foreground">
        {label} ({pct}%)
      </p>
    </div>
  );
}
