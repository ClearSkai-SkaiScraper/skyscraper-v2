"use client";

/**
 * ClaimSimulationDashboard — Phase 2.3
 *
 * The main UI for the Claim Simulation / Claim Strength Analysis engine.
 * Shows:
 * - Evidence confidence gauge
 * - Radar chart of 7 scoring categories
 * - Positive & negative factor lists
 * - Recommendations ranked by impact
 * - Evidence gap analysis
 * - Storm Graph bonus indicator
 */

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cloud,
  Eye,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SimulationFactor {
  category: string;
  description: string;
  impact: "high" | "medium" | "low";
  icon: string;
}

interface SimulationRecommendation {
  priority: number;
  action: string;
  estimatedImpact: number;
  category: string;
  effort: "quick" | "moderate" | "involved";
}

interface CategoryScore {
  name: string;
  score: number;
  weight: number;
  weighted: number;
}

interface StormGraphBonus {
  nearbyVerifiedDamage: number;
  clusterConfidence: string;
  corroborationScore: number;
}

interface SimulationResult {
  claimId: string;
  approvalProbability: number; // displayed as "Evidence Confidence"
  predictedOutcome: "APPROVED" | "PARTIALLY_APPROVED" | "DENIED" | "UNDETERMINED";
  confidence: "high" | "medium" | "low";
  overallScore: number;
  categoryScores: CategoryScore[];
  positiveFactors: SimulationFactor[];
  negativeFactors: SimulationFactor[];
  recommendations: SimulationRecommendation[];
  stormGraphBonus: StormGraphBonus;
  engineVersion: string;
  computedAt: string;
}

interface EvidenceGap {
  modelGroup: string;
  displayName: string;
  description: string;
  missingDetectionTypes: string[];
  estimatedImpact: number;
  effort: "quick" | "moderate" | "involved";
  priority: "high" | "medium" | "low";
  recommendedPhotos: string[];
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

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ClaimSimulationDashboardProps {
  claimId: string;
  compact?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ClaimSimulationDashboard({
  claimId,
  compact = false,
  className,
}: ClaimSimulationDashboardProps) {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [evidenceGaps, setEvidenceGaps] = useState<EvidenceGapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);
  const [showAllGaps, setShowAllGaps] = useState(false);

  const fetchSimulation = useCallback(
    async (force = false) => {
      try {
        if (force) setRefreshing(true);
        else setLoading(true);

        const method = force ? "POST" : "GET";
        const res = await fetch(`/api/claims/${claimId}/simulation`, { method });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        setSimulation(data.simulation);
        setEvidenceGaps(data.evidenceGaps);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load simulation");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [claimId]
  );

  useEffect(() => {
    fetchSimulation();
  }, [fetchSimulation]);

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card className={cn("border-indigo-200/50 dark:border-indigo-800/50", className)}>
        <CardContent className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-muted-foreground">Running claim simulation...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────

  if (error || !simulation) {
    return (
      <Card className={cn("border-red-200/50 dark:border-red-800/50", className)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="space-y-2 text-center">
            <XCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">
              {error || "Simulation unavailable"}
            </p>
            <button
              onClick={() => fetchSimulation()}
              className="text-xs text-indigo-600 hover:underline"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Compact Mode (for sidebars / embedding) ───────────────────────────────

  if (compact) {
    return (
      <Card className={cn("border-indigo-200/50 dark:border-indigo-800/50", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-indigo-500" />
              Claim Strength
            </CardTitle>
            <OutcomeBadge outcome={simulation.predictedOutcome} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ApprovalGaugeCompact probability={simulation.approvalProbability} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Confidence: {simulation.confidence}</span>
            <span>v{simulation.engineVersion}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Full Dashboard ─────────────────────────────────────────────────────────

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Card — Evidence Confidence */}
      <Card className="overflow-hidden border-indigo-200/50 dark:border-indigo-800/50">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-purple-50/20 dark:from-indigo-950/20 dark:to-purple-950/10" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Target className="h-5 w-5 text-indigo-500" />
                Claim Strength Analysis
              </CardTitle>
              <CardDescription>
                Evidence-based assessment across {simulation.categoryScores.length} scoring
                categories
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchSimulation(true)}
                disabled={refreshing}
                className="rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Re-run simulation"
              >
                <RefreshCw className={cn("h-4 w-4 text-slate-500", refreshing && "animate-spin")} />
              </button>
              <OutcomeBadge outcome={simulation.predictedOutcome} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6">
          {/* Big gauge */}
          <ApprovalGauge
            probability={simulation.approvalProbability}
            confidence={simulation.confidence}
          />

          {/* Storm Graph Bonus */}
          {simulation.stormGraphBonus.corroborationScore > 0 && (
            <StormGraphBonusCard bonus={simulation.stormGraphBonus} />
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="border-slate-200/60 dark:border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            Evidence Category Scores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {simulation.categoryScores.map((cat) => (
            <CategoryBar key={cat.name} category={cat} />
          ))}
        </CardContent>
      </Card>

      {/* Factors — Positive & Negative side by side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Positive Factors */}
        <Card className="border-emerald-200/50 dark:border-emerald-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Strengthening Factors ({simulation.positiveFactors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {simulation.positiveFactors.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">No strong positive factors yet</p>
            ) : (
              simulation.positiveFactors.map((f, i) => <FactorItem key={i} factor={f} positive />)
            )}
          </CardContent>
        </Card>

        {/* Negative Factors */}
        <Card className="border-red-200/50 dark:border-red-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Risk Factors ({simulation.negativeFactors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {simulation.negativeFactors.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">No significant risk factors</p>
            ) : (
              simulation.negativeFactors.map((f, i) => (
                <FactorItem key={i} factor={f} positive={false} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {simulation.recommendations.length > 0 && (
        <Card className="border-amber-200/50 dark:border-amber-800/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <Sparkles className="h-4 w-4" />
                Recommendations to Improve Score
              </CardTitle>
              {simulation.recommendations.length > 3 && (
                <button
                  onClick={() => setShowAllRecs(!showAllRecs)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                >
                  {showAllRecs ? "Show less" : `Show all ${simulation.recommendations.length}`}
                  {showAllRecs ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(showAllRecs
              ? simulation.recommendations
              : simulation.recommendations.slice(0, 3)
            ).map((rec, i) => (
              <RecommendationItem key={i} recommendation={rec} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Evidence Gap Analysis */}
      {evidenceGaps && evidenceGaps.totalGaps > 0 && (
        <Card className="border-blue-200/50 dark:border-blue-800/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
                  <Eye className="h-4 w-4" />
                  Evidence Gap Analysis
                </CardTitle>
                <CardDescription className="mt-1 text-xs">
                  {evidenceGaps.coveragePercent}% detection coverage • {evidenceGaps.totalGaps} gaps
                  found • +{evidenceGaps.totalEstimatedImpact} potential points
                </CardDescription>
              </div>
              {evidenceGaps.totalGaps > 3 && (
                <button
                  onClick={() => setShowAllGaps(!showAllGaps)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                >
                  {showAllGaps ? "Show less" : `Show all ${evidenceGaps.totalGaps}`}
                  {showAllGaps ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Coverage bar */}
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Detection Coverage</span>
                <span className="font-medium">{evidenceGaps.coveragePercent}%</span>
              </div>
              <Progress value={evidenceGaps.coveragePercent} className="h-2" />
            </div>

            {(showAllGaps ? evidenceGaps.gaps : evidenceGaps.gaps.slice(0, 3)).map((gap, i) => (
              <EvidenceGapItem key={i} gap={gap} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Footer — Meta */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>
          Engine v{simulation.engineVersion} • {new Date(simulation.computedAt).toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Confidence: {simulation.confidence}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    APPROVED: {
      label: "Strong",
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    PARTIALLY_APPROVED: {
      label: "Moderate",
      className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    },
    DENIED: {
      label: "Needs Work",
      className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    },
    UNDETERMINED: {
      label: "Undetermined",
      className: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
    },
  };

  const v = variants[outcome] || variants.UNDETERMINED;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        v.className
      )}
    >
      {v.label}
    </span>
  );
}

function ApprovalGauge({ probability, confidence }: { probability: number; confidence: string }) {
  const color =
    probability >= 70 ? "text-emerald-500" : probability >= 40 ? "text-amber-500" : "text-red-500";

  const ringColor =
    probability >= 70
      ? "stroke-emerald-500"
      : probability >= 40
        ? "stroke-amber-500"
        : "stroke-red-500";

  const circumference = 2 * Math.PI * 60;
  const dashOffset = circumference * (1 - probability / 100);

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <svg width="160" height="160" className="-rotate-90">
          {/* Background ring */}
          <circle
            cx="80"
            cy="80"
            r="60"
            fill="none"
            strokeWidth="12"
            className="stroke-slate-200 dark:stroke-slate-700"
          />
          {/* Progress ring */}
          <circle
            cx="80"
            cy="80"
            r="60"
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            className={cn(ringColor, "transition-all duration-1000")}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold", color)}>{probability}%</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Confidence
          </span>
        </div>
      </div>
    </div>
  );
}

function ApprovalGaugeCompact({ probability }: { probability: number }) {
  const color =
    probability >= 70
      ? "text-emerald-600 dark:text-emerald-400"
      : probability >= 40
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const bgColor =
    probability >= 70 ? "bg-emerald-500" : probability >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={cn("text-2xl font-bold", color)}>{probability}%</span>
        <span className="text-xs text-muted-foreground">evidence confidence</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={cn("h-full rounded-full transition-all duration-700", bgColor)}
          style={{ width: `${probability}%` }}
        />
      </div>
    </div>
  );
}

function StormGraphBonusCard({ bonus }: { bonus: StormGraphBonus }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-indigo-200/50 bg-indigo-50/50 p-3 dark:border-indigo-800/50 dark:bg-indigo-950/30">
      <Cloud className="h-5 w-5 shrink-0 text-indigo-500" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
          Storm Graph Bonus: +{bonus.corroborationScore} pts
        </p>
        <p className="text-xs text-muted-foreground">
          {bonus.nearbyVerifiedDamage} nearby verified damage claims • Cluster confidence:{" "}
          {bonus.clusterConfidence}
        </p>
      </div>
      <TrendingUp className="h-4 w-4 shrink-0 text-indigo-400" />
    </div>
  );
}

function CategoryBar({ category }: { category: CategoryScore }) {
  const displayName = CATEGORY_DISPLAY_NAMES[category.name] || category.name;
  const icon = CATEGORY_ICONS[category.name] || <Activity className="h-3.5 w-3.5" />;

  const barColor =
    category.score >= 70 ? "bg-emerald-500" : category.score >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {displayName}
          <span className="text-[10px] opacity-60">({category.weight}%)</span>
        </span>
        <span className="font-medium tabular-nums">
          {category.score}
          <span className="text-muted-foreground">/100</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${category.score}%` }}
        />
      </div>
    </div>
  );
}

function FactorItem({ factor, positive }: { factor: SimulationFactor; positive: boolean }) {
  const impactColors: Record<string, string> = {
    high: positive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
    medium: "text-amber-700 dark:text-amber-400",
    low: "text-slate-500",
  };

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={cn("mt-0.5 shrink-0", impactColors[factor.impact])}>
        {positive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-foreground">{factor.description}</span>
        <span className="ml-1 text-muted-foreground">({factor.category})</span>
      </div>
      <Badge
        variant="outline"
        className={cn("shrink-0 text-[10px]", factor.impact === "high" && "border-current")}
      >
        {factor.impact}
      </Badge>
    </div>
  );
}

function RecommendationItem({ recommendation }: { recommendation: SimulationRecommendation }) {
  const effortColors: Record<string, string> = {
    quick: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30",
    moderate: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30",
    involved: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30",
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200/30 bg-amber-50/30 p-2.5 dark:border-amber-800/30 dark:bg-amber-950/10">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
        {recommendation.priority}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{recommendation.action}</p>
        <p className="text-[10px] text-muted-foreground">
          {recommendation.category} • +{recommendation.estimatedImpact} pts potential
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
          effortColors[recommendation.effort]
        )}
      >
        {recommendation.effort}
      </span>
      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
    </div>
  );
}

function EvidenceGapItem({ gap }: { gap: EvidenceGap }) {
  const priorityColors: Record<string, string> = {
    high: "border-red-200/50 dark:border-red-800/50",
    medium: "border-amber-200/50 dark:border-amber-800/50",
    low: "border-slate-200/50 dark:border-slate-700/50",
  };

  return (
    <div className={cn("rounded-lg border p-2.5", priorityColors[gap.priority])}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold">{gap.displayName}</span>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            +{gap.estimatedImpact} pts
          </Badge>
          <Badge
            variant={gap.priority === "high" ? "destructive" : "secondary"}
            className="text-[10px]"
          >
            {gap.priority}
          </Badge>
        </div>
      </div>
      <p className="mb-1.5 text-[11px] text-muted-foreground">{gap.description}</p>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Zap className="h-3 w-3" />
        <span>Effort: {gap.effort}</span>
        <span className="mx-1">•</span>
        <span>Photos needed: {gap.recommendedPhotos.length}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  stormEvidence: "Storm Evidence",
  damageEvidence: "Damage Evidence",
  collateralEvidence: "Collateral Evidence",
  repairability: "Repairability",
  documentation: "Documentation",
  codeCompliance: "Code Compliance",
  carrierHistory: "Carrier History",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  stormEvidence: <Cloud className="h-3.5 w-3.5 text-blue-500" />,
  damageEvidence: <Target className="h-3.5 w-3.5 text-red-500" />,
  collateralEvidence: <Shield className="h-3.5 w-3.5 text-purple-500" />,
  repairability: <Activity className="h-3.5 w-3.5 text-orange-500" />,
  documentation: <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />,
  codeCompliance: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  carrierHistory: <TrendingUp className="h-3.5 w-3.5 text-amber-500" />,
};
