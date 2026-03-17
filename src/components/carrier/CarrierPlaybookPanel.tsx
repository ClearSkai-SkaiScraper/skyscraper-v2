"use client";

/**
 * Carrier Playbook Panel
 *
 * Displays carrier intelligence profiles: approval rates, denial patterns,
 * supplement stats, and winning strategies per carrier.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { INTELLIGENCE_LABELS } from "@/lib/intelligence/tuning-config";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Loader2,
  Shield,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* Types (matches engine output)                                       */
/* ------------------------------------------------------------------ */

interface CarrierPlaybook {
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
}

interface Props {
  orgId?: string;
  /** Specific carrier to show (optional — shows all if omitted) */
  carrierFilter?: string;
  compact?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function CarrierPlaybookPanel({ carrierFilter, compact, className }: Props) {
  const [playbooks, setPlaybooks] = useState<CarrierPlaybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCarrier, setExpandedCarrier] = useState<string | null>(null);

  const fetchPlaybooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/carrier-playbooks");
      if (!res.ok) {
        // Treat API failure as empty — no scary red error
        setPlaybooks([]);
        return;
      }
      const data = await res.json();
      let pbs = data.playbooks ?? [];
      if (carrierFilter) {
        pbs = pbs.filter(
          (p: CarrierPlaybook) => p.carrierName.toLowerCase() === carrierFilter.toLowerCase()
        );
      }
      setPlaybooks(pbs);
    } catch {
      // Network error — show empty, not red
      setPlaybooks([]);
    } finally {
      setLoading(false);
    }
  }, [carrierFilter]);

  useEffect(() => {
    fetchPlaybooks();
  }, [fetchPlaybooks]);

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
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5 text-indigo-500" />
          {INTELLIGENCE_LABELS.carrierTitle}
        </CardTitle>
        <CardDescription>{INTELLIGENCE_LABELS.carrierSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {playbooks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No carrier data yet. Carrier playbooks build as claims are resolved.
          </p>
        ) : (
          playbooks.map((pb) => (
            <CarrierCard
              key={pb.carrierName}
              playbook={pb}
              compact={compact}
              expanded={expandedCarrier === pb.carrierName}
              onToggle={() =>
                setExpandedCarrier(expandedCarrier === pb.carrierName ? null : pb.carrierName)
              }
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function CarrierCard({
  playbook: pb,
  compact,
  expanded,
  onToggle,
}: {
  playbook: CarrierPlaybook;
  compact?: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const difficultyBadge =
    pb.approvalRate >= 75
      ? {
          label: "Cooperative",
          variant: "default" as const,
          cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
        }
      : pb.approvalRate >= 50
        ? {
            label: "Moderate",
            variant: "secondary" as const,
            cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
          }
        : {
            label: "Difficult",
            variant: "destructive" as const,
            cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
          };

  return (
    <div
      className={cn(
        "rounded-lg border bg-white/80 p-4 transition-all dark:bg-slate-900/60",
        expanded && "ring-1 ring-indigo-300 dark:ring-indigo-700"
      )}
    >
      {/* Header */}
      <button onClick={onToggle} className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold">{pb.carrierName}</p>
            <p className="text-xs text-muted-foreground">
              {pb.totalClaims} claim{pb.totalClaims !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs", difficultyBadge.cls)}>{difficultyBadge.label}</Badge>
          <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {pb.approvalRate}%
          </span>
        </div>
      </button>

      {/* Quick stats row */}
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        <StatBox
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          value={pb.approvedCount}
          label="Approved"
        />
        <StatBox
          icon={<ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />}
          value={pb.partialCount}
          label="Partial"
        />
        <StatBox
          icon={<XCircle className="h-3.5 w-3.5 text-red-500" />}
          value={pb.deniedCount}
          label="Denied"
        />
        <StatBox
          icon={<Clock className="h-3.5 w-3.5 text-blue-500" />}
          value={`${pb.avgDaysToResolve}d`}
          label="Avg Time"
        />
      </div>

      {/* Expanded details */}
      {expanded && !compact && (
        <div className="mt-4 space-y-3 border-t pt-3">
          {/* Supplement stats */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-muted-foreground">Supplement rounds:</span>
              <span className="font-medium">{pb.avgSupplementRounds}</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-muted-foreground">Supplement win:</span>
              <span className="font-medium">{pb.supplementWinRate}%</span>
            </div>
          </div>

          {/* Behavior notes */}
          {pb.carrierBehaviorNotes && (
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Behavior Pattern
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{pb.carrierBehaviorNotes}</p>
            </div>
          )}

          {/* Strategy */}
          {pb.preferredStrategy && (
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Recommended Strategy
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{pb.preferredStrategy}</p>
            </div>
          )}

          {/* Denial reasons */}
          {pb.commonDenialReasons.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Common Denial Reasons
              </p>
              <div className="flex flex-wrap gap-1">
                {pb.commonDenialReasons.map((r, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[10px] text-red-600 dark:text-red-400"
                  >
                    <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Key evidence */}
          {pb.keyEvidenceNeeded.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                Key Evidence for This Carrier
              </p>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {pb.keyEvidenceNeeded.map((e, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-md bg-slate-50 py-1.5 dark:bg-slate-800/50">
      {icon}
      <span className="font-semibold text-slate-800 dark:text-slate-200">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
