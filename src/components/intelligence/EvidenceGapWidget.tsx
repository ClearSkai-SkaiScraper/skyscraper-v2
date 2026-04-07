"use client";

/**
 * EvidenceGapWidget
 *
 * Compact or expanded view of evidence gaps for a single claim.
 * Fetches from /api/claims/[claimId]/evidence-gaps.
 */

import {
  AlertTriangle,
  Camera,
  ChevronDown,
  ChevronUp,
  FileSearch,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types (mirrors evidence-gap-detector output)                        */
/* ------------------------------------------------------------------ */

interface EvidenceGap {
  modelGroup: string;
  missingItems: string[];
  estimatedImpact: number;
  priority: "critical" | "high" | "medium" | "low";
  recommendation: string;
  suggestedPhotos?: string[];
}

interface EvidenceGapAnalysis {
  claimId: string;
  totalGaps: number;
  totalEstimatedImpact: number;
  gaps: EvidenceGap[];
  modelGroupsRun: string[];
  modelGroupsMissing: string[];
  coveragePercent: number;
}

interface Props {
  claimId: string;
  compact?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Priority styling                                                    */
/* ------------------------------------------------------------------ */

const PRIORITY_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
  },
  high: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  medium: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  low: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    icon: <FileSearch className="h-3.5 w-3.5" />,
  },
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function EvidenceGapWidget({ claimId, compact = false, className }: Props) {
  const [data, setData] = useState<EvidenceGapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchGaps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/evidence-gaps`);
      if (!res.ok) {
        // Treat 4xx/5xx as empty — not a red error
        setData({
          claimId,
          totalGaps: 0,
          totalEstimatedImpact: 0,
          gaps: [],
          modelGroupsRun: [],
          modelGroupsMissing: [],
          coveragePercent: 0,
        });
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      // Network error — show empty state, not scary red
      setData({
        claimId,
        totalGaps: 0,
        totalEstimatedImpact: 0,
        gaps: [],
        modelGroupsRun: [],
        modelGroupsMissing: [],
        coveragePercent: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchGaps();
  }, [fetchGaps]);

  /* Loading state */
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  /* No data yet */
  if (!data) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <FileSearch className="h-4 w-4" />
          Upload and analyze photos to detect evidence gaps.
        </CardContent>
      </Card>
    );
  }

  /* All clear */
  if (data.totalGaps === 0) {
    // If coverage is 0%, no analysis has been run yet — show a prompt instead of "all clear"
    if (data.coveragePercent === 0 && data.modelGroupsRun.length === 0) {
      return (
        <Card className={className}>
          <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <FileSearch className="h-4 w-4" />
            Upload and analyze photos to detect evidence gaps.
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className={cn("border-green-200 dark:border-green-900", className)}>
        <CardContent className="flex items-center gap-2 py-4 text-sm text-green-600 dark:text-green-400">
          <FileSearch className="h-4 w-4" />
          No evidence gaps detected — {data.coveragePercent}% coverage
        </CardContent>
      </Card>
    );
  }

  /* Compact mode — just badge + count */
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", className)}>
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium">
          {data.totalGaps} evidence gap{data.totalGaps !== 1 ? "s" : ""}
        </span>
        <Badge variant="outline" className="text-[10px]">
          ~${data.totalEstimatedImpact.toLocaleString()} impact
        </Badge>
        <span className="text-xs text-muted-foreground">{data.coveragePercent}% covered</span>
      </div>
    );
  }

  /* Full mode */
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSearch className="h-5 w-5 text-amber-500" />
          Evidence Gaps
        </CardTitle>
        <CardDescription>
          {data.totalGaps} gap{data.totalGaps !== 1 ? "s" : ""} · {data.coveragePercent}% coverage ·
          ~$
          {data.totalEstimatedImpact.toLocaleString()} at risk
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Missing model groups summary */}
        {data.modelGroupsMissing.length > 0 && (
          <div className="mb-3 rounded-md bg-amber-50 p-2 dark:bg-amber-950/20">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Missing model groups: {data.modelGroupsMissing.join(", ")}
            </p>
          </div>
        )}

        {/* Gap list */}
        {data.gaps.map((gap) => {
          const style = PRIORITY_STYLES[gap.priority] ?? PRIORITY_STYLES.low;
          const isExpanded = expanded === gap.modelGroup;

          return (
            <div
              key={gap.modelGroup}
              className="rounded-lg border bg-white/80 dark:bg-slate-900/60"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : gap.modelGroup)}
                className="flex w-full items-center gap-2 p-3 text-left text-sm"
              >
                <span className={style.text}>{style.icon}</span>
                <span className="flex-1 font-medium">{gap.modelGroup}</span>
                <Badge className={cn("text-[10px]", style.bg, style.text)}>{gap.priority}</Badge>
                <span className="text-xs text-muted-foreground">
                  ~${gap.estimatedImpact.toLocaleString()}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="space-y-2 border-t px-3 pb-3 pt-2 text-xs">
                  {/* Missing items */}
                  <div>
                    <p className="font-medium text-slate-500">Missing:</p>
                    <ul className="ml-3 list-disc text-slate-600 dark:text-slate-400">
                      {gap.missingItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendation */}
                  <p className="text-slate-600 dark:text-slate-400">💡 {gap.recommendation}</p>

                  {/* Suggested photos */}
                  {gap.suggestedPhotos && gap.suggestedPhotos.length > 0 && (
                    <div className="flex items-start gap-1">
                      <Camera className="mt-0.5 h-3 w-3 text-blue-500" />
                      <p className="text-blue-600 dark:text-blue-400">
                        Suggested photos: {gap.suggestedPhotos.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
