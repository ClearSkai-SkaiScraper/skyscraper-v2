"use client";

/**
 * Simulation History Tracker — Phase 4.3
 *
 * Shows how a claim's simulation score has changed over time
 * as evidence is added, photos uploaded, etc.
 * Line chart + history table.
 */

import {
  Activity,
  ArrowDown,
  ArrowUp,
  Calendar,
  History,
  Loader2,
  Minus,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HistoryEntry {
  id: string;
  approvalProbability: number;
  predictedOutcome: string;
  triggerEvent: string | null;
  scores: Record<string, number>;
  createdAt: string;
}

interface Props {
  claimId: string;
  compact?: boolean;
}

export function SimulationHistoryTracker({ claimId, compact }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [claimId]);

  async function fetchHistory() {
    try {
      setLoading(true);
      const res = await fetch(`/api/claims/${claimId}/simulation/history`);
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <History className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            No simulation history yet. Run a simulation to start tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  const latest = history[0];
  const oldest = history[history.length - 1];
  const scoreDelta = latest.approvalProbability - oldest.approvalProbability;
  const maxScore = Math.max(...history.map((h) => h.approvalProbability));
  const minScore = Math.min(...history.map((h) => h.approvalProbability));

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-blue-500" />
            Score History
            <Badge variant="outline" className="ml-auto text-[10px]">
              {history.length} runs
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mini sparkline */}
          <MiniSparkline entries={history} />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{latest.approvalProbability}% current</span>
            <span
              className={cn(
                "flex items-center gap-0.5 font-medium",
                scoreDelta > 0 && "text-emerald-600",
                scoreDelta < 0 && "text-red-600",
                scoreDelta === 0 && "text-slate-500"
              )}
            >
              {scoreDelta > 0 ? (
                <ArrowUp className="h-3 w-3" />
              ) : scoreDelta < 0 ? (
                <ArrowDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {Math.abs(scoreDelta)}pts
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Simulation History
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              {history.length} simulations tracked
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold">{latest.approvalProbability}%</span>
            <div
              className={cn(
                "flex items-center justify-end gap-0.5 text-xs font-medium",
                scoreDelta > 0 && "text-emerald-600",
                scoreDelta < 0 && "text-red-600"
              )}
            >
              {scoreDelta > 0 ? (
                <ArrowUp className="h-3 w-3" />
              ) : scoreDelta < 0 ? (
                <ArrowDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {Math.abs(scoreDelta)}pts since first run
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SVG sparkline chart */}
        <SparklineChart entries={history} />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800/50">
            <p className="text-lg font-bold text-emerald-600">{maxScore}%</p>
            <p className="text-[10px] text-muted-foreground">Peak Score</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800/50">
            <p className="text-lg font-bold text-red-600">{minScore}%</p>
            <p className="text-[10px] text-muted-foreground">Lowest Score</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800/50">
            <p className="text-lg font-bold">{history.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Runs</p>
          </div>
        </div>

        {/* History table */}
        <div className="space-y-1.5">
          {history.map((entry, i) => {
            const prev = history[i + 1];
            const delta = prev ? entry.approvalProbability - prev.approvalProbability : 0;
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="w-28 shrink-0 text-[10px] text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[10px]",
                      entry.predictedOutcome === "approved" &&
                        "border-emerald-300 text-emerald-700",
                      entry.predictedOutcome === "denied" && "border-red-300 text-red-700",
                      entry.predictedOutcome === "partial" && "border-amber-300 text-amber-700"
                    )}
                  >
                    {entry.predictedOutcome}
                  </Badge>
                  {entry.triggerEvent && (
                    <span className="truncate text-[10px] text-muted-foreground">
                      {entry.triggerEvent}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="w-10 text-right text-sm font-bold">
                    {entry.approvalProbability}%
                  </span>
                  {delta !== 0 && (
                    <span
                      className={cn(
                        "flex items-center gap-0.5 text-[10px] font-medium",
                        delta > 0 && "text-emerald-600",
                        delta < 0 && "text-red-600"
                      )}
                    >
                      {delta > 0 ? (
                        <ArrowUp className="h-2.5 w-2.5" />
                      ) : (
                        <ArrowDown className="h-2.5 w-2.5" />
                      )}
                      {Math.abs(delta)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* SVG Sparkline Components                                            */
/* ------------------------------------------------------------------ */

function MiniSparkline({ entries }: { entries: HistoryEntry[] }) {
  const reversed = [...entries].reverse();
  const w = 200;
  const h = 32;
  const max = Math.max(...reversed.map((e) => e.approvalProbability), 100);
  const min = Math.min(...reversed.map((e) => e.approvalProbability), 0);
  const range = max - min || 1;

  const points = reversed.map((e, i) => {
    const x = (i / Math.max(reversed.length - 1, 1)) * w;
    const y = h - ((e.approvalProbability - min) / range) * h;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-blue-500"
      />
    </svg>
  );
}

function SparklineChart({ entries }: { entries: HistoryEntry[] }) {
  const reversed = [...entries].reverse();
  const w = 400;
  const h = 100;
  const padY = 10;
  const max = Math.max(...reversed.map((e) => e.approvalProbability), 100);
  const min = Math.min(...reversed.map((e) => e.approvalProbability), 0);
  const range = max - min || 1;

  const getX = (i: number) => (i / Math.max(reversed.length - 1, 1)) * w;
  const getY = (val: number) => padY + (h - 2 * padY) - ((val - min) / range) * (h - 2 * padY);

  const linePoints = reversed.map((e, i) => `${getX(i)},${getY(e.approvalProbability)}`).join(" ");

  const areaPoints = `0,${h} ${linePoints} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" preserveAspectRatio="none">
      {/* Area fill */}
      <polygon points={areaPoints} className="fill-blue-100/60 dark:fill-blue-900/20" />
      {/* Line */}
      <polyline
        points={linePoints}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="text-blue-500"
      />
      {/* Dots */}
      {reversed.map((e, i) => (
        <circle
          key={i}
          cx={getX(i)}
          cy={getY(e.approvalProbability)}
          r={3}
          className="fill-blue-500"
        />
      ))}
      {/* Threshold line at 50% */}
      <line
        x1={0}
        y1={getY(50)}
        x2={w}
        y2={getY(50)}
        stroke="currentColor"
        strokeWidth={0.5}
        strokeDasharray="4 4"
        className="text-slate-300 dark:text-slate-600"
      />
    </svg>
  );
}
