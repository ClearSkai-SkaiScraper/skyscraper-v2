"use client";

/**
 * StormTimelineNarrative — Phase 3.5
 *
 * A visual timeline of storm events, damage reports, and claim filings
 * in the area surrounding a claim. Tells the "story" of the storm
 * to build a compelling case narrative.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Cloud, Loader2, MapPin, Users, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface TimelineEntry {
  timestamp: string;
  type: "storm_detected" | "first_impact" | "claim_filed" | "claim_verified" | "cluster_formed";
  description: string;
  claimId?: string;
  stormEventId?: string;
}

interface StormTimelineNarrativeProps {
  claimId: string;
  className?: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  storm_detected: <Cloud className="h-4 w-4 text-blue-500" />,
  first_impact: <AlertCircle className="h-4 w-4 text-red-500" />,
  claim_filed: <MapPin className="h-4 w-4 text-amber-500" />,
  claim_verified: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  cluster_formed: <Users className="h-4 w-4 text-purple-500" />,
};

const TYPE_LABELS: Record<string, string> = {
  storm_detected: "Storm Detected",
  first_impact: "First Impact",
  claim_filed: "Claim Filed",
  claim_verified: "Claim Verified",
  cluster_formed: "Cluster Formed",
};

const TYPE_COLORS: Record<string, string> = {
  storm_detected: "border-blue-500",
  first_impact: "border-red-500",
  claim_filed: "border-amber-500",
  claim_verified: "border-emerald-500",
  cluster_formed: "border-purple-500",
};

export function StormTimelineNarrative({ claimId, className }: StormTimelineNarrativeProps) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/claims/${claimId}/storm-graph`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTimeline(data.timeline || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  if (loading) {
    return (
      <Card className={cn("border-indigo-200/50 dark:border-indigo-800/50", className)}>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-red-200/50 dark:border-red-800/50", className)}>
        <CardContent className="flex items-center justify-center py-6">
          <div className="space-y-1 text-center">
            <XCircle className="mx-auto h-5 w-5 text-red-500" />
            <p className="text-xs text-red-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (timeline.length === 0) {
    return (
      <Card className={cn("border-slate-200/50 dark:border-slate-700/50", className)}>
        <CardContent className="py-8 text-center">
          <Cloud className="mx-auto mb-2 h-6 w-6 text-slate-400" />
          <p className="text-xs text-muted-foreground">No storm timeline data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-indigo-200/50 dark:border-indigo-800/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Cloud className="h-4 w-4 text-indigo-500" />
          Storm Timeline Narrative
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {timeline.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-slate-200 dark:bg-slate-700" />

          <div className="space-y-4">
            {timeline.map((entry, i) => (
              <div key={i} className="relative flex items-start gap-3">
                {/* Dot on the line */}
                <div
                  className={cn(
                    "absolute -left-6 mt-1 h-3.5 w-3.5 rounded-full border-2 bg-white dark:bg-slate-900",
                    TYPE_COLORS[entry.type] || "border-slate-400"
                  )}
                />

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    {ICON_MAP[entry.type]}
                    <span className="text-xs font-semibold">
                      {TYPE_LABELS[entry.type] || entry.type}
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {entry.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
