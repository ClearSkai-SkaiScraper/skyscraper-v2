"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageSquare,
  Settings,
  Star,
  Target,
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
import { PILOT_COHORTS } from "@/lib/analytics/pilotTracking";
import { cn } from "@/lib/utils";

interface FeedbackItem {
  id: string;
  userId: string;
  metadata: {
    type: string;
    message: string;
    rating?: number;
    page?: string;
  };
  createdAt: string;
}

interface PilotStats {
  totalFeedback: number;
  avgRating: number;
  feedbackByType: Record<string, number>;
  recentFeedback: FeedbackItem[];
}

/* ------------------------------------------------------------------ */
/*  StatCard (Reports Hub style)                                       */
/* ------------------------------------------------------------------ */
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
    indigo: {
      bg: "from-indigo-50 to-blue-50",
      icon: "text-indigo-600",
      border: "border-indigo-200",
    },
    amber: { bg: "from-amber-50 to-orange-50", icon: "text-amber-600", border: "border-amber-200" },
    emerald: {
      bg: "from-emerald-50 to-teal-50",
      icon: "text-emerald-600",
      border: "border-emerald-200",
    },
    red: { bg: "from-red-50 to-rose-50", icon: "text-red-600", border: "border-red-200" },
  };
  const c = colorMap[color] ?? colorMap.indigo;
  return (
    <div
      className={`rounded-xl border ${c.border} bg-gradient-to-br ${c.bg} p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 shadow-sm dark:bg-slate-700">
          <Icon className={`h-6 w-6 ${c.icon}`} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MilestoneRow                                                       */
/* ------------------------------------------------------------------ */
function MilestoneRow({ label, weight }: { label: string; weight: number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <Badge
        variant="secondary"
        className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
      >
        {weight} pts
      </Badge>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  RetentionBadge                                                     */
/* ------------------------------------------------------------------ */
function RetentionBadge({
  status,
  label,
  description,
}: {
  status: string;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div
        className={cn(
          "mt-0.5 h-3.5 w-3.5 rounded-full shadow-sm",
          status === "healthy" && "bg-emerald-500",
          status === "at-risk" && "bg-yellow-500",
          status === "churning" && "bg-orange-500",
          status === "churned" && "bg-red-500"
        )}
      />
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function PilotDashboardPage() {
  const [stats, setStats] = useState<PilotStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/feedback?limit=100");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      const items = data.data?.items || [];
      const feedbackByType: Record<string, number> = {};
      let ratingSum = 0;
      let ratingCount = 0;

      for (const item of items) {
        const type = item.metadata?.type || "other";
        feedbackByType[type] = (feedbackByType[type] || 0) + 1;
        if (item.metadata?.rating != null) {
          ratingSum += item.metadata.rating;
          ratingCount++;
        }
      }

      setStats({
        totalFeedback: data.data?.total || 0,
        avgRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
        feedbackByType,
        recentFeedback: items.slice(0, 20),
      });
    } catch {
      console.error("Failed to load pilot stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
        section="settings"
        title="Pilot Dashboard"
        subtitle="Track pilot cohort health, activation, retention, and user feedback"
        icon={<ClipboardList className="h-6 w-6" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-white text-slate-600 hover:bg-slate-50">
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/analytics/dashboard">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* Quick Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Feedback"
          value={stats?.totalFeedback ?? 0}
          subtitle="From pilot users"
          icon={MessageSquare}
          color="indigo"
        />
        <StatCard
          title="Avg Rating"
          value={stats?.avgRating ? stats.avgRating.toFixed(1) : "—"}
          subtitle="Out of 4.0"
          icon={Star}
          color="amber"
        />
        <StatCard
          title="Pilot Cohorts"
          value={PILOT_COHORTS.length}
          subtitle="Active groups"
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Bug Reports"
          value={stats?.feedbackByType?.bug ?? 0}
          subtitle="Needs attention"
          icon={AlertTriangle}
          color="red"
        />
      </div>

      <Tabs defaultValue="feedback" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <TabsTrigger
            value="feedback"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Feedback
          </TabsTrigger>
          <TabsTrigger
            value="cohorts"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
          >
            <Users className="mr-2 h-4 w-4" />
            Cohorts
          </TabsTrigger>
          <TabsTrigger
            value="activation"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
          >
            <Activity className="mr-2 h-4 w-4" />
            Activation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="mt-6 space-y-6">
          {/* Feedback by type */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              Feedback Breakdown
            </h3>
            <div className="space-y-4">
              {Object.entries(stats?.feedbackByType || {}).map(([type, count]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-28 text-sm font-medium capitalize text-slate-700 dark:text-slate-300">
                    {type}
                  </span>
                  <Progress
                    value={
                      stats?.totalFeedback ? ((count as number) / stats.totalFeedback) * 100 : 0
                    }
                    className="h-2 flex-1"
                  />
                  <span className="w-10 text-right text-sm font-medium text-slate-600 dark:text-slate-400">
                    {count as number}
                  </span>
                </div>
              ))}
              {Object.keys(stats?.feedbackByType || {}).length === 0 && (
                <div className="py-8 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    No feedback yet. The feedback widget is live — feedback will appear here as
                    users submit it.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent feedback */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <MessageSquare className="h-5 w-5 text-amber-600" />
              Recent Feedback
            </h3>
            <div className="space-y-3">
              {stats?.recentFeedback?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <Badge variant="outline" className="mt-0.5 bg-white capitalize dark:bg-slate-700">
                    {item.metadata?.type || "other"}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {item.metadata?.message}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      {item.metadata?.page && (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 dark:bg-slate-700">
                          {item.metadata.page}
                        </span>
                      )}
                      <span>·</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      {item.metadata?.rating != null && (
                        <>
                          <span>·</span>
                          <span className="text-amber-500">
                            {"⭐".repeat(item.metadata.rating + 1)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )) ?? (
                <div className="py-8 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p className="text-sm text-slate-500">No feedback submissions yet.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cohorts" className="mt-6 space-y-4">
          {PILOT_COHORTS.map((cohort) => (
            <div
              key={cohort.name}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {cohort.name}
                </h3>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                >
                  Active
                </Badge>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Start: {cohort.startDate}
                {cohort.endDate ? ` — End: ${cohort.endDate}` : " — Ongoing"}
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {cohort.orgIds.length} org{cohort.orgIds.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {cohort.notes && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">{cohort.notes}</span>
                )}
              </div>
              {cohort.orgIds.length === 0 && (
                <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  <AlertTriangle className="mb-2 h-5 w-5 text-amber-500" />
                  No organizations enrolled yet. Add org IDs to{" "}
                  <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900">
                    src/lib/analytics/pilotTracking.ts
                  </code>{" "}
                  when the pilot begins.
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="activation" className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Target className="h-5 w-5 text-emerald-600" />
              Activation Score Calculator
            </h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Track which milestones each org has completed. Max score: 100.
            </p>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                <MilestoneRow label="Onboarding Complete" weight={15} />
                <MilestoneRow label="First Claim Created" weight={20} />
                <MilestoneRow label="First Photo Uploaded" weight={15} />
                <MilestoneRow label="First Report Generated" weight={15} />
                <MilestoneRow label="First Client Invited" weight={10} />
                <MilestoneRow label="First Team Member Added" weight={10} />
                <MilestoneRow label="First Export" weight={5} />
                <MilestoneRow label="First SMS Sent" weight={5} />
                <MilestoneRow label="Billing Activated" weight={5} />
              </div>
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Total Possible
                  </span>
                  <span className="rounded-lg bg-emerald-100 px-3 py-1 text-lg font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
                    100 pts
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Retention Brackets
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <RetentionBadge
                status="healthy"
                label="Healthy"
                description="Active 50%+ of days since signup"
              />
              <RetentionBadge
                status="at-risk"
                label="At Risk"
                description="Active 20–50% of days"
              />
              <RetentionBadge
                status="churning"
                label="Churning"
                description="Active less than 20% of days"
              />
              <RetentionBadge
                status="churned"
                label="Churned"
                description="14+ days, less than 10% active"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
