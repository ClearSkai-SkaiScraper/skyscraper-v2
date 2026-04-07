"use client";

/**
 * UnifiedClaimIntelligencePanel — Phase 4.1
 *
 * The single "intelligence hub" that brings together:
 * - ClaimIQ Readiness score
 * - Claim Simulation / Outcome Prediction
 * - Storm Graph corroboration
 * - Evidence gap analysis
 *
 * This is the top-level component a pro sees on the claim detail page.
 * It orchestrates the three engines and shows a unified view.
 */

import {
  BarChart3,
  Brain,
  ChevronDown,
  ChevronUp,
  Cloud,
  Globe,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntelligenceData {
  claimIQ: {
    overallScore: number;
    readinessLevel: string;
    sectionsComplete: number;
    totalSections: number;
  } | null;
  simulation: {
    approvalProbability: number;
    predictedOutcome: string;
    confidence: string;
    topRecommendation: string | null;
    positiveCount: number;
    negativeCount: number;
  } | null;
  stormGraph: {
    corroborationScore: number;
    nearbyVerifiedDamage: number;
    clusterCount: number;
    preQualScore: number;
  } | null;
  packetScore: number | null; // R4
}

interface UnifiedClaimIntelligencePanelProps {
  claimId: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnifiedClaimIntelligencePanel({
  claimId,
  className,
}: UnifiedClaimIntelligencePanelProps) {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all three engines in parallel
      const [claimIQRes, simRes, graphRes] = await Promise.allSettled([
        fetch(`/api/claims/${claimId}/claimiq/readiness`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/claims/${claimId}/simulation`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/claims/${claimId}/storm-graph`).then((r) => (r.ok ? r.json() : null)),
      ]);

      const claimIQ =
        claimIQRes.status === "fulfilled" && claimIQRes.value
          ? {
              overallScore: claimIQRes.value.overallScore || claimIQRes.value.score || 0,
              readinessLevel: claimIQRes.value.readinessLevel || "unknown",
              sectionsComplete: claimIQRes.value.sectionsComplete || 0,
              totalSections: claimIQRes.value.totalSections || 17,
            }
          : null;

      const simRaw = simRes.status === "fulfilled" ? simRes.value : null;
      const simulation = simRaw?.simulation
        ? {
            approvalProbability: simRaw.simulation.approvalProbability,
            predictedOutcome: simRaw.simulation.predictedOutcome,
            confidence: simRaw.simulation.confidenceLevel || simRaw.simulation.confidence,
            topRecommendation: simRaw.simulation.recommendations?.[0]?.action || null,
            positiveCount: simRaw.simulation.positiveFactors?.length || 0,
            negativeCount: simRaw.simulation.negativeFactors?.length || 0,
          }
        : null;

      const graphRaw = graphRes.status === "fulfilled" ? graphRes.value : null;
      const stormGraph = graphRaw
        ? {
            corroborationScore: graphRaw.corroborationScore || 0,
            nearbyVerifiedDamage: graphRaw.nearbyVerifiedDamage || 0,
            clusterCount: graphRaw.stormClusters?.length || 0,
            preQualScore: graphRaw.preQualScore || 0,
          }
        : null;

      // Compute packet intelligence score (R4)
      const packetScore = computePacketScore(claimIQ, simulation, stormGraph);

      setData({ claimIQ, simulation, stormGraph, packetScore });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load intelligence");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <Card className={cn("border-indigo-200/50 dark:border-indigo-800/50", className)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="space-y-2 text-center">
            <Brain className="mx-auto h-8 w-8 animate-pulse text-indigo-500" />
            <p className="text-xs text-muted-foreground">Loading claim intelligence...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={cn("border-red-200/50", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="space-y-2 text-center">
            <XCircle className="mx-auto h-6 w-6 text-red-500" />
            <p className="text-xs text-red-500">{error}</p>
            <button onClick={fetchAll} className="text-xs text-indigo-600 hover:underline">
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn("overflow-hidden border-indigo-200/50 dark:border-indigo-800/50", className)}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-transparent to-purple-50/10 dark:from-indigo-950/10 dark:to-purple-950/5" />
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Brain className="h-5 w-5 text-indigo-500" />
            Claim Strength Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAll}
              className="rounded-lg p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            </button>
            {data.packetScore !== null && (
              <Badge variant={data.packetScore >= 70 ? "default" : "secondary"} className="text-xs">
                Readiness: {data.packetScore}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* Three-engine summary row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* ClaimIQ */}
          <EngineCard
            icon={<BarChart3 className="h-4 w-4 text-emerald-500" />}
            title="ClaimIQ Readiness"
            score={data.claimIQ?.overallScore ?? null}
            maxScore={100}
            subtitle={
              data.claimIQ
                ? `${data.claimIQ.sectionsComplete}/${data.claimIQ.totalSections} sections`
                : "Unavailable"
            }
            color="emerald"
          />

          {/* Simulation */}
          <EngineCard
            icon={<Target className="h-4 w-4 text-indigo-500" />}
            title="Claim Strength"
            score={data.simulation?.approvalProbability ?? null}
            maxScore={100}
            subtitle={
              data.simulation
                ? `${formatOutcome(data.simulation.predictedOutcome)} • ${data.simulation.confidence}`
                : "Unavailable"
            }
            color="indigo"
            suffix="%"
          />

          {/* Storm Graph */}
          <EngineCard
            icon={<Globe className="h-4 w-4 text-blue-500" />}
            title="Storm Corroboration"
            score={data.stormGraph?.corroborationScore ?? null}
            maxScore={100}
            subtitle={
              data.stormGraph
                ? `${data.stormGraph.nearbyVerifiedDamage} verified • ${data.stormGraph.clusterCount} clusters`
                : "Unavailable"
            }
            color="blue"
          />
        </div>

        {/* Quick Insights */}
        {(data.simulation || data.stormGraph) && (
          <div className="space-y-1.5">
            {data.simulation?.topRecommendation && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200/30 bg-amber-50/50 p-2 dark:border-amber-800/30 dark:bg-amber-950/20">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-xs">
                  <span className="font-medium">Top action:</span>{" "}
                  {data.simulation.topRecommendation}
                </p>
              </div>
            )}

            {data.stormGraph && data.stormGraph.nearbyVerifiedDamage >= 3 && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200/30 bg-blue-50/50 p-2 dark:border-blue-800/30 dark:bg-blue-950/20">
                <Cloud className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <p className="text-xs">
                  <span className="font-medium">Strong corroboration:</span>{" "}
                  {data.stormGraph.nearbyVerifiedDamage} verified damage reports nearby support this
                  claim
                </p>
              </div>
            )}

            {data.simulation && data.simulation.negativeCount > data.simulation.positiveCount && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200/30 bg-red-50/50 p-2 dark:border-red-800/30 dark:bg-red-950/20">
                <Shield className="h-3.5 w-3.5 shrink-0 text-red-500" />
                <p className="text-xs">
                  <span className="font-medium">Attention needed:</span>{" "}
                  {data.simulation.negativeCount} risk factors outweigh{" "}
                  {data.simulation.positiveCount} strengths
                </p>
              </div>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 py-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          {expanded ? "Hide details" : "Show detailed breakdown"}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {expanded && (
          <div className="space-y-3 border-t border-slate-200/50 pt-2 dark:border-slate-700/50">
            {/* Detailed bars */}
            {data.claimIQ && (
              <ScoreBar label="ClaimIQ" score={data.claimIQ.overallScore} color="emerald" />
            )}
            {data.simulation && (
              <ScoreBar
                label="Evidence Confidence"
                score={data.simulation.approvalProbability}
                color="indigo"
              />
            )}
            {data.stormGraph && (
              <ScoreBar
                label="Corroboration"
                score={data.stormGraph.corroborationScore}
                color="blue"
              />
            )}
            {data.stormGraph && (
              <ScoreBar
                label="Pre-Qualification"
                score={data.stormGraph.preQualScore}
                color="purple"
              />
            )}
            {data.packetScore !== null && (
              <ScoreBar label="Packet Intelligence" score={data.packetScore} color="amber" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub Components ───────────────────────────────────────────────────────────

function EngineCard({
  icon,
  title,
  score,
  maxScore,
  subtitle,
  color,
  suffix = "",
}: {
  icon: React.ReactNode;
  title: string;
  score: number | null;
  maxScore: number;
  subtitle: string;
  color: string;
  suffix?: string;
}) {
  const scoreColor =
    score === null
      ? "text-slate-400"
      : score >= 70
        ? "text-emerald-600 dark:text-emerald-400"
        : score >= 40
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-xl border border-slate-200/50 bg-slate-50/80 p-3 dark:border-slate-700/40 dark:bg-slate-800/40">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-[11px] font-semibold text-muted-foreground">{title}</span>
      </div>
      <p className={cn("text-2xl font-bold", scoreColor)}>
        {score !== null ? `${score}${suffix}` : "—"}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const barColor = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{score}/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatOutcome(outcome: string): string {
  // Conservative wording — avoid predictive language
  const map: Record<string, string> = {
    approved: "Strong",
    APPROVED: "Strong",
    partial: "Moderate",
    PARTIALLY_APPROVED: "Moderate",
    denied: "Needs Work",
    DENIED: "Needs Work",
  };
  return map[outcome] || outcome;
}

/**
 * R4: Packet Intelligence Score — composite of all three engines
 * Weighted: ClaimIQ (40%) + Simulation (35%) + Storm Graph (25%)
 */
function computePacketScore(
  claimIQ: IntelligenceData["claimIQ"],
  simulation: IntelligenceData["simulation"],
  stormGraph: IntelligenceData["stormGraph"]
): number | null {
  let score = 0;
  let totalWeight = 0;

  if (claimIQ) {
    score += claimIQ.overallScore * 0.4;
    totalWeight += 0.4;
  }

  if (simulation) {
    score += simulation.approvalProbability * 0.35;
    totalWeight += 0.35;
  }

  if (stormGraph) {
    score += stormGraph.corroborationScore * 0.25;
    totalWeight += 0.25;
  }

  if (totalWeight === 0) return null;

  return Math.round(score / totalWeight);
}
