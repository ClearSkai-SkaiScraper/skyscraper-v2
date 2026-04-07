"use client";

import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileBarChart,
  FileText,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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

/* ------------------------------------------------------------------ */
/*  StatCard (Reports Hub style)                                       */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
    blue: { bg: "from-blue-50 to-indigo-50", icon: "text-blue-600", border: "border-blue-200" },
    emerald: {
      bg: "from-emerald-50 to-teal-50",
      icon: "text-emerald-600",
      border: "border-emerald-200",
    },
    violet: {
      bg: "from-violet-50 to-purple-50",
      icon: "text-violet-600",
      border: "border-violet-200",
    },
    amber: { bg: "from-amber-50 to-orange-50", icon: "text-amber-600", border: "border-amber-200" },
  };
  const c = colorMap[color] ?? colorMap.blue;
  return (
    <div
      className={`rounded-xl border ${c.border} bg-gradient-to-br ${c.bg} p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 shadow-sm dark:bg-slate-700">
          <Icon className={`h-6 w-6 ${c.icon}`} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {subtext && <p className="text-xs text-slate-500 dark:text-slate-400">{subtext}</p>}
        </div>
      </div>
    </div>
  );
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
    void fetchData();
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
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="reports"
        title="Performance Dashboard"
        subtitle="Claims performance, team productivity, and feature usage analytics"
        icon={<TrendingUp className="h-6 w-6" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button asChild className="bg-white text-blue-600 hover:bg-blue-50">
            <Link href="/analytics/dashboard">
              <BarChart3 className="mr-2 h-4 w-4" />
              Overview
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Claims"
          value={claims?.summary.totalClaims ?? 0}
          subtext="All time"
          icon={FileText}
          color="blue"
        />
        <StatCard
          label="Close Rate"
          value={`${claims?.summary.closeRate ?? 0}%`}
          subtext="Last 30 days"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          label="Avg Cycle Time"
          value={`${claims?.summary.avgCycleTimeDays ?? 0}d`}
          subtext="Days to close"
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Weekly Active Users"
          value={team?.summary.weeklyActiveUsers ?? 0}
          subtext="Team members"
          icon={Users}
          color="violet"
        />
      </div>

      <Tabs defaultValue="claims" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <TabsTrigger
            value="claims"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
          >
            <FileText className="mr-2 h-4 w-4" />
            Claims
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
          >
            <Users className="mr-2 h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger
            value="features"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
          >
            <Activity className="mr-2 h-4 w-4" />
            Features
          </TabsTrigger>
        </TabsList>

        {/* Claims Tab */}
        <TabsContent value="claims" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Claims by Status */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Claims by Status
              </h3>
              <div className="space-y-4">
                {Object.entries(claims?.byStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3">
                    <StatusDot status={status} />
                    <span className="w-28 text-sm font-medium capitalize text-slate-700 dark:text-slate-300">
                      {status.replace(/_/g, " ")}
                    </span>
                    <Progress
                      value={
                        claims?.summary.totalClaims ? (count / claims.summary.totalClaims) * 100 : 0
                      }
                      className="h-2 flex-1"
                    />
                    <span className="w-10 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {count}
                    </span>
                  </div>
                ))}
                {Object.keys(claims?.byStatus || {}).length === 0 && (
                  <EmptyMessage message="No claims data yet. Analytics will populate as claims are created." />
                )}
              </div>
            </div>

            {/* 30-Day Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <FileBarChart className="h-5 w-5 text-emerald-600" />
                30-Day Summary
              </h3>
              <div className="space-y-3">
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
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Users className="h-5 w-5 text-violet-600" />
              Team Activity (30 Days)
            </h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {team?.summary.totalActivities30d ?? 0} total activities across{" "}
              {team?.userActivity?.length ?? 0} team members
            </p>
            <div className="space-y-3">
              {team?.userActivity?.map((user, idx) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white shadow-md">
                    {idx + 1}
                  </span>
                  <span className="w-48 truncate font-mono text-sm text-slate-600 dark:text-slate-400">
                    {user.userId.substring(0, 20)}...
                  </span>
                  <Progress
                    value={
                      team?.summary.totalActivities30d
                        ? (user.activityCount / team.summary.totalActivities30d) * 100
                        : 0
                    }
                    className="h-2 flex-1"
                  />
                  <span className="w-16 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {user.activityCount}
                  </span>
                </div>
              ))}
              {(!team?.userActivity || team.userActivity.length === 0) && (
                <EmptyMessage message="No team activity data yet." />
              )}
            </div>
          </div>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Activity className="h-5 w-5 text-amber-600" />
              Top Features (30 Days)
            </h3>
            <div className="space-y-3">
              {team?.topFeatures?.map((feature) => (
                <div
                  key={feature.event}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <Activity className="h-4 w-4 text-amber-500" />
                  <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {feature.event.replace(/_/g, " ").replace("feature:", "")}
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
                  >
                    {feature.count}
                  </Badge>
                </div>
              ))}
              {(!team?.topFeatures || team.topFeatures.length === 0) && (
                <EmptyMessage message="No feature usage data yet. Events will appear as users interact with features." />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
    <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-700">
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <span className="text-lg font-bold text-slate-900 dark:text-white">{value}</span>
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

  return <div className={cn("h-3 w-3 rounded-full shadow-sm", colors[status] || "bg-zinc-300")} />;
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart3 className="mb-4 h-12 w-12 text-slate-300" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}
