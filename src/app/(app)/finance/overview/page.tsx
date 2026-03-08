"use client";

import { useUser } from "@clerk/nextjs";
import {
  ArrowDown,
  ArrowUp,
  BadgeDollarSign,
  Banknote,
  DollarSign,
  FileText,
  Lock,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { RBACGuard } from "@/components/rbac/RBACGuard";
import { Card, CardContent } from "@/components/ui/card";
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
}

export default function FinancialOverviewPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

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
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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

  return (
    <RBACGuard
      minimumRole="FIELD_TECH"
      fallback={
        <PageContainer maxWidth="7xl">
          <PageHero
            title="Financial Overview"
            subtitle="Executive view — revenue, profit, commissions, and accounts receivable"
            icon={<TrendingUp className="h-5 w-5" />}
            section="finance"
          />
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Lock className="h-12 w-12 text-amber-500" />
              <div>
                <h3 className="text-lg font-semibold">Employee Access Required</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Financial data is restricted to team members. Contact your admin for access.
                </p>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      }
    >
      <PageContainer maxWidth="7xl">
        <PageHero
          title="Financial Overview"
          subtitle="Executive view — revenue, profit, commissions, and accounts receivable"
          icon={<TrendingUp className="h-5 w-5" />}
          section="finance"
        />

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
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Gross Profit</h3>
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

        {/* Detail Sections */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Breakdown */}
          <div className="rounded-2xl bg-[var(--surface-glass)] p-6 shadow-sm backdrop-blur-xl">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
              <DollarSign className="h-5 w-5 text-green-500" /> Revenue Breakdown
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Contract Revenue</span>
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
          <div className="rounded-2xl bg-[var(--surface-glass)] p-6 shadow-sm backdrop-blur-xl">
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

          {/* Commission Status */}
          <div className="rounded-2xl bg-[var(--surface-glass)] p-6 shadow-sm backdrop-blur-xl">
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
                  {fmtDec(data.commissions.approved?.total ?? data.teamPerformance.commissionOwed)}
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
                  className="text-sm font-medium text-[color:var(--primary)] hover:underline"
                >
                  View all commissions →
                </Link>
              </div>
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="rounded-2xl bg-[var(--surface-glass)] p-6 shadow-sm backdrop-blur-xl">
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
                  className="text-sm font-medium text-[color:var(--primary)] hover:underline"
                >
                  View all invoices →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Team Performance Summary */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
            <Banknote className="h-5 w-5 text-emerald-500" /> Team Performance
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl bg-[var(--surface-1)] p-4 text-center">
              <p className="text-2xl font-bold text-[color:var(--text)]">
                {data.teamPerformance.repCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">Active Reps</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-1)] p-4 text-center">
              <p className="text-2xl font-bold text-[color:var(--text)]">
                {data.teamPerformance.claimsSigned}
              </p>
              <p className="mt-1 text-xs text-slate-500">Claims Signed</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-1)] p-4 text-center">
              <p className="text-2xl font-bold text-[color:var(--text)]">
                {data.teamPerformance.claimsApproved}
              </p>
              <p className="mt-1 text-xs text-slate-500">Approved</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-1)] p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {fmt(data.teamPerformance.totalRevenue)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Revenue</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-1)] p-4 text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {fmt(data.teamPerformance.commissionPaid)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Paid Out</p>
            </div>
            <div className="rounded-xl bg-[var(--surface-1)] p-4 text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {fmt(data.teamPerformance.commissionOwed + data.teamPerformance.commissionPending)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Unpaid</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/commissions"
            className="flex items-center gap-3 rounded-xl bg-[var(--surface-glass)] p-4 shadow-sm transition-all hover:bg-purple-50/50 dark:hover:bg-purple-950/20"
          >
            <BadgeDollarSign className="h-6 w-6 text-purple-500" />
            <div>
              <p className="font-medium text-[color:var(--text)]">Commissions</p>
              <p className="text-xs text-slate-500">Approve & pay reps</p>
            </div>
          </Link>
          <Link
            href="/invoices"
            className="flex items-center gap-3 rounded-xl bg-[var(--surface-glass)] p-4 shadow-sm transition-all hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
          >
            <FileText className="h-6 w-6 text-blue-500" />
            <div>
              <p className="font-medium text-[color:var(--text)]">Invoices</p>
              <p className="text-xs text-slate-500">Manage billing</p>
            </div>
          </Link>
          <Link
            href="/commissions"
            className="flex items-center gap-3 rounded-xl bg-[var(--surface-glass)] p-4 shadow-sm transition-all hover:bg-green-50/50 dark:hover:bg-green-950/20"
          >
            <TrendingUp className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium text-[color:var(--text)]">Commission Plans</p>
              <p className="text-xs text-slate-500">Configure pay structures</p>
            </div>
          </Link>
        </div>
      </PageContainer>
    </RBACGuard>
  );
}
