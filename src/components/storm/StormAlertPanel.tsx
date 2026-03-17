"use client";

/**
 * Storm Alert Panel
 *
 * Displays storm exposure alerts: critical/warning/info badges,
 * property-storm matches, and acknowledge controls.
 */

import { AlertTriangle, Cloud, CloudLightning, Info, Loader2, RefreshCw, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INTELLIGENCE_LABELS } from "@/lib/intelligence/tuning-config";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface StormAlert {
  id: string;
  orgId: string;
  propertyId: string | null;
  stormEventId: string;
  stormName: string;
  stormDate: string;
  distanceMiles: number;
  estimatedHailSize: number | null;
  estimatedWindSpeed: number | null;
  alertLevel: "info" | "warning" | "critical";
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

interface Props {
  /** Auto-refresh interval in ms (0 = no auto-refresh) */
  refreshInterval?: number;
  compact?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function StormAlertPanel({ refreshInterval = 0, compact = false, className }: Props) {
  const [alerts, setAlerts] = useState<StormAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/storm-alerts");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setError(null);
    } catch {
      setError("Failed to load storm alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/storm-alerts", { method: "POST" });
      if (!res.ok) throw new Error("Scan failed");
      const data = await res.json();
      // Merge new alerts
      setAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newAlerts = (data.alerts ?? []).filter((a: StormAlert) => !existingIds.has(a.id));
        return [...newAlerts, ...prev];
      });
    } catch {
      // Silently fail scan
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(fetchAlerts, refreshInterval);
    return () => clearInterval(timer);
  }, [fetchAlerts, refreshInterval]);

  const critical = alerts.filter((a) => a.alertLevel === "critical");
  const warning = alerts.filter((a) => a.alertLevel === "warning");
  const info = alerts.filter((a) => a.alertLevel === "info");
  const unacked = alerts.filter((a) => !a.acknowledged);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudLightning className="h-5 w-5 text-amber-500" />
            {INTELLIGENCE_LABELS.alertTitle}
          </CardTitle>
          <CardDescription>{INTELLIGENCE_LABELS.alertSubtitle}</CardDescription>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-1 rounded-md bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 dark:bg-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-900/60"
        >
          <RefreshCw className={cn("h-3 w-3", scanning && "animate-spin")} />
          {scanning ? "Scanning..." : "Scan Now"}
        </button>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          {critical.length > 0 && (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
              <Zap className="mr-1 h-3 w-3" />
              {critical.length} Critical
            </Badge>
          )}
          {warning.length > 0 && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {warning.length} Warning
            </Badge>
          )}
          {info.length > 0 && (
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
              <Info className="mr-1 h-3 w-3" />
              {info.length} Info
            </Badge>
          )}
          {alerts.length === 0 && (
            <Badge variant="outline" className="text-green-600 dark:text-green-400">
              <Cloud className="mr-1 h-3 w-3" />
              No active alerts
            </Badge>
          )}
          {unacked.length > 0 && (
            <span className="text-xs text-muted-foreground">{unacked.length} unacknowledged</span>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Alert list */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {(compact ? alerts.slice(0, 5) : alerts).map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
            {compact && alerts.length > 5 && (
              <p className="text-center text-xs text-muted-foreground">
                +{alerts.length - 5} more alerts
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function AlertRow({ alert }: { alert: StormAlert }) {
  const levelConfig = {
    critical: {
      icon: <Zap className="h-4 w-4 text-red-500" />,
      border: "border-l-red-500",
      bg: "bg-red-50/50 dark:bg-red-950/20",
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      border: "border-l-amber-500",
      bg: "bg-amber-50/50 dark:bg-amber-950/20",
    },
    info: {
      icon: <Info className="h-4 w-4 text-blue-500" />,
      border: "border-l-blue-500",
      bg: "bg-blue-50/50 dark:bg-blue-950/20",
    },
  };

  const cfg = levelConfig[alert.alertLevel];
  const date = alert.stormDate ? new Date(alert.stormDate).toLocaleDateString() : "";

  return (
    <div
      className={cn(
        "rounded-md border border-l-4 p-3",
        cfg.border,
        cfg.bg,
        alert.acknowledged && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        {cfg.icon}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{alert.stormName}</p>
            {date && <span className="text-xs text-muted-foreground">{date}</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{alert.message}</p>
          <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
            {alert.estimatedHailSize && <span>Hail: {alert.estimatedHailSize}&quot;</span>}
            {alert.estimatedWindSpeed && <span>Wind: {alert.estimatedWindSpeed} mph</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
