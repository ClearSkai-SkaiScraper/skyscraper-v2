/**
 * AI Insights Widget — Combined Stalled Claims + AI Recommendations
 *
 * A unified dashboard widget with tabs for:
 * - Stalled Claims: Claims at risk of falling through
 * - AI Recommendations: Smart action suggestions
 */
"use client";

import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Types
interface StalledClaim {
  id: string;
  claimNumber: string | null;
  status: string | null;
  propertyAddress: string | null;
  homeownerName: string | null;
  claimAmount: number | null;
  daysSinceUpdate: number;
  tier: "critical" | "warning" | "watch";
}

interface StalledSummary {
  total: number;
  critical: number;
  warning: number;
  watch: number;
  totalAtRiskValue: number;
}

interface Recommendation {
  id: string;
  type: "lead" | "claim" | "retail";
  entityId: string;
  entityTitle: string;
  recommendation: string;
  action: string;
  actionUrl: string;
  priority: "high" | "medium" | "low";
  category: "follow_up" | "document" | "schedule" | "scope" | "billing" | "quality";
  createdAt: string;
}

interface RecommendationSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

type TabKey = "stalled" | "recommendations";

const categoryIcons: Record<string, React.ReactNode> = {
  follow_up: <Bell className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  schedule: <Calendar className="h-4 w-4" />,
  scope: <Target className="h-4 w-4" />,
  billing: <DollarSign className="h-4 w-4" />,
  quality: <Sparkles className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  lead: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  claim: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  retail: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const priorityColors: Record<string, string> = {
  high: "border-red-200 bg-red-50/80 dark:border-red-800/50 dark:bg-red-900/20",
  medium: "border-amber-200 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-900/20",
  low: "border-slate-200 bg-slate-50/80 dark:border-slate-700/50 dark:bg-slate-800/40",
};

const tierConfig = {
  critical: {
    bg: "bg-red-50/80 dark:bg-red-950/30",
    border: "border-red-200/70 dark:border-red-800/50",
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
    label: "Critical",
  },
  warning: {
    bg: "bg-amber-50/80 dark:bg-amber-950/30",
    border: "border-amber-200/70 dark:border-amber-800/50",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    label: "Warning",
  },
  watch: {
    bg: "bg-yellow-50/80 dark:bg-yellow-950/30",
    border: "border-yellow-200/70 dark:border-yellow-800/50",
    dot: "bg-yellow-500",
    text: "text-yellow-700 dark:text-yellow-300",
    label: "Watch",
  },
};

export default function AIInsightsWidget() {
  const [activeTab, setActiveTab] = useState<TabKey>("stalled");

  // Stalled Claims State
  const [stalledClaims, setStalledClaims] = useState<StalledClaim[]>([]);
  const [stalledSummary, setStalledSummary] = useState<StalledSummary | null>(null);
  const [stalledLoading, setStalledLoading] = useState(true);

  // AI Recommendations State
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recSummary, setRecSummary] = useState<RecommendationSummary | null>(null);
  const [recLoading, setRecLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Fetch Stalled Claims
  const fetchStalled = useCallback(async () => {
    setStalledLoading(true);
    try {
      const res = await fetch("/api/claims/stalled?limit=10");
      if (!res.ok) return;
      const data = await res.json();
      setStalledClaims(data.claims || []);
      setStalledSummary(data.summary || null);
    } catch {
      // fail silently
    } finally {
      setStalledLoading(false);
    }
  }, []);

  // Fetch AI Recommendations
  const fetchRecommendations = useCallback(async () => {
    setRecLoading(true);
    try {
      const res = await fetch("/api/ai/job-scanner");
      if (!res.ok) return;
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setRecSummary(data.summary || null);
    } catch {
      // fail silently
    } finally {
      setRecLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStalled();
    void fetchRecommendations();
  }, [fetchStalled, fetchRecommendations]);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const visibleRecommendations = recommendations.filter((r) => !dismissed.has(r.id));

  // Compute badge counts
  const stalledCount = stalledSummary?.total ?? 0;
  const _recCount = visibleRecommendations.length;
  const urgentRecCount = recSummary?.high ?? 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 shadow-sm backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/80">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200/50 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-pink-50/50 px-4 py-3 dark:border-slate-700/50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/30">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2 shadow-md">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100">AI Insights</h3>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100/80 p-1 dark:bg-slate-800/80">
          <button
            onClick={() => setActiveTab("stalled")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              activeTab === "stalled"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Stalled
            {stalledCount > 0 && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  stalledSummary?.critical
                    ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                )}
              >
                {stalledCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("recommendations")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              activeTab === "recommendations"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Actions
            {urgentRecCount > 0 && (
              <span className="ml-0.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                {urgentRecCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {activeTab === "stalled" ? (
          <StalledClaimsContent
            claims={stalledClaims}
            summary={stalledSummary}
            loading={stalledLoading}
            onRefresh={fetchStalled}
          />
        ) : (
          <RecommendationsContent
            recommendations={visibleRecommendations}
            summary={recSummary}
            loading={recLoading}
            onRefresh={fetchRecommendations}
            onDismiss={handleDismiss}
          />
        )}
      </div>
    </div>
  );
}

// Stalled Claims Content
function StalledClaimsContent({
  claims,
  summary,
  loading,
  onRefresh,
}: {
  claims: StalledClaim[];
  summary: StalledSummary | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Checking for stalled claims...</span>
      </div>
    );
  }

  if (!summary || summary.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="font-semibold text-emerald-700 dark:text-emerald-300">All Claims Active</p>
        <p className="mt-1 text-xs text-slate-500">No stalled claims detected — nice work!</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={onRefresh}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Check Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
        <div className="flex items-center gap-3 text-xs">
          {summary.critical > 0 && (
            <span className="flex items-center gap-1 font-semibold text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {summary.critical} critical
            </span>
          )}
          {summary.warning > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {summary.warning} warning
            </span>
          )}
          {summary.watch > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              {summary.watch} watch
            </span>
          )}
        </div>
        {summary.totalAtRiskValue > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <DollarSign className="h-3 w-3" />
            {(summary.totalAtRiskValue / 100).toLocaleString()} at risk
          </span>
        )}
      </div>

      {/* Claims List */}
      <ScrollArea className="h-[280px]">
        <div className="space-y-2 pr-2">
          {claims.map((claim) => {
            const config = tierConfig[claim.tier];
            return (
              <Link
                key={claim.id}
                href={`/claims/${claim.id}/overview`}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-3 transition-all hover:shadow-md",
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("h-2.5 w-2.5 rounded-full", config.dot)} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {claim.claimNumber || claim.propertyAddress || "Unnamed"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                          config.text,
                          config.bg
                        )}
                      >
                        {config.label}
                      </span>
                    </div>
                    {claim.homeownerName && (
                      <p className="text-xs text-muted-foreground">{claim.homeownerName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <div>
                    <p className={cn("text-sm font-bold", config.text)}>
                      {claim.daysSinceUpdate}d idle
                    </p>
                    {claim.claimAmount && (
                      <p className="text-[10px] text-muted-foreground">
                        ${(claim.claimAmount / 100).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-200/50 pt-3 dark:border-slate-700/50">
        <Button variant="ghost" size="sm" onClick={onRefresh} className="h-7 text-xs">
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
        <Link href="/claims?status=stalled">
          <Button variant="link" size="sm" className="h-7 gap-1 text-xs text-indigo-600">
            View All Stalled Claims
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Recommendations Content
function RecommendationsContent({
  recommendations,
  summary,
  loading,
  onRefresh,
  onDismiss,
}: {
  recommendations: Recommendation[];
  summary: RecommendationSummary | null;
  loading: boolean;
  onRefresh: () => void;
  onDismiss: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">Scanning your jobs...</span>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-3 rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <p className="font-semibold text-emerald-700 dark:text-emerald-300">All caught up!</p>
        <p className="mt-1 text-xs text-slate-500">No urgent recommendations at this time.</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={onRefresh}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Scan Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      {summary && (
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-xs">
            {summary.high > 0 && (
              <Badge variant="destructive" className="px-1.5 text-[10px]">
                {summary.high} urgent
              </Badge>
            )}
            {summary.medium > 0 && (
              <Badge className="bg-amber-100 px-1.5 text-[10px] text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                {summary.medium} medium
              </Badge>
            )}
            {summary.low > 0 && <span className="text-slate-500">{summary.low} low priority</span>}
          </div>
          <span className="text-[10px] text-slate-400">{recommendations.length} total</span>
        </div>
      )}

      {/* Recommendations List */}
      <ScrollArea className="h-[280px]">
        <div className="space-y-2 pr-2">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className={cn(
                "relative rounded-xl border p-3 transition-all hover:shadow-sm",
                priorityColors[rec.priority]
              )}
            >
              {/* Dismiss button */}
              <button
                onClick={() => onDismiss(rec.id)}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Header */}
              <div className="flex items-start gap-2 pr-6">
                <div className="mt-0.5 text-indigo-600 dark:text-indigo-400">
                  {categoryIcons[rec.category]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge className={cn("text-[10px]", typeColors[rec.type])}>
                      {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}
                    </Badge>
                    <span className="truncate text-sm font-medium">{rec.entityTitle}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {rec.recommendation}
                  </p>
                </div>
              </div>

              {/* Action */}
              <div className="mt-2 flex justify-end">
                <Link href={rec.actionUrl}>
                  <Button size="sm" className="h-6 gap-1 text-[10px]">
                    {rec.action}
                    <ArrowRight className="h-2.5 w-2.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-200/50 pt-3 dark:border-slate-700/50">
        <Button variant="ghost" size="sm" onClick={onRefresh} className="h-7 text-xs">
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh
        </Button>
        <Link href="/ai/smart-actions">
          <Button variant="link" size="sm" className="h-7 gap-1 text-xs text-indigo-600">
            Smart Actions Engine
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
