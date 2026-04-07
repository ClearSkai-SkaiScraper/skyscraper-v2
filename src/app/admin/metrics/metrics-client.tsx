"use client";

import { useAuth } from "@clerk/nextjs";
import { BarChart, CheckCircle2, Clock, TrendingUp, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface DailyMetrics {
  date: string;
  reports: number;
  accepted: number;
  tokens: number;
  acceptanceRate: number;
}

interface MetricsTotals {
  reports: number;
  accepted: number;
  tokens: number;
  acceptanceRate: number;
  avgTimeToAcceptHours: number;
}

interface AdminMetricsResult {
  daysArr: DailyMetrics[];
  totals: MetricsTotals;
}

interface UserTokenUsage {
  userId: string;
  tokens: number;
  count: number;
}

export function MetricsClient() {
  const { orgId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AdminMetricsResult | null>(null);
  const [userUsage, setUserUsage] = useState<UserTokenUsage[]>([]);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;

    async function fetchMetrics() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/admin/metrics?days=${days}`);
        if (!res.ok) {
          throw new Error("Failed to fetch metrics");
        }

        const data = await res.json();
        setMetrics(data.metrics);
        setUserUsage(data.userUsage || []);
      } catch (err) {
        logger.error("Metrics fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    }

    void fetchMetrics();
  }, [orgId, days]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6 p-6">
        <div>
          <Skeleton className="mb-2 h-10 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="mb-2 h-12 w-24" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Metrics</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container mx-auto max-w-7xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>No metrics data available for the selected period.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { totals, daysArr } = metrics;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
            📊 Admin Metrics
          </h1>
          <p className="mt-1 text-muted-foreground">Performance insights and usage analytics</p>
        </div>

        {/* Time Period Selector */}
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                days === d
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Reports */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Reports</CardTitle>
              <BarChart className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {totals.reports.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-gray-500">Last {days} days</p>
          </CardContent>
        </Card>

        {/* Accepted Reports */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Accepted Reports</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {totals.accepted.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {totals.acceptanceRate.toFixed(1)}% acceptance rate
            </p>
          </CardContent>
        </Card>

        {/* Tokens Used */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Tokens Used</CardTitle>
              <Zap className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {totals.tokens.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-gray-500">AI report generation</p>
          </CardContent>
        </Card>

        {/* Avg Time to Accept */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Time to Accept
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">
              {totals.avgTimeToAcceptHours.toFixed(1)}h
            </div>
            <p className="mt-1 text-xs text-gray-500">From sent to accepted</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Daily Breakdown
          </CardTitle>
          <CardDescription>Detailed metrics by day for the last {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left font-semibold">Date</th>
                  <th className="p-3 text-right font-semibold">Reports</th>
                  <th className="p-3 text-right font-semibold">Accepted</th>
                  <th className="p-3 text-right font-semibold">Rate</th>
                  <th className="p-3 text-right font-semibold">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {daysArr.map((day) => (
                  <tr key={day.date} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{day.date}</td>
                    <td className="p-3 text-right">{day.reports}</td>
                    <td className="p-3 text-right">{day.accepted}</td>
                    <td className="p-3 text-right">
                      <span
                        className={`font-semibold ${
                          day.acceptanceRate >= 80
                            ? "text-green-600"
                            : day.acceptanceRate >= 50
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {day.acceptanceRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold text-purple-600">{day.tokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User Token Leaderboard */}
      {userUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Top Token Users
            </CardTitle>
            <CardDescription>Users ranked by token usage in the last {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userUsage.slice(0, 10).map((user, idx) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        idx === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : idx === 1
                            ? "bg-gray-100 text-gray-600"
                            : idx === 2
                              ? "bg-orange-100 text-orange-600"
                              : "bg-blue-50 text-blue-600"
                      } text-sm font-bold`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-mono text-sm">{user.userId.substring(0, 8)}...</div>
                      <div className="text-xs text-gray-500">{user.count} reports</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600">
                      {user.tokens.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">tokens</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
