"use client";

/**
 * ClaimIQ™ — Readiness Analytics Dashboard
 *
 * Org-wide analytics showing:
 *   - Score distribution (grade breakdown)
 *   - Most commonly missing fields
 *   - Most blocked sections
 *   - Readiness tiers
 *   - Autopilot opportunity (how much can be auto-fixed)
 */

import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  orgId: string;
  computedAt: string;
  totalClaims: number;
  avgScore: number;
  scoreDistribution: Array<{ grade: string; count: number; percentage: number }>;
  topMissingFields: Array<{
    field: string;
    count: number;
    percentage: number;
    fixRate: number;
  }>;
  topBlockedSections: Array<{
    sectionKey: string;
    sectionLabel: string;
    blockedCount: number;
    blockedPercentage: number;
    avgCompleteness: number;
  }>;
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

interface AnalyticsDashboardProps {
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/claimiq/analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="ml-2 text-sm text-gray-500">
            Computing analytics across all claims...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={cn("border-red-200 dark:border-red-800", className)}>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-red-500">{error || "No analytics available"}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={fetchAnalytics}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (data.totalClaims === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <BarChart3 className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No active claims to analyze.</p>
        </CardContent>
      </Card>
    );
  }

  const gradeColors: Record<string, string> = {
    A: "bg-emerald-500",
    B: "bg-blue-500",
    C: "bg-yellow-500",
    D: "bg-orange-500",
    F: "bg-red-500",
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Readiness Analytics
          </h2>
          <p className="text-sm text-gray-500">
            Across {data.totalClaims} active claims · Updated{" "}
            {new Date(data.computedAt).toLocaleTimeString()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} className="gap-1">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Avg Readiness"
          value={`${data.avgScore}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          color="text-indigo-600"
        />
        <StatCard
          label="Packet-Ready"
          value={String(data.readinessTiers.packetReady)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="text-emerald-600"
          subtext={`of ${data.totalClaims} claims`}
        />
        <StatCard
          label="Needs Work"
          value={String(data.readinessTiers.needsWork + data.readinessTiers.incomplete)}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="text-amber-600"
        />
        <StatCard
          label="Auto-Fixable"
          value={`${data.autopilotOpportunity.autoFixablePercentage}%`}
          icon={<Bot className="h-4 w-4" />}
          color="text-purple-600"
          subtext={`~${data.autopilotOpportunity.estimatedTimeSavedMinutes}min saved`}
        />
      </div>

      {/* Grade Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.scoreDistribution.map((item) => (
              <div key={item.grade} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded text-xs font-bold text-white",
                    gradeColors[item.grade] || "bg-gray-500"
                  )}
                >
                  {item.grade}
                </span>
                <div className="flex-1">
                  <div className="h-5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        gradeColors[item.grade] || "bg-gray-400"
                      )}
                      style={{ width: `${Math.max(item.percentage, 2)}%` }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right text-sm font-medium">
                  {item.count} <span className="text-xs text-gray-400">({item.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Two Column: Missing Fields + Blocked Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Missing Fields */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Most Commonly Missing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topMissingFields.slice(0, 8).map((field, i) => (
                <div key={field.field} className="flex items-center gap-2">
                  <span className="w-5 text-xs font-bold text-gray-400">#{i + 1}</span>
                  <span className="flex-1 truncate text-sm">{field.field}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {field.count} claims ({field.percentage}%)
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Most Blocked Sections */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-red-500" />
              Most Blocked Sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topBlockedSections.slice(0, 8).map((section, i) => (
                <div key={section.sectionKey} className="flex items-center gap-2">
                  <span className="w-5 text-xs font-bold text-gray-400">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <span className="truncate text-sm">{section.sectionLabel}</span>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${section.avgCompleteness}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{section.blockedCount} blocked</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Readiness Tiers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Readiness Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            <TierBar
              label="Packet Ready"
              count={data.readinessTiers.packetReady}
              total={data.totalClaims}
              color="bg-emerald-500"
            />
            <TierBar
              label="Almost Ready"
              count={data.readinessTiers.almostReady}
              total={data.totalClaims}
              color="bg-blue-500"
            />
            <TierBar
              label="Needs Work"
              count={data.readinessTiers.needsWork}
              total={data.totalClaims}
              color="bg-yellow-500"
            />
            <TierBar
              label="Incomplete"
              count={data.readinessTiers.incomplete}
              total={data.totalClaims}
              color="bg-red-500"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtext?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <span className={color}>{icon}</span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
        <div className={cn("mt-1 text-2xl font-bold", color)}>{value}</div>
        {subtext && <p className="text-[10px] text-gray-400">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function TierBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="text-center">
      <div className="relative mx-auto mb-2 h-24 w-full max-w-[60px] overflow-hidden rounded-t-lg bg-gray-100 dark:bg-gray-800">
        <div
          className={cn("absolute bottom-0 left-0 right-0 rounded-t-lg transition-all", color)}
          style={{ height: `${Math.max(pct, 5)}%` }}
        />
      </div>
      <div className="text-lg font-bold">{count}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
