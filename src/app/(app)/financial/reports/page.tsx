"use client";

import { useUser } from "@clerk/nextjs";
import { BarChart3, DollarSign, Download, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/MetricCard";

interface ReportData {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
  };
  breakdown: {
    labor: number;
    materials: number;
    overhead: number;
    other: number;
    commissions?: number;
  };
  revenueBreakdown: {
    contractRevenue: number;
    supplementRevenue: number;
  };
  jobCount: number;
  range: string;
}

export default function FinancialReportsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [dateRange, setDateRange] = useState("ytd");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async (range: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports?range=${range}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json.data ?? json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      void fetchReport(dateRange);
    }
  }, [isLoaded, isSignedIn, dateRange, fetchReport]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const pct = (n: number, total: number) =>
    total > 0 ? (Math.round((n / total) * 1000) / 10).toFixed(1) + "%" : "0%";

  const handleExport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-report-${dateRange}-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const s = data?.summary;
  const b = data?.breakdown;
  const rb = data?.revenueBreakdown;

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="Financial Reporting Suite"
        subtitle="P&L statements powered by real job financial data"
        icon={<BarChart3 className="h-5 w-5" />}
        section="finance"
      >
        <Button className="gap-2" onClick={handleExport} disabled={!data}>
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </PageHero>

      {/* Controls */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/60">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="rounded-xl border border-slate-200/60 bg-white px-4 py-2 text-sm dark:border-slate-700/50 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="mtd">Month to Date</option>
          <option value="qtd">Quarter to Date</option>
          <option value="ytd">Year to Date</option>
          <option value="all">All Time</option>
        </select>
        {data && (
          <span className="text-xs text-slate-500">
            {data.jobCount} jobs · {dateRange.toUpperCase()}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : !data || !s ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-12 text-center backdrop-blur-xl">
          <p className="text-slate-500">No financial data available for this period.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              variant="gradient"
              gradientColor="success"
              label="Total Revenue"
              value={fmt(s.totalRevenue)}
              icon={<TrendingUp className="h-5 w-5" />}
              description={`${data.jobCount} jobs`}
            />
            <StatCard
              variant="gradient"
              gradientColor="error"
              label="Total Expenses"
              value={fmt(s.totalExpenses)}
              icon={<TrendingDown className="h-5 w-5" />}
              description={pct(s.totalExpenses, s.totalRevenue) + " of revenue"}
            />
            <StatCard
              variant="gradient"
              gradientColor="blue"
              label="Net Profit"
              value={fmt(s.netProfit)}
              icon={<DollarSign className="h-5 w-5" />}
              description={`${s.profitMargin}% margin`}
            />
            <StatCard
              variant="gradient"
              gradientColor="purple"
              label="Outstanding AR"
              value={fmt(s.totalOutstanding)}
              icon={<DollarSign className="h-5 w-5" />}
              description={`${fmt(s.totalCollected)} collected`}
            />
          </div>

          {/* P&L Statement */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/60">
            <div className="border-b border-slate-200/60 p-6 dark:border-slate-700/50">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Profit & Loss Statement
              </h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/40 dark:border-slate-700/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Account
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        % of Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80 dark:divide-slate-700/30">
                    {/* Revenue Section */}
                    <tr className="bg-blue-50/60 font-semibold dark:bg-blue-900/10">
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">Revenue</td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">
                        {fmt(s.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">
                        100%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 pl-8 text-slate-700 dark:text-slate-300">
                        Contract Revenue
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                        {fmt(rb!.contractRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                        {pct(rb!.contractRevenue, s.totalRevenue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 pl-8 text-slate-700 dark:text-slate-300">
                        Supplement Revenue
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                        {fmt(rb!.supplementRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                        {pct(rb!.supplementRevenue, s.totalRevenue)}
                      </td>
                    </tr>

                    {/* Expense Section */}
                    <tr className="bg-red-50/60 font-semibold dark:bg-red-900/10">
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">Expenses</td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">
                        {fmt(s.totalExpenses)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">
                        {pct(s.totalExpenses, s.totalRevenue)}
                      </td>
                    </tr>
                    {[
                      { label: "Labor", value: b!.labor },
                      { label: "Materials", value: b!.materials },
                      { label: "Overhead", value: b!.overhead },
                      { label: "Other", value: b!.other },
                      ...(b!.commissions ? [{ label: "Commissions", value: b!.commissions }] : []),
                    ].map((row) => (
                      <tr key={row.label}>
                        <td className="px-4 py-3 pl-8 text-slate-700 dark:text-slate-300">
                          {row.label}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {fmt(row.value)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                          {pct(row.value, s.totalRevenue)}
                        </td>
                      </tr>
                    ))}

                    {/* Net Profit */}
                    <tr className="bg-green-50/60 font-bold dark:bg-green-900/10">
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">Net Profit</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                        {fmt(s.netProfit)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                        {pct(s.netProfit, s.totalRevenue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* AR Summary */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/60">
            <div className="border-b border-slate-200/60 p-6 dark:border-slate-700/50">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Accounts Receivable Summary
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
              {[
                { label: "Total Invoiced", value: s.totalInvoiced, color: "text-blue-600" },
                { label: "Total Collected", value: s.totalCollected, color: "text-green-600" },
                { label: "Outstanding", value: s.totalOutstanding, color: "text-amber-600" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-sm text-slate-500">{item.label}</div>
                  <div className={`text-2xl font-bold ${item.color}`}>{fmt(item.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
