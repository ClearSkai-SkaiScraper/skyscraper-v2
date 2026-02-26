"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ClaimsAnalytics {
  summary: {
    totalClaims: number;
    newClaims30d: number;
    closedClaims30d: number;
    closeRate: number;
    avgCycleTimeDays: number;
  };
  byStatus: Record<string, number>;
}

interface TeamAnalytics {
  summary: {
    weeklyActiveUsers: number;
    totalActivities30d: number;
    avgActivitiesPerUser: number;
  };
  userActivity: { userId: string; activityCount: number }[];
  topFeatures: { event: string; count: number }[];
}

export default function PerformanceDashboardPage() {
  const [claims, setClaims] = useState<ClaimsAnalytics | null>(null);
  const [team, setTeam] = useState<TeamAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [claimsRes, teamRes] = await Promise.all([
        fetch("/api/analytics/claims"),
        fetch("/api/analytics/team"),
      ]);

      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data.data);
      }
      if (teamRes.ok) {
        const data = await teamRes.json();
        setTeam(data.data);
      }
    } catch {
      console.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    try {
      const data = {
        claims,
        team,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `skaiscraper-analytics-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Export failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Claims performance, team productivity, and feature usage analytics.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Claims"
          value={claims?.summary.totalClaims ?? 0}
          icon={FileText}
          color="indigo"
        />
        <KpiCard
          title="Close Rate (30d)"
          value={`${claims?.summary.closeRate ?? 0}%`}
          icon={CheckCircle2}
          color="emerald"
        />
        <KpiCard
          title="Avg Cycle Time"
          value={`${claims?.summary.avgCycleTimeDays ?? 0}d`}
          icon={Clock}
          color="blue"
        />
        <KpiCard
          title="Weekly Active Users"
          value={team?.summary.weeklyActiveUsers ?? 0}
          icon={Users}
          color="purple"
        />
      </div>

      <Tabs defaultValue="claims">
        <TabsList>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="features">Feature Usage</TabsTrigger>
        </TabsList>

        {/* Claims Tab */}
        <TabsContent value="claims" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Claims by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(claims?.byStatus || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-3">
                      <StatusDot status={status} />
                      <span className="w-28 text-sm font-medium capitalize">
                        {status.replace(/_/g, " ")}
                      </span>
                      <Progress
                        value={
                          claims?.summary.totalClaims
                            ? (count / claims.summary.totalClaims) * 100
                            : 0
                        }
                        className="flex-1"
                      />
                      <span className="w-10 text-right text-sm font-semibold">{count}</span>
                    </div>
                  ))}
                  {Object.keys(claims?.byStatus || {}).length === 0 && (
                    <EmptyMessage message="No claims data yet. Analytics will populate as claims are created." />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">30-Day Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricRow
                  label="New Claims"
                  value={claims?.summary.newClaims30d ?? 0}
                  icon={TrendingUp}
                />
                <MetricRow
                  label="Closed Claims"
                  value={claims?.summary.closedClaims30d ?? 0}
                  icon={CheckCircle2}
                />
                <MetricRow
                  label="Avg Cycle Time"
                  value={`${claims?.summary.avgCycleTimeDays ?? 0} days`}
                  icon={Clock}
                />
                <MetricRow
                  label="Close Rate"
                  value={`${claims?.summary.closeRate ?? 0}%`}
                  icon={BarChart3}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team Activity (30 Days)</CardTitle>
              <CardDescription>
                {team?.summary.totalActivities30d ?? 0} total activities across{" "}
                {team?.userActivity?.length ?? 0} team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {team?.userActivity?.map((user, idx) => (
                  <div key={user.userId} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {idx + 1}
                    </span>
                    <span className="w-48 truncate font-mono text-sm">
                      {user.userId.substring(0, 20)}...
                    </span>
                    <Progress
                      value={
                        team?.summary.totalActivities30d
                          ? (user.activityCount / team.summary.totalActivities30d) * 100
                          : 0
                      }
                      className="flex-1"
                    />
                    <span className="w-16 text-right text-sm font-semibold">
                      {user.activityCount}
                    </span>
                  </div>
                ))}
                {(!team?.userActivity || team.userActivity.length === 0) && (
                  <EmptyMessage message="No team activity data yet." />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Features (30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {team?.topFeatures?.map((feature) => (
                  <div key={feature.event} className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">
                      {feature.event.replace(/_/g, " ").replace("feature:", "")}
                    </span>
                    <Badge variant="secondary">{feature.count}</Badge>
                  </div>
                ))}
                {(!team?.topFeatures || team.topFeatures.length === 0) && (
                  <EmptyMessage message="No feature usage data yet. Events will appear as users interact with features." />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
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
            color === "blue" && "bg-blue-100 text-blue-600 dark:bg-blue-950",
            color === "purple" && "bg-purple-100 text-purple-600 dark:bg-purple-950"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-blue-500",
    active: "bg-green-500",
    in_progress: "bg-yellow-500",
    closed: "bg-zinc-400",
    settled: "bg-emerald-500",
    completed: "bg-emerald-500",
    denied: "bg-red-500",
  };

  return <div className={cn("h-2.5 w-2.5 rounded-full", colors[status] || "bg-zinc-300")} />;
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
