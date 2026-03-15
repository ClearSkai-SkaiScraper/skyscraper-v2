"use client";

/**
 * Carrier Intelligence Analytics — Phase 4.2
 *
 * Shows carrier playbooks: approval rates, denial patterns,
 * supplement win rates, and strategy recommendations.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  RefreshCw,
  Shield,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Playbook {
  carrierName: string;
  totalClaims: number;
  approvedCount: number;
  partialCount: number;
  deniedCount: number;
  approvalRate: number;
  avgDaysToResolve: number;
  avgSupplementRounds: number;
  supplementWinRate: number;
  commonDenialReasons: string[];
  keyEvidenceNeeded: string[];
  carrierBehaviorNotes: string;
  preferredStrategy: string;
  typicalResponse: string;
  computedAt: string;
}

interface Props {
  compact?: boolean;
}

export function CarrierIntelligencePanel({ compact }: Props) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [expandedCarrier, setExpandedCarrier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  async function fetchPlaybooks() {
    try {
      setLoading(true);
      const res = await fetch("/api/carrier-playbooks");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPlaybooks(data.playbooks || []);
    } catch (err) {
      setError("Failed to load carrier playbooks");
    } finally {
      setLoading(false);
    }
  }

  async function handleRebuild() {
    try {
      setRebuilding(true);
      const res = await fetch("/api/carrier-playbooks", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPlaybooks(data.playbooks || []);
    } catch {
      setError("Rebuild failed");
    } finally {
      setRebuilding(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading carrier intelligence…</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-amber-500" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const totalClaims = playbooks.reduce((s, p) => s + p.totalClaims, 0);
  const bestCarrier =
    playbooks.length > 0 ? [...playbooks].sort((a, b) => b.approvalRate - a.approvalRate)[0] : null;
  const hardestCarrier =
    playbooks.length > 0 ? [...playbooks].sort((a, b) => a.approvalRate - b.approvalRate)[0] : null;

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-indigo-500" />
            Carrier Playbooks
            <Badge variant="outline" className="ml-auto text-[10px]">
              {playbooks.length} carriers
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {playbooks.slice(0, 5).map((p) => (
              <div key={p.carrierName} className="flex items-center justify-between text-xs">
                <span className="max-w-[160px] truncate">{p.carrierName}</span>
                <div className="flex items-center gap-2">
                  <Progress value={p.approvalRate} className="h-1.5 w-16" />
                  <span
                    className={cn(
                      "w-8 text-right font-bold",
                      p.approvalRate >= 70 && "text-emerald-600",
                      p.approvalRate < 50 && "text-red-600"
                    )}
                  >
                    {p.approvalRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Building2 className="h-5 w-5 text-indigo-500" />
            Carrier Intelligence
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Data-driven playbooks from {totalClaims} claims across {playbooks.length} carriers
          </p>
        </div>
        <button
          onClick={handleRebuild}
          disabled={rebuilding}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400"
        >
          <RefreshCw className={cn("h-3 w-3", rebuilding && "animate-spin")} />
          {rebuilding ? "Rebuilding…" : "Rebuild"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          icon={<BarChart3 className="h-4 w-4 text-indigo-500" />}
          value={playbooks.length}
          label="Carriers Tracked"
        />
        <SummaryTile
          icon={<Target className="h-4 w-4 text-emerald-500" />}
          value={
            totalClaims > 0
              ? Math.round(
                  (playbooks.reduce((s, p) => s + p.approvedCount + p.partialCount, 0) /
                    playbooks.reduce(
                      (s, p) => s + p.approvedCount + p.partialCount + p.deniedCount,
                      0
                    )) *
                    100
                ) || 0
              : 0
          }
          label="Overall Approval %"
          suffix="%"
        />
        <SummaryTile
          icon={<ThumbsUp className="h-4 w-4 text-blue-500" />}
          value={bestCarrier?.carrierName ?? "—"}
          label="Best Carrier"
          small
        />
        <SummaryTile
          icon={<Shield className="h-4 w-4 text-red-500" />}
          value={hardestCarrier?.carrierName ?? "—"}
          label="Hardest Carrier"
          small
        />
      </div>

      {/* Carrier list */}
      {playbooks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No carrier data yet. Click &quot;Rebuild&quot; to compute playbooks from your claim
              history.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {playbooks.map((p) => {
            const isExpanded = expandedCarrier === p.carrierName;
            return (
              <Card key={p.carrierName} className="overflow-hidden">
                <button
                  onClick={() => setExpandedCarrier(isExpanded ? null : p.carrierName)}
                  className="w-full text-left"
                >
                  <CardHeader className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            p.approvalRate >= 70 && "bg-emerald-500",
                            p.approvalRate >= 50 && p.approvalRate < 70 && "bg-amber-500",
                            p.approvalRate < 50 && "bg-red-500"
                          )}
                        />
                        <div>
                          <CardTitle className="text-sm font-semibold">{p.carrierName}</CardTitle>
                          <CardDescription className="text-[10px]">
                            {p.totalClaims} claims · {p.avgDaysToResolve}d avg resolution
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span className="text-xs">{p.approvedCount}</span>
                          <XCircle className="ml-1 h-3 w-3 text-red-500" />
                          <span className="text-xs">{p.deniedCount}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-bold",
                            p.approvalRate >= 70 &&
                              "border-emerald-300 text-emerald-700 dark:text-emerald-400",
                            p.approvalRate < 50 && "border-red-300 text-red-700 dark:text-red-400"
                          )}
                        >
                          {p.approvalRate}%
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {isExpanded && (
                  <CardContent className="space-y-4 border-t px-4 pb-4 pt-0">
                    {/* Stats row */}
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <MiniStat
                        icon={<TrendingUp className="h-3 w-3" />}
                        label="Supplement Win Rate"
                        value={`${p.supplementWinRate}%`}
                      />
                      <MiniStat
                        icon={<RefreshCw className="h-3 w-3" />}
                        label="Avg Supp. Rounds"
                        value={`${p.avgSupplementRounds}`}
                      />
                      <MiniStat
                        icon={<Clock className="h-3 w-3" />}
                        label="Avg Days to Resolve"
                        value={`${p.avgDaysToResolve}d`}
                      />
                      <MiniStat
                        icon={<ThumbsDown className="h-3 w-3" />}
                        label="Partial Approvals"
                        value={`${p.partialCount}`}
                      />
                    </div>

                    {/* Behavior notes */}
                    <div className="rounded-lg border border-indigo-200/30 bg-indigo-50/40 p-3 dark:border-indigo-800/30 dark:bg-indigo-950/20">
                      <p className="mb-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                        Behavior Analysis
                      </p>
                      <p className="text-xs text-muted-foreground">{p.carrierBehaviorNotes}</p>
                    </div>

                    {/* Strategy */}
                    <div className="rounded-lg border border-emerald-200/30 bg-emerald-50/40 p-3 dark:border-emerald-800/30 dark:bg-emerald-950/20">
                      <p className="mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Recommended Strategy
                      </p>
                      <p className="text-xs text-muted-foreground">{p.preferredStrategy}</p>
                    </div>

                    {/* Denial reasons + Evidence */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                          Common Denial Reasons
                        </p>
                        {(p.commonDenialReasons as string[]).map((r, i) => (
                          <div
                            key={i}
                            className="mb-1 flex items-start gap-1.5 text-[10px] text-muted-foreground"
                          >
                            <XCircle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-red-400" />
                            {r}
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                          Key Evidence Needed
                        </p>
                        {(p.keyEvidenceNeeded as string[]).map((e, i) => (
                          <div
                            key={i}
                            className="mb-1 flex items-start gap-1.5 text-[10px] text-muted-foreground"
                          >
                            <CheckCircle2 className="mt-0.5 h-2.5 w-2.5 shrink-0 text-blue-400" />
                            {e}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  icon,
  value,
  label,
  suffix,
  small,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  suffix?: string;
  small?: boolean;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-3 text-center">
        <div className="mb-1 flex justify-center">{icon}</div>
        <p className={cn("font-bold", small ? "truncate text-xs" : "text-xl")}>
          {value}
          {suffix}
        </p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800/50">
      <div className="mb-0.5 flex justify-center text-muted-foreground">{icon}</div>
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
