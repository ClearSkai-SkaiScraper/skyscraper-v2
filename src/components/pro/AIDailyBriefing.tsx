"use client";

import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Sparkles,
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

interface AIDailyBriefingProps {
  className?: string;
}

export function AIDailyBriefing({ className }: AIDailyBriefingProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [briefing, setBriefing] = useState<BriefingItem[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);
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

  const fetchBriefing = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/dashboard/briefing");
      if (res.ok) {
        const data = await res.json();
        setBriefing(data.items || []);
        setStats(data.stats || null);
      } else {
        // Use fallback data if API fails
        setBriefing(getFallbackBriefing());
        setStats(getFallbackStats());
      }
    } catch {
      setBriefing(getFallbackBriefing());
      setStats(getFallbackStats());
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
      link: "/storm-leads",
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
