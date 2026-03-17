"use client";

/**
 * SimulationComparison
 *
 * Side-by-side diff of two simulation runs for a single claim.
 * Shows score deltas, outcome changes, and parameter diffs.
 */

import { ArrowDown, ArrowRight, ArrowUp, GitCompare, Loader2, Minus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface SimulationOutcome {
  label: string;
  probability: number;
}

interface SimulationRun {
  id: string;
  createdAt: string;
  overallScore: number;
  confidence: number;
  predictedOutcome: string;
  outcomes: SimulationOutcome[];
  parameters: Record<string, number | string | boolean>;
  notes?: string;
}

interface Props {
  claimId: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function SimulationComparison({ claimId, className }: Props) {
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(1);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/simulation/history?limit=10`);
      if (!res.ok) {
        // Treat API failure as empty — no scary red error
        setRuns([]);
        return;
      }
      const json = await res.json();
      // API returns { history: [...] } - transform to SimulationRun shape
      const rawHistory = json.history ?? json.runs ?? [];
      const items: SimulationRun[] = rawHistory.map((h: any) => ({
        id: h.id,
        createdAt: h.createdAt,
        overallScore: h.approvalProbability ?? h.overallScore ?? 0,
        confidence: h.confidence ?? 0.8,
        predictedOutcome:
          h.predictedOutcome ?? (h.approvalProbability > 70 ? "Approved" : "Review"),
        outcomes: h.outcomes ?? [],
        parameters: h.parameters ?? {},
        notes: h.notes,
      }));
      setRuns(items);
      if (items.length >= 2) {
        setLeftIdx(0);
        setRightIdx(1);
      }
    } catch {
      // Network error — show empty, not red
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (runs.length < 2) {
    return (
      <Card className={className}>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <GitCompare className="mx-auto mb-2 h-5 w-5" />
          Simulation comparisons will appear here as AI analyses are run on this claim.
        </CardContent>
      </Card>
    );
  }

  const left = runs[leftIdx];
  const right = runs[rightIdx];
  const scoreDelta = right.overallScore - left.overallScore;
  const confDelta = right.confidence - left.confidence;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="h-5 w-5 text-violet-500" />
          Simulation Comparison
        </CardTitle>
        <CardDescription>Comparing {runs.length} runs — select two below</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Run selectors */}
        <div className="flex items-center gap-2 text-xs">
          <label className="text-muted-foreground">Left:</label>
          <select
            value={leftIdx}
            onChange={(e) => setLeftIdx(Number(e.target.value))}
            className="rounded border bg-white px-2 py-1 text-xs dark:bg-slate-900"
          >
            {runs.map((r, i) => (
              <option key={r.id} value={i}>
                #{i + 1} — {new Date(r.createdAt).toLocaleDateString()} ({r.overallScore})
              </option>
            ))}
          </select>

          <ArrowRight className="h-3 w-3 text-muted-foreground" />

          <label className="text-muted-foreground">Right:</label>
          <select
            value={rightIdx}
            onChange={(e) => setRightIdx(Number(e.target.value))}
            className="rounded border bg-white px-2 py-1 text-xs dark:bg-slate-900"
          >
            {runs.map((r, i) => (
              <option key={r.id} value={i}>
                #{i + 1} — {new Date(r.createdAt).toLocaleDateString()} ({r.overallScore})
              </option>
            ))}
          </select>
        </div>

        {/* Score delta */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <ScoreBox label="Left Score" value={left.overallScore} />
          <DeltaBox label="Delta" value={scoreDelta} />
          <ScoreBox label="Right Score" value={right.overallScore} />
        </div>

        {/* Confidence delta */}
        <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
          <span className="text-muted-foreground">Confidence</span>
          <div className="flex items-center gap-3">
            <span>{Math.round(left.confidence * 100)}%</span>
            <DeltaArrow value={confDelta} />
            <span>{Math.round(right.confidence * 100)}%</span>
          </div>
        </div>

        {/* Outcome comparison */}
        {left.outcomes.length > 0 && right.outcomes.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Outcome Probabilities</p>
            <div className="space-y-1">
              {left.outcomes.map((lo) => {
                const ro = right.outcomes.find((o) => o.label === lo.label);
                const roPct = ro ? ro.probability : 0;
                const delta = roPct - lo.probability;
                return (
                  <div key={lo.label} className="flex items-center gap-2 text-xs">
                    <span className="w-24 truncate text-slate-600 dark:text-slate-400">
                      {lo.label}
                    </span>
                    <span className="w-12 text-right font-mono">
                      {Math.round(lo.probability * 100)}%
                    </span>
                    <DeltaArrow value={delta} />
                    <span className="w-12 text-right font-mono">{Math.round(roPct * 100)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Parameter diff */}
        <ParameterDiff left={left.parameters} right={right.parameters} />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
      <p className="text-lg font-bold">{Math.round(value)}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function DeltaBox({ label, value }: { label: string; value: number }) {
  const abs = Math.abs(Math.round(value));
  const color =
    value > 0
      ? "text-green-600 dark:text-green-400"
      : value < 0
        ? "text-red-600 dark:text-red-400"
        : "text-slate-500";
  const sign = value > 0 ? "+" : value < 0 ? "" : "±";

  return (
    <div className="flex flex-col items-center justify-center">
      <span className={cn("text-lg font-bold", color)}>
        {sign}
        {Math.round(value)}
      </span>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function DeltaArrow({ value }: { value: number }) {
  if (Math.abs(value) < 0.001) {
    return <Minus className="h-3 w-3 text-slate-400" />;
  }
  if (value > 0) {
    return <ArrowUp className="h-3 w-3 text-green-500" />;
  }
  return <ArrowDown className="h-3 w-3 text-red-500" />;
}

function ParameterDiff({
  left,
  right,
}: {
  left: Record<string, number | string | boolean>;
  right: Record<string, number | string | boolean>;
}) {
  const allKeys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)]));
  const changed = allKeys.filter((k) => JSON.stringify(left[k]) !== JSON.stringify(right[k]));

  if (changed.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Changed Parameters ({changed.length})
      </p>
      <div className="space-y-1 rounded-md border p-2 text-xs">
        {changed.slice(0, 10).map((key) => (
          <div key={key} className="flex items-center justify-between">
            <span className="truncate text-slate-600 dark:text-slate-400">{key}</span>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[9px]">
                {String(left[key] ?? "—")}
              </Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge variant="outline" className="text-[9px]">
                {String(right[key] ?? "—")}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
