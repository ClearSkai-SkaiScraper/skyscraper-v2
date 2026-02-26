"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PILOT_COHORTS } from "@/lib/analytics/pilotTracking";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Loader2, MessageSquare, Star, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pilot Dashboard</h1>
        <p className="text-muted-foreground">
          Track pilot cohort health, activation, retention, and user feedback.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Feedback"
          value={stats?.totalFeedback ?? 0}
          icon={MessageSquare}
          color="indigo"
        />
        <StatCard
          title="Avg Rating"
          value={stats?.avgRating ? stats.avgRating.toFixed(1) : "—"}
          subtitle="out of 4.0"
          icon={Star}
          color="amber"
        />
        <StatCard title="Pilot Cohorts" value={PILOT_COHORTS.length} icon={Users} color="emerald" />
        <StatCard
          title="Bug Reports"
          value={stats?.feedbackByType?.bug ?? 0}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      <Tabs defaultValue="feedback">
        <TabsList>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          <TabsTrigger value="activation">Activation</TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="space-y-4">
          {/* Feedback by type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feedback Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats?.feedbackByType || {}).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-28 text-sm font-medium capitalize">{type}</span>
                    <Progress
                      value={
                        stats?.totalFeedback ? ((count as number) / stats.totalFeedback) * 100 : 0
                      }
                      className="flex-1"
                    />
                    <span className="w-10 text-right text-sm text-muted-foreground">
                      {count as number}
                    </span>
                  </div>
                ))}
                {Object.keys(stats?.feedbackByType || {}).length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No feedback yet. The feedback widget is live — feedback will appear here as
                    users submit it.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recentFeedback?.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Badge variant="outline" className="mt-0.5 capitalize">
                      {item.metadata?.type || "other"}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm">{item.metadata?.message}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {item.metadata?.page && <span>{item.metadata.page}</span>}
                        <span>·</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        {item.metadata?.rating != null && (
                          <>
                            <span>·</span>
                            <span>{"⭐".repeat(item.metadata.rating + 1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )) ?? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No feedback submissions yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-4">
          {PILOT_COHORTS.map((cohort) => (
            <Card key={cohort.name}>
              <CardHeader>
                <CardTitle className="text-base">{cohort.name}</CardTitle>
                <CardDescription>
                  Start: {cohort.startDate}
                  {cohort.endDate ? ` — End: ${cohort.endDate}` : " — Ongoing"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {cohort.orgIds.length} org{cohort.orgIds.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {cohort.notes && (
                    <span className="text-sm text-muted-foreground">{cohort.notes}</span>
                  )}
                </div>
                {cohort.orgIds.length === 0 && (
                  <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    No organizations enrolled yet. Add org IDs to{" "}
                    <code className="rounded bg-amber-100 px-1 text-xs dark:bg-amber-900">
                      src/lib/analytics/pilotTracking.ts
                    </code>{" "}
                    when the pilot begins.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="activation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activation Score Calculator</CardTitle>
              <CardDescription>
                Track which milestones each org has completed. Max score: 100.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-4">
                <div className="space-y-2 text-sm">
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
                <div className="mt-4 border-t pt-3">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total Possible</span>
                    <span>100 pts</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Retention Brackets</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            color === "indigo" &&
              "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
            color === "amber" &&
              "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
            color === "emerald" &&
              "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
            color === "red" && "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">
            {title}
            {subtitle && <span className="ml-1">({subtitle})</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MilestoneRow({ label, weight }: { label: string; weight: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
      </div>
      <Badge variant="secondary">{weight} pts</Badge>
    </div>
  );
}

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
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div
        className={cn(
          "mt-0.5 h-3 w-3 rounded-full",
          status === "healthy" && "bg-green-500",
          status === "at-risk" && "bg-yellow-500",
          status === "churning" && "bg-orange-500",
          status === "churned" && "bg-red-500"
        )}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
