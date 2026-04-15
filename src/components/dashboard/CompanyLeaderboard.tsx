"use client";

import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Crown,
  Filter,
  Medal,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  revenue: number;
  claimsSigned: number;
  claimsApproved: number;
  doorsKnocked: number;
  closeRate: number;
  commissionEarned: number;
  commissionPaid: number;
  rankRevenue: number;
  rankClaims: number;
  rankDoors: number;
  sourceBreakdown?: Record<string, number>;
}

interface LeaderboardSummary {
  totalRevenue: number;
  totalClaims: number;
  totalDoors: number;
  pendingClaimsCount?: number;
  signedClaimsCount?: number;
  repCount: number;
  avgCloseRate: number;
  allSources?: string[];
}

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtK = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
};

type TabKey = "revenue" | "claims" | "doors";

interface CompanyLeaderboardProps {
  className?: string;
}

export function CompanyLeaderboard({ className }: CompanyLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [summary, setSummary] = useState<LeaderboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("revenue");
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<"month" | "3month" | "6month" | "year">("month");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ period });
        if (sourceFilter !== "all") params.append("source", sourceFilter);
        const res = await fetch(`/api/finance/leaderboard?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to load leaderboard: ${res.status}`);
        }
        const data = await res.json();
        if (data.success) {
          setEntries(data.data?.leaderboard || []);
          setSummary(data.data?.summary || null);
        } else {
          throw new Error(data.error || "Failed to load leaderboard");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load leaderboard";
        setError(msg);
        logger.error("Leaderboard fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };
    void fetchLeaderboard();
  }, [period, sourceFilter]);

  // Sorted + max value for progress bars
  const { sorted, maxVal } = useMemo(() => {
    const s = [...entries].sort((a, b) => {
      if (tab === "revenue") return a.rankRevenue - b.rankRevenue;
      if (tab === "claims") return a.rankClaims - b.rankClaims;
      return a.rankDoors - b.rankDoors;
    });
    let max = 1;
    for (const e of s) {
      const v = tab === "revenue" ? e.revenue : tab === "claims" ? e.claimsSigned : e.doorsKnocked;
      if (v > max) max = v;
    }
    return { sorted: s, maxVal: max };
  }, [entries, tab]);

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200/50 bg-red-50/50 p-6 text-center dark:border-red-800/30 dark:bg-red-950/20">
        <div className="flex flex-col items-center gap-3">
          <BarChart3 className="h-10 w-10 text-red-400" />
          <p className="font-medium text-red-700 dark:text-red-300">Unable to load leaderboard</p>
          <p className="text-sm text-red-600/70 dark:text-red-400/70">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200/20 bg-white/60 p-6 backdrop-blur-xl dark:bg-slate-900/50">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="mb-4 grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  // When no entries yet, show the full leaderboard UI with zeroed summary
  // instead of a placeholder "add your first claim" message.
  const effectiveSummary: LeaderboardSummary = summary ?? {
    totalRevenue: 0,
    totalClaims: 0,
    totalDoors: 0,
    repCount: 0,
    avgCloseRate: 0,
  };

  const tabConfig: { key: TabKey; label: string; icon: typeof Trophy }[] = [
    { key: "revenue", label: "Revenue", icon: TrendingUp },
    { key: "claims", label: "Claims", icon: Target },
    { key: "doors", label: "Doors Knocked", icon: Filter },
  ];

  const displayed = expanded ? sorted : sorted.slice(0, 5);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-white/80 shadow-[0_0_40px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:bg-slate-900/80",
        className
      )}
    >
      {/* Gradient top stripe */}
      <div className="h-1.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/50 px-6 py-4 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 p-2.5 shadow-md">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[color:var(--text)]">Company Leaderboard</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {summary?.repCount ?? 0} reps tracked · Real-time performance
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200/50 bg-slate-100/80 p-1 dark:border-slate-700/50 dark:bg-slate-800/80">
            <CalendarDays className="ml-2 h-3.5 w-3.5 text-slate-400" />
            {(["month", "3month", "6month", "year"] as const).map((p) => {
              const labels = {
                month: "This Month",
                "3month": "3 Months",
                "6month": "6 Months",
                year: "YTD",
              };
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    period === p
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-xl border border-slate-200/50 bg-slate-100/80 p-1 dark:border-slate-700/50 dark:bg-slate-800/80">
            {tabConfig.map(({ key, label, icon: Ic }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                  tab === key
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                <Ic className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Source Filter (shown when Lead Sources tab active) */}
          {tab === "doors" && summary?.allSources && summary.allSources.length > 0 && (
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-lg border border-slate-200/50 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-300"
            >
              <option value="all">All Sources</option>
              {summary.allSources.map((src) => (
                <option key={src} value={src}>
                  {src.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPI Summary Row — always shown */}
      <div className="grid grid-cols-2 gap-px border-b border-slate-200/50 bg-slate-200/30 dark:border-slate-700/50 dark:bg-slate-700/20 sm:grid-cols-4">
        {[
          {
            label: "Total Revenue",
            value: fmtK(effectiveSummary.totalRevenue),
            icon: TrendingUp,
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-950/30",
          },
          {
            label:
              effectiveSummary.signedClaimsCount !== undefined
                ? `Total Claims · ${effectiveSummary.signedClaimsCount} signed`
                : effectiveSummary.pendingClaimsCount
                  ? `Total Claims · ${effectiveSummary.pendingClaimsCount} pending`
                  : "Total Claims",
            value: effectiveSummary.totalClaims.toString(),
            icon: Target,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/30",
          },
          {
            label: "Avg Close Rate",
            value: `${effectiveSummary.avgCloseRate.toFixed(1)}%`,
            icon: BarChart3,
            color: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-50 dark:bg-purple-950/30",
          },
          {
            label:
              sourceFilter !== "all"
                ? sourceFilter.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                : "Doors Knocked",
            value: effectiveSummary.totalDoors.toLocaleString(),
            icon: Filter,
            color: "text-orange-600 dark:text-orange-400",
            bg: "bg-orange-50 dark:bg-orange-950/30",
          },
        ].map(({ label, value, icon: Ic, color, bg }) => (
          <div key={label} className={`${bg} px-5 py-4`}>
            <div className="flex items-center gap-2">
              <Ic className={`h-4 w-4 ${color}`} />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {label}
              </span>
            </div>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
      {/* Column Headers */}
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 border-b border-slate-100 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:text-slate-500">
        <span className="w-8">Rank</span>
        <span>Rep</span>
        <span className="hidden w-24 text-right sm:block">Close Rate</span>
        <span className="w-28 text-right">
          {tab === "revenue" ? "Revenue" : tab === "claims" ? "Claims" : "Doors"}
        </span>
      </div>

      {/* Leaderboard Rows */}
      <div className="divide-y divide-slate-100/80 dark:divide-slate-800/80">
        {displayed.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No reps ranked yet this period
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Rankings populate automatically as your team logs claims, revenue, and door knocks.
            </p>
          </div>
        ) : (
          displayed.map((entry) => {
            const rank =
              tab === "revenue"
                ? entry.rankRevenue
                : tab === "claims"
                  ? entry.rankClaims
                  : entry.rankDoors;
            const primaryValue =
              tab === "revenue"
                ? entry.revenue
                : tab === "claims"
                  ? entry.claimsSigned
                  : entry.doorsKnocked;
            const displayValue =
              tab === "revenue"
                ? fmt(entry.revenue)
                : tab === "claims"
                  ? entry.claimsSigned.toString()
                  : entry.doorsKnocked.toLocaleString();
            const pct = maxVal > 0 ? (primaryValue / maxVal) * 100 : 0;
            const barColor =
              rank === 1
                ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                : rank === 2
                  ? "bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-500 dark:to-slate-400"
                  : rank === 3
                    ? "bg-gradient-to-r from-orange-300 to-orange-400"
                    : "bg-gradient-to-r from-blue-300 to-blue-400 dark:from-blue-600 dark:to-blue-500";

            return (
              <div
                key={entry.userId}
                className={`group relative grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-6 py-3.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                  rank === 1 ? "bg-yellow-50/40 dark:bg-yellow-950/10" : ""
                }`}
              >
                {/* Rank Badge */}
                <div className="flex w-8 justify-center">
                  {rank === 1 ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-md">
                      <Crown className="h-4 w-4 text-white" />
                    </div>
                  ) : rank === 2 ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-400 shadow dark:from-slate-600 dark:to-slate-500">
                      <Medal className="h-4 w-4 text-white" />
                    </div>
                  ) : rank === 3 ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-orange-500 shadow">
                      <Medal className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {rank}
                    </span>
                  )}
                </div>

                {/* Rep Info + Progress Bar */}
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    {entry.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.avatar}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-700"
                      />
                    ) : (
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${
                          rank <= 3
                            ? "bg-gradient-to-br from-orange-400 to-red-500"
                            : "bg-gradient-to-br from-slate-400 to-slate-600"
                        }`}
                      >
                        {entry.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {entry.name}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {fmt(entry.commissionEarned)} earned
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Close Rate */}
                <div className="hidden text-right sm:block">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      entry.closeRate >= 50
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                        : entry.closeRate >= 25
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {entry.closeRate.toFixed(0)}%
                  </span>
                </div>

                {/* Primary Metric */}
                <div className="w-28 text-right">
                  <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                    {displayValue}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {tab === "revenue" ? "revenue" : tab === "claims" ? "signed" : "doors"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Expand/Collapse */}
      {entries.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 px-6 py-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:hover:bg-slate-800/50 dark:hover:text-slate-300"
        >
          <Users className="h-3.5 w-3.5" />
          {expanded ? "Show Top 5" : `Show all ${entries.length} reps`}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}
