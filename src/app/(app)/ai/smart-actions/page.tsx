"use client";

import { useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock,
  DollarSign,
  Flame,
  Lightbulb,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface SmartAction {
  id: string;
  type: "urgent" | "opportunity" | "follow-up" | "optimization" | "risk";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  metric?: string;
  actionLabel: string;
  actionHref: string;
  category: "claims" | "leads" | "pipeline" | "crew" | "finance";
}

interface ActionsSummary {
  totalActions: number;
  urgent: number;
  opportunities: number;
  pipelineValue: number;
  totalClaims: number;
  totalLeads: number;
}

const typeConfig = {
  urgent: {
    icon: Flame,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
    label: "Urgent",
  },
  opportunity: {
    icon: Lightbulb,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    label: "Opportunity",
  },
  "follow-up": {
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    label: "Follow Up",
  },
  optimization: {
    icon: Target,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
    label: "Optimize",
  },
  risk: {
    icon: Shield,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
    label: "Risk",
  },
};

export default function SmartActionsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [actions, setActions] = useState<SmartAction[]>([]);
  const [summary, setSummary] = useState<ActionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/smart-actions");
      const data = await res.json();
      if (data.success) {
        setActions(data.data.actions);
        setSummary(data.data.summary);
      }
    } catch (e) {
      logger.error("Smart actions fetch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void fetchActions();
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const visibleActions = actions.filter((a) => !dismissed.has(a.id));
  const urgentCount = visibleActions.filter((a) => a.priority === "high").length;
  const completedCount = dismissed.size;

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="claims"
        title="Smart Actions Hub"
        subtitle="AI recommendations, stalled claims, goals tracking — your command center for what needs attention"
        icon={<Brain className="h-5 w-5" />}
      >
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchActions}
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHero>

      {/* Summary KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50 dark:border-red-800 dark:from-red-950/20 dark:to-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-red-800 dark:text-red-300">Urgent</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-red-700 dark:text-red-400">{urgentCount}</p>
            <p className="text-xs text-red-600 dark:text-red-500">
              Actions need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-800 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Pipeline Value
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              ${(summary?.pipelineValue || 0).toLocaleString()}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">Active pipeline total</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Total Actions
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-blue-700 dark:text-blue-400">
              {visibleActions.length}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-500">Recommendations generated</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:border-purple-800 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                Completed
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-purple-700 dark:text-purple-400">
              {completedCount}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-500">Actions dismissed today</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200/20 bg-white/60 p-6 dark:bg-slate-900/50"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : visibleActions.length === 0 ? (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-800 dark:from-emerald-950/20 dark:to-teal-950/20">
          <CardContent className="py-12 text-center">
            <Sparkles className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
            <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
              All Clear! 🎉
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-emerald-700 dark:text-emerald-400">
              No pending actions right now. Your pipeline is healthy and all tasks are on track.
              Keep building — new recommendations will appear as your data evolves.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleActions.map((action) => {
            const config = typeConfig[action.type];
            const Icon = config.icon;
            return (
              <div
                key={action.id}
                className={`group overflow-hidden rounded-2xl border ${config.border} ${config.bg} p-5 shadow-sm transition-all hover:shadow-md`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-xl p-2.5 ${config.bg}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${config.badge}`}
                        >
                          {config.label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {action.category}
                        </span>
                        {action.priority === "high" && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/50 dark:text-red-400">
                            ⚡ HIGH PRIORITY
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {action.title}
                      </h4>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {action.description}
                      </p>
                      {action.metric && (
                        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <TrendingUp className="h-3 w-3" />
                          {action.metric}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 sm:flex-col">
                    <Button asChild size="sm">
                      <Link href={action.actionHref}>
                        {action.actionLabel}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDismissed((prev) => new Set([...prev, action.id]))}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
