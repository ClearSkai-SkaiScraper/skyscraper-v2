"use client";

import { useUser } from "@clerk/nextjs";
import {
  ArrowDown,
  ArrowUp,
  BadgeDollarSign,
  Banknote,
  DollarSign,
  FileText,
  Receipt,
  RefreshCw,
  Shield,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { RBACGuard } from "@/components/rbac/RBACGuard";
import { logger } from "@/lib/logger";

const fmt = (n: number) =>
  "$" +
  n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtDec = (n: number) =>
  "$" +
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface FinancialData {
  revenue: { total: number; contract: number; supplement: number };
  costs: { total: number; material: number; labor: number; overhead: number; other: number };
  profit: { gross: number; margin: number };
  commissions: Record<string, { total: number; count: number }>;
  invoices: { count: number; totalBilled: number; totalCollected: number; outstanding: number };
  ar: { invoiced: number; collected: number; outstanding: number };
  teamPerformance: {
    totalRevenue: number;
    commissionOwed: number;
    commissionPaid: number;
    commissionPending: number;
    claimsSigned: number;
    claimsApproved: number;
    repCount: number;
  };
  jobCount: number;
  claimsPipeline?: {
    approvedValue: number;
    approvedCount: number;
    pendingValue: number;
    pendingCount: number;
    signedCount: number;
  };
}

export default function FinancialOverviewPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "revenue" | "commissions" | "ar">(
    "overview"
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const fetchData = async () => {
      try {
        const res = await fetch("/api/finance/overview");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else if (!res.ok) {
          // API returned an error — provide zeroed-out data so the page still renders
          logger.warn("Finance API returned", {
            status: res.status,
            error: json.error || "Unknown error",
          });
          setData({
            revenue: { total: 0, contract: 0, supplement: 0 },
            costs: { total: 0, material: 0, labor: 0, overhead: 0, other: 0 },
            profit: { gross: 0, margin: 0 },
            commissions: {},
            invoices: { count: 0, totalBilled: 0, totalCollected: 0, outstanding: 0 },
            ar: { invoiced: 0, collected: 0, outstanding: 0 },
            teamPerformance: {
              totalRevenue: 0,
              commissionOwed: 0,
              commissionPaid: 0,
              commissionPending: 0,
              claimsSigned: 0,
              claimsApproved: 0,
              repCount: 0,
            },
            jobCount: 0,
            claimsPipeline: {
              approvedValue: 0,
              approvedCount: 0,
              pendingValue: 0,
              pendingCount: 0,
              signedCount: 0,
            },
          });
        }
      } catch (e) {
        logger.error("Finance overview fetch failed:", e);
        // On network error, still render with zeroed data
        setData({
          revenue: { total: 0, contract: 0, supplement: 0 },
          costs: { total: 0, material: 0, labor: 0, overhead: 0, other: 0 },
          profit: { gross: 0, margin: 0 },
          commissions: {},
          invoices: { count: 0, totalBilled: 0, totalCollected: 0, outstanding: 0 },
          ar: { invoiced: 0, collected: 0, outstanding: 0 },
          teamPerformance: {
            totalRevenue: 0,
            commissionOwed: 0,
            commissionPaid: 0,
            commissionPending: 0,
            claimsSigned: 0,
            claimsApproved: 0,
            repCount: 0,
          },
          jobCount: 0,
          claimsPipeline: {
            approvedValue: 0,
            approvedCount: 0,
            pendingValue: 0,
            pendingCount: 0,
            signedCount: 0,
          },
        });
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (!data) {
    return (
      <PageContainer maxWidth="7xl">
        <PageHero
          title="Financial Overview"
          subtitle="Executive view — revenue, profit, commissions, and accounts receivable"
          icon={<TrendingUp className="h-5 w-5" />}
          section="finance"
        />
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-12 text-center backdrop-blur-xl">
          <p className="text-slate-500">Unable to load financial data. Please try again.</p>
        </div>
      </PageContainer>
    );
  }

  const commissionTotal =
    (data.commissions.pending?.total ?? 0) +
    (data.commissions.approved?.total ?? 0) +
    (data.commissions.paid?.total ?? 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/finance/overview");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  };

  const pipeline = data.claimsPipeline;
  const totalPipelineValue = (pipeline?.approvedValue ?? 0) + (pipeline?.pendingValue ?? 0);

  return (
    <RBACGuard
      minimumRole="admin"
      loadingFallback={
        <PageContainer maxWidth="5xl">
          <PageHero
            title="Financial Overview"
            subtitle="Loading access…"
            icon={<TrendingUp className="h-5 w-5" />}
            section="finance"
          />
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </PageContainer>
      }
      fallback={
        <PageContainer maxWidth="5xl">
          <PageHero
            title="Financial Overview"
            subtitle="Executive view — revenue, profit, commissions, and accounts receivable"
            icon={<TrendingUp className="h-5 w-5" />}
            section="finance"
          />
          <div className="mx-auto max-w-xl rounded-xl border border-amber-500/40 bg-amber-50 p-8 shadow dark:bg-amber-950">
            <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold text-amber-700 dark:text-amber-200">
              <Shield className="h-5 w-5" /> Admin Access Required
            </h2>
            <p className="text-sm text-amber-600 dark:text-amber-300">
              Financial data is restricted to company admins and owners. Contact your admin to
              request access.
            </p>
            <div className="mt-4">
              <Link href="/dashboard">
                <button className="rounded border border-[color:var(--border)] px-5 py-2 text-sm">
                  ← Dashboard
                </button>
              </Link>
            </div>
          </div>
        </PageContainer>
      }
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Gradient Header — matching claims workspace */}
        <header className="sticky top-0 z-20 border-b border-emerald-700/30 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 shadow-lg">
          <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-white">Financial Overview</h1>
                  <p className="text-xs text-emerald-100">
                    Executive view — revenue, profit, commissions & AR
                  </p>
                </div>
              </div>

              {/* KPI Pills */}
              <div className="hidden items-center gap-2 md:flex">
                <div className="rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    <DollarSign className="h-3.5 w-3.5" />
                    {fmt(data.revenue.total || data.teamPerformance.totalRevenue)}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-200">
                    Revenue
                  </span>
                </div>
                {totalPipelineValue > 0 && (
                  <div className="rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      <Shield className="h-3.5 w-3.5" />
                      {fmt(totalPipelineValue / 100)}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-200">
                      Pipeline
                    </span>
                  </div>
                )}
                <div className="rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    {data.profit.margin >= 0 ? (
                      <ArrowUp className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5" />
                    )}
                    {data.profit.margin.toFixed(1)}%
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-200">
                    Margin
                  </span>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-lg bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <nav className="-mb-px flex gap-1 overflow-x-auto">
              {(
                [
                  { key: "overview", label: "Overview" },
                  { key: "revenue", label: "Revenue & Costs" },
                  { key: "commissions", label: "Commissions" },
                  { key: "ar", label: "Invoices & AR" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "border-white text-white"
                      : "border-transparent text-emerald-200 hover:border-white/40 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Content Area */}
        <main className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Top KPI Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Revenue */}
                <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-md dark:from-green-950/20 dark:to-emerald-950/20">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-lg bg-green-500 p-2">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-sm font-medium text-green-700 dark:text-green-400">
                      Total Revenue
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-green-800 dark:text-green-300">
                    {fmt(data.revenue.total || data.teamPerformance.totalRevenue)}
                  </p>
                  <p className="mt-1 text-xs text-green-600 dark:text-green-500">
                    {data.jobCount} jobs tracked
                  </p>
                </div>

                {/* Gross Profit */}
                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-md dark:from-blue-950/20 dark:to-indigo-950/20">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500 p-2">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      Gross Profit
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-blue-800 dark:text-blue-300">
                    {fmt(data.profit.gross)}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    {data.profit.margin >= 0 ? (
                      <ArrowUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-xs text-blue-600 dark:text-blue-500">
                      {data.profit.margin.toFixed(1)}% margin
                    </span>
                  </div>
                </div>

                {/* Commissions */}
                <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 p-6 shadow-md dark:from-purple-950/20 dark:to-violet-950/20">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-lg bg-purple-500 p-2">
                      <BadgeDollarSign className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-sm font-medium text-purple-700 dark:text-purple-400">
                      Commissions
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-purple-800 dark:text-purple-300">
                    {fmt(
                      commissionTotal ||
                        data.teamPerformance.commissionOwed + data.teamPerformance.commissionPaid
                    )}
                  </p>
                  <p className="mt-1 text-xs text-purple-600 dark:text-purple-500">
                    {data.teamPerformance.repCount} reps
                  </p>
                </div>

                {/* Outstanding AR */}
                <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-md dark:from-orange-950/20 dark:to-amber-950/20">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-lg bg-orange-500 p-2">
                      <Receipt className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-sm font-medium text-orange-700 dark:text-orange-400">
                      Outstanding AR
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-orange-800 dark:text-orange-300">
                    {fmt(data.ar.outstanding || data.invoices.outstanding || 0)}
                  </p>
                  <p className="mt-1 text-xs text-orange-600 dark:text-orange-500">
                    {data.invoices.count} invoices
                  </p>
                </div>
              </div>

              {/* Claims Pipeline — NEW */}
              {pipeline && (pipeline.approvedCount > 0 || pipeline.pendingCount > 0) && (
                <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 p-6 shadow-sm dark:border-blue-800/40 dark:from-blue-950/30 dark:to-indigo-950/20">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                    <Shield className="h-5 w-5 text-blue-500" /> Claims Pipeline
                  </h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <div className="rounded-xl bg-white/60 p-4 text-center shadow-sm dark:bg-slate-800/40">
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {pipeline.signedCount}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Signed</p>
                    </div>
                    <div className="rounded-xl bg-white/60 p-4 text-center shadow-sm dark:bg-slate-800/40">
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {pipeline.pendingCount}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Pending</p>
                    </div>
                    <div className="rounded-xl bg-white/60 p-4 text-center shadow-sm dark:bg-slate-800/40">
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {fmt(pipeline.pendingValue / 100)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Pending Value</p>
                    </div>
                    <div className="rounded-xl bg-white/60 p-4 text-center shadow-sm dark:bg-slate-800/40">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {pipeline.approvedCount}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Approved</p>
                    </div>
                    <div className="rounded-xl bg-white/60 p-4 text-center shadow-sm dark:bg-slate-800/40">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {fmt(pipeline.approvedValue / 100)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Approved Value</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Performance */}
              <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:bg-slate-900/60">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
                  <Banknote className="h-5 w-5 text-emerald-500" /> Team Performance
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-[color:var(--text)]">
                      {data.teamPerformance.repCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Active Reps</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-[color:var(--text)]">
                      {data.teamPerformance.claimsSigned}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Claims Signed</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-[color:var(--text)]">
                      {data.teamPerformance.claimsApproved}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Approved</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {fmt(data.teamPerformance.totalRevenue)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Revenue</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {fmt(data.teamPerformance.commissionPaid)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Paid Out</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {fmt(
                        data.teamPerformance.commissionOwed + data.teamPerformance.commissionPending
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Unpaid</p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Link
                  href="/commissions"
                  className="flex items-center gap-3 rounded-xl bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-purple-50/50 dark:bg-slate-900/60 dark:hover:bg-purple-950/20"
                >
                  <BadgeDollarSign className="h-6 w-6 text-purple-500" />
                  <div>
                    <p className="font-medium text-[color:var(--text)]">Commissions</p>
                    <p className="text-xs text-slate-500">Approve & pay reps</p>
                  </div>
                </Link>
                <Link
                  href="/invoices"
                  className="flex items-center gap-3 rounded-xl bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-blue-50/50 dark:bg-slate-900/60 dark:hover:bg-blue-950/20"
                >
                  <FileText className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="font-medium text-[color:var(--text)]">Invoices</p>
                    <p className="text-xs text-slate-500">Manage billing</p>
                  </div>
                </Link>
                <Link
                  href="/commissions"
                  className="flex items-center gap-3 rounded-xl bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-green-50/50 dark:bg-slate-900/60 dark:hover:bg-green-950/20"
                >
                  <TrendingUp className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-[color:var(--text)]">Commission Plans</p>
                    <p className="text-xs text-slate-500">Configure pay structures</p>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* REVENUE & COSTS TAB */}
          {activeTab === "revenue" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Revenue Breakdown */}
              <div className="rounded-2xl bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:bg-slate-900/60">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
                  <DollarSign className="h-5 w-5 text-green-500" /> Revenue Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Contract Revenue
                    </span>
                    <span className="font-mono font-medium text-[color:var(--text)]">
                      {fmtDec(data.revenue.contract)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Supplements</span>
                    <span className="font-mono font-medium text-[color:var(--text)]">
                      {fmtDec(data.revenue.supplement)}
                    </span>
                  </div>
                  <div className="border-t border-[color:var(--border)] pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[color:var(--text)]">
                        Total Revenue
                      </span>
                      <span className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                        {fmtDec(data.revenue.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="rounded-2xl bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:bg-slate-900/60">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
                  <Wallet className="h-5 w-5 text-red-500" /> Cost Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Materials</span>
                    <span className="font-mono font-medium text-[color:var(--text)]">
                      {fmtDec(data.costs.material)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Labor</span>
                    <span className="font-mono font-medium text-[color:var(--text)]">
                      {fmtDec(data.costs.labor)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Overhead</span>
                    <span className="font-mono font-medium text-[color:var(--text)]">
                      {fmtDec(data.costs.overhead)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Other</span>
                    <span className="font-mono font-medium text-[color:var(--text)]">
                      {fmtDec(data.costs.other)}
                    </span>
                  </div>
                  <div className="border-t border-[color:var(--border)] pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[color:var(--text)]">
                        Total Costs
                      </span>
                      <span className="font-mono text-lg font-bold text-red-600 dark:text-red-400">
                        {fmtDec(data.costs.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit Summary */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm dark:from-emerald-950/20 dark:to-teal-950/20 lg:col-span-2">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                  <TrendingUp className="h-5 w-5" /> Profit Summary
                </h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="text-center">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">Revenue</p>
                    <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                      {fmt(data.revenue.total)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-red-600 dark:text-red-400">Total Costs</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                      −{fmt(data.costs.total)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">Gross Profit</p>
                    <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-300">
                      {fmt(data.profit.gross)}
                    </p>
                    <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                      {data.profit.margin.toFixed(1)}% margin
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMMISSIONS TAB */}
          {activeTab === "commissions" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:bg-slate-900/60">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
                  <BadgeDollarSign className="h-5 w-5 text-purple-500" /> Commission Pipeline
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Pending Approval
                      </span>
                    </div>
                    <span className="font-mono font-medium text-yellow-600 dark:text-yellow-400">
                      {fmtDec(
                        data.commissions.pending?.total ?? data.teamPerformance.commissionPending
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Approved (Owed)
                      </span>
                    </div>
                    <span className="font-mono font-medium text-orange-600 dark:text-orange-400">
                      {fmtDec(
                        data.commissions.approved?.total ?? data.teamPerformance.commissionOwed
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Paid Out</span>
                    </div>
                    <span className="font-mono font-medium text-green-600 dark:text-green-400">
                      {fmtDec(data.commissions.paid?.total ?? data.teamPerformance.commissionPaid)}
                    </span>
                  </div>
                  <div className="border-t border-[color:var(--border)] pt-2">
                    <Link
                      href="/commissions"
                      className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      View all commissions →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Team Performance */}
              <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-6 backdrop-blur-xl dark:bg-slate-900/60">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
                  <Banknote className="h-5 w-5 text-emerald-500" /> Team Performance
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-[color:var(--text)]">
                      {data.teamPerformance.repCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Active Reps</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-[color:var(--text)]">
                      {data.teamPerformance.claimsSigned}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Claims Signed</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-[color:var(--text)]">
                      {data.teamPerformance.claimsApproved}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Approved</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {fmt(data.teamPerformance.totalRevenue)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Revenue</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {fmt(data.teamPerformance.commissionPaid)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Paid Out</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/40">
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {fmt(
                        data.teamPerformance.commissionOwed + data.teamPerformance.commissionPending
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Unpaid</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INVOICES & AR TAB */}
          {activeTab === "ar" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Invoice Summary */}
              <div className="rounded-2xl bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:bg-slate-900/60">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
                  <FileText className="h-5 w-5 text-blue-500" /> Invoice Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Total Billed</span>
                    <span className="font-mono font-medium text-[color:var(--text)]">
                      {fmtDec(data.invoices.totalBilled || data.ar.invoiced)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Collected</span>
                    <span className="font-mono font-medium text-green-600 dark:text-green-400">
                      {fmtDec(data.invoices.totalCollected || data.ar.collected)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Outstanding</span>
                    <span className="font-mono font-medium text-orange-600 dark:text-orange-400">
                      {fmtDec(data.invoices.outstanding || data.ar.outstanding)}
                    </span>
                  </div>
                  <div className="border-t border-[color:var(--border)] pt-2">
                    <Link
                      href="/invoices"
                      className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      View all invoices →
                    </Link>
                  </div>
                </div>
              </div>

              {/* AR Overview */}
              <div className="rounded-2xl bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:bg-slate-900/60">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
                  <Receipt className="h-5 w-5 text-orange-500" /> Accounts Receivable
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Collection Rate</span>
                      <span className="font-medium text-[color:var(--text)]">
                        {data.ar.invoiced > 0
                          ? ((data.ar.collected / data.ar.invoiced) * 100).toFixed(1)
                          : "0"}
                        %
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{
                          width: `${data.ar.invoiced > 0 ? (data.ar.collected / data.ar.invoiced) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-[color:var(--text)]">
                        {fmt(data.ar.invoiced)}
                      </p>
                      <p className="text-xs text-slate-500">Invoiced</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {fmt(data.ar.collected)}
                      </p>
                      <p className="text-xs text-slate-500">Collected</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {fmt(data.ar.outstanding)}
                      </p>
                      <p className="text-xs text-slate-500">Outstanding</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* ─── QuickBooks Integration ─────────────────────────── */}
          <div className="mx-auto mt-8 max-w-7xl px-4 md:px-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                    <Wallet className="h-5 w-5 text-emerald-500" />
                    QuickBooks Integration
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Connect your QuickBooks account to see real-time company financial data,
                    invoices, expenses, and P&L — all synced automatically.
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-600 dark:bg-slate-800/50">
                <Wallet className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  QuickBooks OAuth Token
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Your QuickBooks OAuth connection will appear here. Once connected, real-time
                  financial data from QuickBooks will sync to this dashboard.
                </p>
                <button
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  disabled
                  title="QuickBooks OAuth integration coming soon"
                >
                  <Wallet className="h-4 w-4" />
                  Connect QuickBooks (Coming Soon)
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </RBACGuard>
  );
}
