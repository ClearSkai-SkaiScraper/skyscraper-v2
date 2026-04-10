"use client";

import { Clock, Navigation, TrendingDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

import type { RouteStop } from "./actions";
import { optimizeRoute } from "./actions";

export default function RouteOptimizationClient({ stops }: { stops: RouteStop[] }) {
  const [selectedStops, setSelectedStops] = useState<string[]>(stops.map((s) => s.id));
  const [optimizedRoute, setOptimizedRoute] = useState<{
    order: string[];
    totalDistance: number;
    estimatedTime: number;
  } | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  async function handleOptimize() {
    setOptimizing(true);
    try {
      const result = await optimizeRoute(selectedStops);
      setOptimizedRoute(result);
    } catch (error) {
      logger.error("Optimization failed:", error);
    } finally {
      setOptimizing(false);
    }
  }

  function toggleStop(id: string) {
    setSelectedStops((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  }

  const orderedStops = optimizedRoute
    ? optimizedRoute.order.map((id) => stops.find((s) => s.id === id)!).filter(Boolean)
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Stops Selection */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Available Stops</h2>
            <div className="text-sm text-slate-700 dark:text-slate-300">
              {selectedStops.length} selected
            </div>
          </div>

          <div className="max-h-[500px] space-y-2 overflow-y-auto">
            {stops.map((stop) => (
              <label
                key={stop.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-[color:var(--border)] p-3 hover:bg-[var(--surface-2)]"
              >
                <input
                  type="checkbox"
                  checked={selectedStops.includes(stop.id)}
                  onChange={() => toggleStop(stop.id)}
                  className="mt-1 h-4 w-4 rounded border-[color:var(--border)] text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[color:var(--text)]">{stop.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        stop.type === "inspection"
                          ? "bg-blue-100 text-blue-700"
                          : stop.type === "job"
                            ? "bg-green-100 text-green-700"
                            : "bg-[var(--surface-1)] text-[color:var(--text)]"
                      }`}
                    >
                      {stop.type}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                    {stop.address}
                  </div>
                  {stop.scheduledAt && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
                      <Clock className="h-3 w-3" />
                      {new Date(stop.scheduledAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </label>
            ))}

            {stops.length === 0 && (
              <div className="rounded-lg bg-[var(--surface-2)] p-8 text-center text-sm text-slate-700 dark:text-slate-300">
                No scheduled inspections or jobs found. Add inspections or jobs with addresses to
                optimize routes.
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              onClick={handleOptimize}
              disabled={selectedStops.length === 0 || optimizing}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700"
            >
              <Navigation className="h-4 w-4" />
              {optimizing ? "Optimizing..." : "Optimize Route"}
            </Button>
            <button
              onClick={() => setOptimizedRoute(null)}
              disabled={!optimizedRoute}
              className="rounded-md border border-[color:var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--text)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="lg:col-span-1">
        <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[color:var(--text)]">Optimized Route</h3>

          {!optimizedRoute ? (
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              Select stops and click &quot;Optimize Route&quot; to calculate the best path.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-blue-50 p-3">
                  <div className="text-xs text-blue-600">Total Distance</div>
                  <div className="text-xl font-bold text-blue-900">
                    {optimizedRoute.totalDistance} mi
                  </div>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <div className="text-xs text-green-600">Est. Time</div>
                  <div className="text-xl font-bold text-green-900">
                    {optimizedRoute.estimatedTime} min
                  </div>
                </div>
              </div>

              {/* Route Order */}
              <div>
                <h4 className="mb-2 text-sm font-medium text-[color:var(--text)]">Route Order</h4>
                <ol className="space-y-2">
                  {orderedStops.map((stop, idx) => (
                    <li key={stop.id} className="flex items-start gap-2 text-sm">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-[color:var(--text)]">{stop.name}</div>
                        <div className="text-xs text-slate-700 dark:text-slate-300">
                          {stop.address}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Export */}
              <button className="w-full rounded-md border border-[color:var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--text)] hover:bg-[var(--surface-2)]">
                Export Route
              </button>
            </div>
          )}
        </div>

        {/* Savings */}
        {optimizedRoute && optimizedRoute.totalDistance > 0 && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 text-green-900">
              <TrendingDown className="h-5 w-5" />
              <span className="font-medium">Route Optimized</span>
            </div>
            <p className="mt-2 text-xs text-green-700">
              Using optimized route instead of random order can save approximately 20-30% travel
              time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
