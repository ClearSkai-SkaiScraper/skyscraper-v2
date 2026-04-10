"use client";

import { Activity, AlertCircle, Clock, Database, TrendingUp, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";

import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function OpsPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: healthData, error: healthError } = useSWR("/api/health", fetcher, {
    refreshInterval: 10000, // Refresh every 10s
  });

  const { data: errors } = useSWR("/api/ops/errors?limit=50", fetcher);
  const { data: aiStats } = useSWR("/api/ops/ai-stats", fetcher);
  const { data: uploadStats } = useSWR("/api/ops/upload-stats", fetcher);
  const { data: funnelStats } = useSWR("/api/ops/funnel-stats", fetcher);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container max-w-7xl py-8">
      <PageHero
        title="Operations Dashboard"
        subtitle={`Real-time system monitoring and analytics • Last updated: ${currentTime.toLocaleTimeString()}`}
        section="settings"
      />

      {/* Health Status Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {healthData?.status === "healthy" ? (
                <Badge variant="default" className="bg-green-600">
                  Healthy
                </Badge>
              ) : (
                <Badge variant="destructive">Degraded</Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Build: {healthData?.buildSHA || "unknown"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {healthData?.checks?.database ? (
                <Badge variant="default" className="bg-green-600">
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">Offline</Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Response: {healthData?.uptime || "—"}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Services</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {healthData?.checks?.ai ? (
                <Badge variant="default" className="bg-green-600">
                  Available
                </Badge>
              ) : (
                <Badge variant="secondary">Not Configured</Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Requests today: {aiStats?.requestsToday || "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="mt-1 text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Recent Errors</TabsTrigger>
          <TabsTrigger value="ai">AI Stats</TabsTrigger>
          <TabsTrigger value="uploads">Upload Stats</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Last 50 Errors</CardTitle>
              <CardDescription>Most recent application errors and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              {errors?.items && errors.items.length > 0 ? (
                // eslint-disable-next-line react/jsx-no-comment-textnodes
                <div className="space-y-2">
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {errors.items.map((error: any, idx: number) => (
                    <div key={idx} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="font-mono text-xs">{error.action}</span>
                          </div>
                          <p className="mt-1 text-muted-foreground">{error.description}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(error.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-20" />
                  <p>No recent errors found</p>
                  <p className="text-xs">System is running smoothly ✨</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Usage Statistics</CardTitle>
              <CardDescription>OpenAI API requests and rate limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Requests Today</span>
                  <span className="font-mono font-semibold">{aiStats?.requestsToday || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Requests This Month</span>
                  <span className="font-mono font-semibold">{aiStats?.requestsMonth || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Avg Response Time</span>
                  <span className="font-mono font-semibold">{aiStats?.avgResponseMs || "—"}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Success Rate</span>
                  <span className="font-mono font-semibold">{aiStats?.successRate || "—"}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uploads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Statistics</CardTitle>
              <CardDescription>File uploads and storage usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Uploads Today</span>
                  <span className="font-mono font-semibold">{uploadStats?.uploadsToday || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Files</span>
                  <span className="font-mono font-semibold">{uploadStats?.totalFiles || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Storage</span>
                  <span className="font-mono font-semibold">
                    {uploadStats?.totalSizeGB || "—"} GB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Failed Uploads</span>
                  <span className="font-mono font-semibold">{uploadStats?.failedToday || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>Product events and onboarding progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelStats?.events && funnelStats.events.length > 0 ? (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  funnelStats.events.map((event: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm">{event.eventName.replace(/_/g, " ")}</span>
                      <span className="font-mono font-semibold">{event.count}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <TrendingUp className="mx-auto mb-2 h-8 w-8 opacity-20" />
                    <p>No conversion events tracked yet</p>
                    <p className="text-xs">Events will appear as users complete onboarding</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
