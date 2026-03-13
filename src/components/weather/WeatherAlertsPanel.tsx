"use client";

import { AlertTriangle, CloudLightning, RefreshCw, Shield } from "lucide-react";
import { useEffect, useState } from "react";

interface WeatherAlert {
  id: string;
  event: string;
  headline: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  urgency: string;
  certainty: string;
  effective: string;
  expires: string;
  areas: string;
  instruction: string | null;
  senderName: string;
  response: string;
}

interface WeatherData {
  alerts: WeatherAlert[];
  state: string;
  source: string;
  fetchedAt: string;
  total: number;
  filtered: number;
  error?: string;
}

const severityConfig: Record<
  string,
  { bg: string; border: string; text: string; icon: string; badge: string }
> = {
  Extreme: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-300 dark:border-red-800",
    text: "text-red-800 dark:text-red-300",
    icon: "text-red-600 dark:text-red-400",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  },
  Severe: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-300 dark:border-orange-800",
    text: "text-orange-800 dark:text-orange-300",
    icon: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
  },
  Moderate: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-300 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-300",
    icon: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  },
  Minor: {
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-300 dark:border-yellow-800",
    text: "text-yellow-800 dark:text-yellow-300",
    icon: "text-yellow-600 dark:text-yellow-400",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  },
  Unknown: {
    bg: "bg-slate-50 dark:bg-slate-800/30",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    icon: "text-slate-500 dark:text-slate-400",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

function formatAlertTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export function WeatherAlertsPanel() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weather-alerts");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: WeatherData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Refresh every 10 minutes
    const interval = setInterval(fetchAlerts, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">⛈️ Weather Alerts</h2>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading NWS alerts…
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">⛈️ Weather Alerts</h2>
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Unable to load weather data</p>
          <button
            onClick={fetchAlerts}
            className="mt-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const alerts = data?.alerts ?? [];
  const hasAlerts = alerts.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">⛈️ Weather Alerts</h2>
        <div className="flex items-center gap-2">
          {data?.state && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {data.state}
            </span>
          )}
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            title="Refresh alerts"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {!hasAlerts ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Shield className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All clear</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No active weather alerts in {data?.state ?? "your area"}
          </p>
          {data?.fetchedAt && (
            <p className="mt-1 text-[10px] text-slate-300 dark:text-slate-600">
              Last checked: {formatAlertTime(data.fetchedAt)}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert) => {
            const config = severityConfig[alert.severity] ?? severityConfig.Unknown;
            const isExpanded = expanded === alert.id;

            return (
              <button
                key={alert.id}
                onClick={() => setExpanded(isExpanded ? null : alert.id)}
                className={`w-full rounded-lg border p-3 text-left transition-all ${config.bg} ${config.border} hover:shadow-md`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${config.icon}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${config.text}`}>{alert.event}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${config.badge}`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                      {alert.headline}
                    </p>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 border-t border-slate-200/50 pt-2 dark:border-slate-700/50">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold">Areas:</span> {alert.areas}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold">Effective:</span>{" "}
                          {formatAlertTime(alert.effective)} → {formatAlertTime(alert.expires)}
                        </p>
                        {alert.instruction && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">Action:</span>{" "}
                            {alert.instruction.slice(0, 200)}
                            {alert.instruction.length > 200 ? "…" : ""}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400">Source: {alert.senderName}</p>
                      </div>
                    )}
                  </div>
                  <CloudLightning
                    className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""} text-slate-400`}
                  />
                </div>
              </button>
            );
          })}

          {alerts.length > 5 && (
            <p className="text-center text-[11px] text-slate-400">
              + {alerts.length - 5} more alerts
            </p>
          )}

          {data?.fetchedAt && (
            <p className="mt-2 text-center text-[10px] text-slate-300 dark:text-slate-600">
              NWS data • Updated {formatAlertTime(data.fetchedAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
