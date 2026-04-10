"use client";

import { Calendar,Eye, MousePointerClick, QrCode, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface QrStats {
  totalScans: number;
  uniqueScans: number;
  recentScans: number; // Last 7 days
  topAddresses: { addressId: string; address: string; scans: number }[];
  scansByDay: { date: string; scans: number }[];
}

interface QrStatsCardProps {
  stats: QrStats;
  batchJobId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function QrStatsCard({ stats, batchJobId }: QrStatsCardProps) {
  const scanRate = stats.totalScans > 0 ? ((stats.uniqueScans / stats.totalScans) * 100).toFixed(1) : "0";
  const trend = stats.recentScans > 0 ? "up" : "neutral";

  // Simple 7-day sparkline
  const maxScans = Math.max(...stats.scansByDay.map((d) => d.scans), 1);
  const sparklinePoints = stats.scansByDay.map((day, idx) => {
    const x = (idx / (stats.scansByDay.length - 1)) * 100;
    const y = 100 - (day.scans / maxScans) * 100;
    return `${x},${y}`;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center">
              <QrCode className="mr-2 h-5 w-5" />
              QR Code Analytics
            </CardTitle>
            <CardDescription>Scan activity and engagement metrics</CardDescription>
          </div>
          <Badge variant={trend === "up" ? "default" : "secondary"}>
            {trend === "up" && <TrendingUp className="mr-1 h-3 w-3" />}
            {stats.recentScans} scans (7d)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/20">
            <QrCode className="mb-2 h-5 w-5 text-blue-600" />
            <span className="text-3xl font-bold">{stats.totalScans}</span>
            <span className="text-xs text-muted-foreground">Total Scans</span>
          </div>

          <div className="flex flex-col items-center rounded-lg border bg-green-50 p-4 dark:bg-green-950/20">
            <Eye className="mb-2 h-5 w-5 text-green-600" />
            <span className="text-3xl font-bold">{stats.uniqueScans}</span>
            <span className="text-xs text-muted-foreground">Unique Scans</span>
          </div>

          <div className="flex flex-col items-center rounded-lg border bg-purple-50 p-4 dark:bg-purple-950/20">
            <MousePointerClick className="mb-2 h-5 w-5 text-purple-600" />
            <span className="text-3xl font-bold">{scanRate}%</span>
            <span className="text-xs text-muted-foreground">Unique Rate</span>
          </div>
        </div>

        {/* 7-Day Sparkline */}
        {stats.scansByDay.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center text-muted-foreground">
                <Calendar className="mr-1 h-4 w-4" />
                Last 7 Days
              </span>
              <span className="font-semibold">{stats.recentScans} scans</span>
            </div>
            <div className="relative h-16 w-full rounded-lg border bg-muted/30 p-2">
              <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline
                  points={sparklinePoints.join(" ")}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Top Performing Addresses */}
        {stats.topAddresses.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Top Performing Addresses</h4>
            <div className="space-y-2">
              {stats.topAddresses.slice(0, 5).map((addr, idx) => (
                <div
                  key={addr.addressId}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="flex h-6 w-6 items-center justify-center p-0">
                      {idx + 1}
                    </Badge>
                    <span className="truncate text-sm font-medium">{addr.address}</span>
                  </div>
                  <Badge>{addr.scans} scans</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats.totalScans === 0 && (
          <div className="py-8 text-center">
            <QrCode className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <h4 className="mb-1 font-semibold">No Scans Yet</h4>
            <p className="text-sm text-muted-foreground">
              QR codes haven&apos;t been scanned yet. Check back after mailers are delivered.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
