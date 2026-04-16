"use client";

import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  DoorOpen,
  FileText,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BriefingItem {
  type: "urgent" | "followup" | "opportunity" | "milestone";
  title: string;
  description: string;
  link?: string;
  linkText?: string;
  icon: React.ReactNode;
}

interface DailyStats {
  newLeads: number;
  claimsToReview: number;
  scheduledInspections: number;
  pendingApprovals: number;
  revenueThisWeek: number;
  revenueGoal: number;
}

interface GoalProgress {
  doorsKnocked: { current: number; weekly: number; monthly: number };
  coldCalls: { current: number; weekly: number; monthly: number };
  revenue: { current: number; weekly: number; monthly: number };
}

interface AIDailyBriefingProps {
  className?: string;
}

export function AIDailyBriefing({ className }: AIDailyBriefingProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [briefing, setBriefing] = useState<BriefingItem[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [goals, setGoals] = useState<GoalProgress | null>(null);
  const [goalPeriod, setGoalPeriod] = useState<"weekly" | "monthly">("weekly");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    // Fetch briefing data
    fetchBriefing();
  }, []);

  const getIconForType = (type: string): React.ReactNode => {
    switch (type) {
      case "urgent":
        return <AlertTriangle className="h-4 w-4" />;
      case "followup":
        return <Calendar className="h-4 w-4" />;
      case "opportunity":
        return <TrendingUp className="h-4 w-4" />;
      case "milestone":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const fetchBriefing = async () => {
    setIsLoading(true);
    try {
      // Fetch briefing + goals in parallel
      const [briefingRes, goalsRes] = await Promise.all([
        fetch("/api/dashboard/briefing").catch(() => null),
        fetch("/api/dashboard/goals").catch(() => null),
      ]);

      // Handle briefing response
      if (briefingRes?.ok) {
        const data = await briefingRes.json();
        // API items don't have icons - map them based on type
        const items = (data.items || []).map((item: BriefingItem & { icon?: React.ReactNode }) => ({
          ...item,
          icon: item.icon || getIconForType(item.type),
        }));
        setBriefing(items.length > 0 ? items : getFallbackBriefing());
        setStats(data.stats || getFallbackStats());
      } else {
        setBriefing(getFallbackBriefing());
        setStats(getFallbackStats());
      }

      // Handle goals response
      if (goalsRes?.ok) {
        const goalsData = await goalsRes.json();
        if (goalsData.goals && Array.isArray(goalsData.goals)) {
          // Transform API goals format to component format
          const claimsGoal = goalsData.goals.find((g: { id: string }) => g.id === "claims");
          const revenueGoal = goalsData.goals.find((g: { id: string }) => g.id === "revenue");
          const leadsGoal = goalsData.goals.find((g: { id: string }) => g.id === "leads");
          setGoals({
            doorsKnocked: {
              current: leadsGoal?.current ?? 0,
              weekly: leadsGoal?.target ?? 50,
              monthly: (leadsGoal?.target ?? 50) * 4,
            },
            coldCalls: {
              current: claimsGoal?.current ?? 0,
              weekly: claimsGoal?.target ?? 20,
              monthly: (claimsGoal?.target ?? 20) * 4,
            },
            revenue: {
              current: revenueGoal?.current ?? 0,
              weekly: revenueGoal?.target ?? 7500000,
              monthly: (revenueGoal?.target ?? 7500000) * 4,
            },
          });
        } else {
          setGoals(getFallbackGoals());
        }
      } else {
        setGoals(getFallbackGoals());
      }
    } catch {
      setBriefing(getFallbackBriefing());
      setStats(getFallbackStats());
      setGoals(getFallbackGoals());
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackBriefing = (): BriefingItem[] => [
    {
      type: "urgent",
      title: "3 claims need attention",
      description: "Insurance responses received overnight that require your review",
      link: "/claims?filter=needs_action",
      linkText: "Review Claims",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      type: "followup",
      title: "2 inspections scheduled today",
      description: "Property inspections at 10:00 AM and 2:30 PM",
      link: "/appointments",
      linkText: "View Schedule",
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      type: "opportunity",
      title: "New storm activity detected",
      description: "Hail reported in your service area yesterday - 12 potential leads",
      link: "/maps/weather-chains",
      linkText: "View Storm Map",
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      type: "milestone",
      title: "Weekly goal: 78% complete",
      description: "4 more claims to hit your target of 20 this week",
      link: "/leaderboard",
      linkText: "View Progress",
      icon: <CheckCircle className="h-4 w-4" />,
    },
  ];

  const getFallbackStats = (): DailyStats => ({
    newLeads: 8,
    claimsToReview: 3,
    scheduledInspections: 2,
    pendingApprovals: 5,
    revenueThisWeek: 47500,
    revenueGoal: 75000,
  });

  const getFallbackGoals = (): GoalProgress => ({
    doorsKnocked: { current: 45, weekly: 100, monthly: 400 },
    coldCalls: { current: 8, weekly: 15, monthly: 60 },
    revenue: { current: 47500, weekly: 75000, monthly: 300000 },
  });

  const getGoalTarget = (goal: { current: number; weekly: number; monthly: number }) =>
    goalPeriod === "weekly" ? goal.weekly : goal.monthly;

  const getGoalPercent = (goal: { current: number; weekly: number; monthly: number }) => {
    const target = getGoalTarget(goal);
    return target > 0 ? Math.min(Math.round((goal.current / target) * 100), 100) : 0;
  };

  const getItemStyles = (type: BriefingItem["type"]) => {
    switch (type) {
      case "urgent":
        return "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30";
      case "followup":
        return "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30";
      case "opportunity":
        return "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30";
      case "milestone":
        return "border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/30";
      default:
        return "";
    }
  };

  const getIconStyles = (type: BriefingItem["type"]) => {
    switch (type) {
      case "urgent":
        return "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400";
      case "followup":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400";
      case "opportunity":
        return "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400";
      case "milestone":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className={cn("rounded-2xl border bg-card p-6", className)}>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-[#117CFF] to-purple-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border bg-card p-6", className)}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#117CFF] to-purple-500">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{greeting}!</h3>
          <p className="text-sm text-muted-foreground">
            Here&apos;s your AI-powered daily briefing
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-4 gap-3">
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <Users className="mx-auto mb-1 h-4 w-4 text-blue-500" />
            <p className="text-lg font-bold">{stats.newLeads}</p>
            <p className="text-[10px] text-muted-foreground">New Leads</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <FileText className="mx-auto mb-1 h-4 w-4 text-amber-500" />
            <p className="text-lg font-bold">{stats.claimsToReview}</p>
            <p className="text-[10px] text-muted-foreground">To Review</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <Calendar className="mx-auto mb-1 h-4 w-4 text-green-500" />
            <p className="text-lg font-bold">{stats.scheduledInspections}</p>
            <p className="text-[10px] text-muted-foreground">Inspections</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <Clock className="mx-auto mb-1 h-4 w-4 text-purple-500" />
            <p className="text-lg font-bold">{stats.pendingApprovals}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </div>
        </div>
      )}

      {/* Revenue Progress */}
      {stats && (
        <div className="mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 dark:border-green-900 dark:from-green-950/30 dark:to-emerald-950/30">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Weekly Revenue</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {Math.round((stats.revenueThisWeek / stats.revenueGoal) * 100)}% of goal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-green-200 dark:bg-green-900">
              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${Math.min((stats.revenueThisWeek / stats.revenueGoal) * 100, 100)}%`,
                }}
              />
            </div>
            <span className="text-sm font-bold text-green-600">
              ${(stats.revenueThisWeek / 100).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Goal Tracking */}
      {goals && (
        <div className="mb-6 rounded-xl border bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-4 dark:from-indigo-950/20 dark:to-purple-950/20">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold">Goal Tracking</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-muted/70 p-0.5">
              <button
                onClick={() => setGoalPeriod("weekly")}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                  goalPeriod === "weekly"
                    ? "bg-white text-foreground shadow-sm dark:bg-slate-800"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Weekly
              </button>
              <button
                onClick={() => setGoalPeriod("monthly")}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                  goalPeriod === "monthly"
                    ? "bg-white text-foreground shadow-sm dark:bg-slate-800"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Doors Knocked */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <DoorOpen className="h-3.5 w-3.5 text-blue-500" />
                  <span className="font-medium">Doors Knocked</span>
                </div>
                <span className="text-muted-foreground">
                  {goals.doorsKnocked.current} / {getGoalTarget(goals.doorsKnocked)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900/50">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${getGoalPercent(goals.doorsKnocked)}%` }}
                />
              </div>
            </div>

            {/* Cold Calls */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-medium">Cold Calls</span>
                </div>
                <span className="text-muted-foreground">
                  {goals.coldCalls.current} / {getGoalTarget(goals.coldCalls)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/50">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${getGoalPercent(goals.coldCalls)}%` }}
                />
              </div>
            </div>

            {/* Revenue */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-green-500" />
                  <span className="font-medium">Revenue</span>
                </div>
                <span className="text-muted-foreground">
                  ${(goals.revenue.current / 100).toLocaleString()} / $
                  {(getGoalTarget(goals.revenue) / 100).toLocaleString()}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-green-200 dark:bg-green-900/50">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${getGoalPercent(goals.revenue)}%` }}
                />
              </div>
            </div>
          </div>

          <Link
            href="/settings/goals"
            className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="h-3 w-3" />
            Set your goals
          </Link>
        </div>
      )}

      {/* Briefing Items */}
      <div className="space-y-3">
        {briefing.map((item, index) => (
          <div
            key={index}
            className={cn("flex items-start gap-3 rounded-xl border p-4", getItemStyles(item.type))}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                getIconStyles(item.type)
              )}
            >
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              {item.link && (
                <Link
                  href={item.link}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#117CFF] hover:underline"
                >
                  {item.linkText} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={fetchBriefing}
        className="mt-4 w-full text-muted-foreground"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Refresh Briefing
      </Button>
    </div>
  );
}
