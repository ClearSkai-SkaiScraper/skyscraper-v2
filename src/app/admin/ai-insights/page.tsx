/**
 * AI Insights Dashboard
 *
 * Internal page showing AI usage statistics, performance metrics,
 * and logs for debugging and proving value.
 *
 * Route: /admin/ai-insights
 */

"use client";

import {
  Activity,
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Search,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface AIStats {
  totalOperations: number;
  successRate: number;
  averageExecutionTime: number;
  taskBreakdown: Record<string, number>;
  errorBreakdown: Record<string, number>;
}

export default function AIInsightsDashboard() {
  const [stats, setStats] = useState<AIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(7);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "claim" | "task">("all");

  useEffect(() => {
    void fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai/logs?type=stats&days=${timeRange}`);
      const data = await response.json();

      if (data.success) {
        setStats({
          totalOperations: data.totalOperations,
          successRate: data.successRate,
          averageExecutionTime: data.averageExecutionTime,
          taskBreakdown: data.taskBreakdown,
          errorBreakdown: data.errorBreakdown,
        });
      }
    } catch (error) {
      logger.error("[AI Insights] Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    try {
      const response = await fetch(
        `/api/ai/logs?type=export&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();

      if (data.success) {
        const blob = new Blob([JSON.stringify(data.logs, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ai-logs-${startDate}-to-${endDate}.json`;
        a.click();
      }
    } catch (error) {
      logger.error("[AI Insights] Failed to export logs:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Activity className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const topTasks = stats
    ? Object.entries(stats.taskBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
    : [];

  const topErrors = stats
    ? Object.entries(stats.errorBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900">
              <Brain className="h-8 w-8 text-blue-600" />
              AI Insights Dashboard
            </h1>
            <p className="mt-1 text-slate-600">
              Track AI usage, performance, and value across your organization
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2"
              aria-label="Select time range for AI insights"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>

            <button
              onClick={exportLogs}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Export Logs
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-600">Total Operations</h3>
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {stats?.totalOperations.toLocaleString() || 0}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Last {timeRange} day{timeRange !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-600">Success Rate</h3>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {stats ? Math.round(stats.successRate * 100) : 0}%
            </div>
            <div className="mt-2 flex items-center gap-2">
              <progress
                className="h-2 w-full flex-1 overflow-hidden rounded-full"
                max={100}
                value={Math.round((stats?.successRate || 0) * 100)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-600">Avg Response Time</h3>
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {stats ? Math.round(stats.averageExecutionTime) : 0}
              <span className="text-lg text-slate-600">ms</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">Per AI operation</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-600">Error Count</h3>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {stats
                ? Object.values(stats.errorBreakdown).reduce((sum, count) => sum + count, 0)
                : 0}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {stats && stats.totalOperations > 0
                ? `${(
                    (Object.values(stats.errorBreakdown).reduce((sum, count) => sum + count, 0) /
                      stats.totalOperations) *
                    100
                  ).toFixed(1)}% error rate`
                : "No errors"}
            </div>
          </div>
        </div>

        {/* Task Breakdown */}
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Top AI Tasks
              </h3>
              <span className="text-xs text-slate-600">
                {topTasks.length} task{topTasks.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {topTasks.map(([task, count]) => {
                const percentage = stats ? (count / stats.totalOperations) * 100 : 0;

                return (
                  <div key={task}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{task}</span>
                      <span className="text-slate-600">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <progress className="h-2 w-full" max={100} value={percentage} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Common Errors
              </h3>
              <span className="text-xs text-slate-600">
                {topErrors.length} error type{topErrors.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3">
              {topErrors.length > 0 ? (
                topErrors.map(([error, count]) => (
                  <div key={error} className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-red-900">{error}</span>
                      <span className="text-xs font-semibold text-red-700">
                        {count} occurrence{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-600">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
                  <p className="text-sm">No errors in this time period!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <Search className="h-5 w-5 text-blue-600" />
            Search Logs
          </h3>

          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by claim ID, user ID, or task name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2"
              aria-label="Filter logs by type"
            >
              <option value="all">All Logs</option>
              <option value="claim">By Claim</option>
              <option value="task">By Task</option>
            </select>

            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700">
              <Filter className="h-4 w-4" />
              Search
            </button>
          </div>

          <div className="mt-4 text-xs text-slate-600">
            <p>
              💡 <strong>Pro tip:</strong> Export logs for deep analysis, compliance audits, or
              proving ROI to clients.
            </p>
          </div>
        </div>

        {/* Value Statement */}
        <div className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="mb-2 text-xl font-bold">AI Value Summary</h3>
              <p className="text-blue-100">
                Your team used AI <strong>{stats?.totalOperations || 0} times</strong> in the last{" "}
                {timeRange} days, saving an estimated{" "}
                <strong>{stats ? Math.round((stats.totalOperations * 5) / 60) : 0} hours</strong> of
                manual work.
              </p>
            </div>
            <TrendingUp className="h-16 w-16 opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
