"use client";

import { ArrowUpRight, FileBarChart, Hammer, Mail, Plus, TrendingUp, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

type DashboardStats = {
  claimsCount: number;
  leadsCount: number;
  unreadMessagesCount: number;
  jobsCount: number;
  claimsTrend?: string;
  leadsTrend?: string;
  jobsTrend?: string;
  messagesTrend?: string;
};

export default function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/stats", { credentials: "include" });
        if (!res.ok) {
          logger.error("Dashboard stats API returned", res.status);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data.ok) {
          setStats(data.stats);
        } else {
          logger.error("Dashboard stats returned ok=false:", data.error);
        }
      } catch (error) {
        logger.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
        ))}
      </div>
    );
  }

  // Order: Total Leads → Active Claims → Messages → Retail Jobs
  const cards = [
    {
      label: "Total Leads",
      value: stats?.leadsCount ?? 0,
      Icon: UserPlus,
      trend: stats?.leadsTrend || "--",
      href: "/leads",
      createHref: "/leads/new",
      createLabel: "Add Lead",
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40",
      iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Active Claims",
      value: stats?.claimsCount ?? 0,
      Icon: FileBarChart,
      trend: stats?.claimsTrend || "--",
      href: "/claims",
      createHref: "/claims/new",
      createLabel: "New Claim",
      gradient: "from-blue-500 to-indigo-600",
      bgGradient: "from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40",
      iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Messages",
      value: stats?.unreadMessagesCount ?? 0,
      Icon: Mail,
      trend: stats?.messagesTrend || "--",
      href: "/messages",
      createHref: "/messages",
      createLabel: "Open Inbox",
      gradient: "from-purple-500 to-violet-600",
      bgGradient: "from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/40",
      iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Retail Jobs",
      value: stats?.jobsCount ?? 0,
      Icon: Hammer,
      trend: stats?.jobsTrend || "--",
      href: "/jobs/retail",
      createHref: "/jobs/retail/new",
      createLabel: "New Job",
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40",
      iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const I = card.Icon;
        const hasData = card.value > 0;
        const trendNum = parseFloat(card.trend);
        const isPositive = !isNaN(trendNum) && trendNum >= 0;

        return (
          <div
            key={card.label}
            className={`group relative overflow-hidden rounded-2xl border border-slate-200/50 bg-gradient-to-br ${card.bgGradient} p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700/50`}
          >
            {/* Top bar with gradient accent */}
            <div
              className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${card.gradient}`}
            />

            {/* Header row */}
            <div className="mb-3 flex items-center justify-between">
              <div className={`rounded-xl ${card.iconBg} p-2.5`}>
                <I className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              {hasData && card.trend !== "--" && (
                <span
                  className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isPositive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  }`}
                >
                  <TrendingUp className={`h-3 w-3 ${!isPositive ? "rotate-180" : ""}`} />
                  {card.trend}
                </span>
              )}
            </div>

            {/* Value + label */}
            <Link href={card.href} className="block">
              <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {card.value.toLocaleString()}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                {card.label}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
            </Link>

            {/* Empty state CTA or trend info */}
            {!hasData ? (
              <Link
                href={card.createHref}
                className={`mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r ${card.gradient} px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md`}
              >
                <Plus className="h-3.5 w-3.5" />
                {card.createLabel}
              </Link>
            ) : (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">Last 30 days</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
