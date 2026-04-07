"use client";

import { useUser } from "@clerk/nextjs";
import {
  Activity,
  Clock,
  Cpu,
  Database,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricsSummary {
  totalCalls: number;
  totalCost: string;
  avgDuration: number;
  cacheHitRate: string;
  cacheHits: number;
  cacheMisses: number;
}

interface RouteStats {
  route: string;
  calls: number;
  cost: number;
  avgDuration: number;
  cacheHitRate: number;
}

interface ModelStats {
  model: string;
  calls: number;
  cost: number;
  tokensIn: number;
  tokensOut: number;
}

interface TimeSeriesPoint {
  date: string;
  calls: number;
  cost: number;
  cacheHits: number;
}

interface MetricsResponse {
  success: boolean;
  summary: MetricsSummary;
  byRoute: RouteStats[];
  byModel: ModelStats[];
  timeSeries: TimeSeriesPoint[];
  topExpensive: any[];
  topSlowest: any[];
}

export default function AIMetricsDashboard() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/metrics/ai-performance");
      if (!res.ok) throw new Error("Failed to fetch metrics");
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void fetchMetrics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 10000); // Every 10s
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">Error: {error}</p>
            <Button onClick={fetchMetrics} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) return null;

  const { summary, byRoute, byModel, timeSeries, topExpensive, topSlowest } = metrics;

  return (
    <div className="min-h-screen space-y-6 bg-gray-50 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Performance Metrics</h1>
          <p className="mt-1 text-gray-600">
            Real-time cost analytics and cache efficiency tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
            Auto Refresh {autoRefresh ? "ON" : "OFF"}
          </Button>
          <Button onClick={fetchMetrics} variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {summary.cacheHits.toLocaleString()} cached, {summary.cacheMisses.toLocaleString()}{" "}
              fresh
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalCost}</div>
            <p className="text-xs text-muted-foreground">
              {timeSeries.length > 1 &&
                `$${(Number(summary.totalCost) / timeSeries.length).toFixed(4)}/day avg`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.cacheHitRate}%</div>
            <p className="text-xs text-muted-foreground">
              {Number(summary.cacheHitRate) > 40 ? (
                <span className="text-green-600">✓ Excellent caching</span>
              ) : Number(summary.cacheHitRate) > 20 ? (
                <span className="text-yellow-600">⚠ Moderate caching</span>
              ) : (
                <span className="text-red-600">⚠ Low cache usage</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgDuration}ms</div>
            <p className="text-xs text-muted-foreground">
              {summary.avgDuration < 100 ? (
                <span className="text-green-600">✓ Lightning fast</span>
              ) : summary.avgDuration < 1000 ? (
                <span className="text-yellow-600">⚠ Fast</span>
              ) : (
                <span className="text-orange-600">⚠ Slow</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By Route */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance by Route
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {byRoute.slice(0, 10).map((route) => (
              <div
                key={route.route}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm">{route.route}</code>
                    <Badge variant="secondary">{route.calls} calls</Badge>
                    <Badge
                      variant={route.cacheHitRate > 40 ? "default" : "outline"}
                      className="text-xs"
                    >
                      {route.cacheHitRate.toFixed(1)}% cached
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    Avg: {Math.round(route.avgDuration)}ms | Cost: ${route.cost.toFixed(4)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Model */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Model Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {byModel.map((model) => (
                <div key={model.model} className="border-b pb-3 last:border-0">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold">{model.model}</span>
                    <span className="text-sm text-gray-600">{model.calls} calls</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="text-muted-foreground">Cost:</span> ${model.cost.toFixed(4)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">In:</span>{" "}
                      {model.tokensIn.toLocaleString()}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Out:</span>{" "}
                      {model.tokensOut.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Top Expensive Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topExpensive.map((call, idx) => (
                <div key={call.id} className="flex items-center justify-between text-sm">
                  <div className="flex flex-1 items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">#{idx + 1}</span>
                    <code className="text-xs">{call.route}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={call.cacheHit ? "default" : "secondary"} className="text-xs">
                      {call.cacheHit ? "cached" : "fresh"}
                    </Badge>
                    <span className="font-semibold">${call.cost.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Series */}
      {timeSeries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeSeries.slice(-14).map((point) => (
                <div key={point.date} className="flex items-center gap-4">
                  <span className="w-24 text-sm text-gray-600">{point.date}</span>
                  <div className="flex flex-1 items-center gap-2">
                    {/* eslint-disable-next-line react/forbid-dom-props */}
                    <div
                      className="h-6 rounded bg-purple-100"
                      style={{
                        width: `${(point.calls / Math.max(...timeSeries.map((p) => p.calls))) * 100}%`,
                      }}
                    ></div>
                    <span className="text-sm">{point.calls} calls</span>
                  </div>
                  <span className="text-sm font-medium">${point.cost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
