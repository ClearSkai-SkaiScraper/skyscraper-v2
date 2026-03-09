"use client";

import {
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Download,
  FileText,
  Loader2,
  Mail,
  MinusCircle,
  Percent,
  PieChart,
  RefreshCw,
  Scale,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancialAnalysisResult } from "@/lib/intel/financial/engine";

/* ── Helpers ────────────────────────────────────────────────── */

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtShort = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/* ── Tab Configuration ──────────────────────────────────────── */

type TabKey = "overview" | "depreciation" | "lineItems" | "supplements" | "settlement" | "exports";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview",      label: "Overview",       icon: <PieChart className="h-4 w-4" /> },
  { key: "depreciation",  label: "Depreciation",   icon: <TrendingDown className="h-4 w-4" /> },
  { key: "lineItems",     label: "Line Items",     icon: <BarChart3 className="h-4 w-4" /> },
  { key: "supplements",   label: "Supplements",    icon: <TrendingUp className="h-4 w-4" /> },
  { key: "settlement",    label: "Settlement",     icon: <Target className="h-4 w-4" /> },
  { key: "exports",       label: "Exports",        icon: <Download className="h-4 w-4" /> },
];

/* ════════════════════════════════════════════════════════════ */
/*  Financial Analysis Engine — shadcn/ui + dark mode           */
/* ════════════════════════════════════════════════════════════ */

export default function ClaimFinancialPage() {
  const params = useParams();
  const claimId = (params?.claimId as string) || "";

  const [analysis, setAnalysis] = useState<FinancialAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  async function runAnalysis() {
    setLoading(true);
    try {
      const res = await fetch("/api/intel/financial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data.analysis);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to run financial analysis");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  /* ── Loading state ─────────────────────────────────────── */
  if (loading && !analysis) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-6 h-20 w-20">
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              <DollarSign className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground">Running Financial Analysis...</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Analyzing estimates, depreciation, and projections
          </p>
          <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  /* ── Empty / CTA state ─────────────────────────────────── */
  if (!analysis) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md border-dashed">
          <CardContent className="pt-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Financial Analysis</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Generate a comprehensive financial audit including RCV/ACV calculations,
              underpayment detection, and settlement projections.
            </p>
            <Button onClick={runAnalysis} size="lg" className="w-full">
              <BarChart3 className="mr-2 h-4 w-4" />
              Generate Analysis
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totals = analysis.totals;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Financial Analysis Engine
            </h1>
            <p className="text-sm text-muted-foreground">
              Complete financial audit and underpayment detection
            </p>
          </div>
        </div>

        <Button onClick={runAnalysis} variant="outline" disabled={loading} className="shrink-0">
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* ── Summary Banner ──────────────────────────────── */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-800 dark:from-emerald-900/20 dark:to-teal-900/20">
        <CardContent className="py-5">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            {analysis.summary}
          </p>
          {totals.underpayment > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 dark:bg-red-900/40">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-lg font-bold text-red-700 dark:text-red-300">
                Total Underpayment: ${fmt(totals.underpayment)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────── */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && <OverviewTab totals={totals} analysis={analysis} />}
        {activeTab === "depreciation" && <DepreciationTab analysis={analysis} totals={totals} />}
        {activeTab === "lineItems" && <LineItemsTab analysis={analysis} />}
        {activeTab === "supplements" && <SupplementsTab analysis={analysis} />}
        {activeTab === "settlement" && <SettlementTab analysis={analysis} />}
        {activeTab === "exports" && <ExportsTab analysis={analysis} claimId={claimId} />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TAB 1: Overview                                              */
/* ══════════════════════════════════════════════════════════════ */

function OverviewTab({
  totals,
  analysis,
}: {
  totals: FinancialAnalysisResult["totals"];
  analysis: FinancialAnalysisResult;
}) {
  const statCards = [
    { label: "Carrier RCV",     value: totals.rcvCarrier,    color: "text-blue-600 dark:text-blue-400",       border: "border-l-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/40" },
    { label: "Contractor RCV",  value: totals.rcvContractor, color: "text-emerald-600 dark:text-emerald-400", border: "border-l-emerald-500",  bg: "bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Deductible",      value: totals.deductible,    color: "text-orange-600 dark:text-orange-400",   border: "border-l-orange-500",  bg: "bg-orange-50 dark:bg-orange-950/40" },
    { label: "Total ACV",       value: totals.acvContractor, color: "text-purple-600 dark:text-purple-400",   border: "border-l-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/40" },
    { label: "Underpayment",    value: totals.underpayment,  color: "text-red-600 dark:text-red-400",         border: "border-l-red-500",     bg: "bg-red-50 dark:bg-red-950/40",   isBad: true },
    { label: "Payments So Far", value: 0,                    color: "text-slate-600 dark:text-slate-400",     border: "border-l-slate-400",   bg: "bg-slate-50 dark:bg-slate-800/40", note: "No payments recorded" },
    { label: "Tax",             value: totals.tax,           color: "text-indigo-600 dark:text-indigo-400",   border: "border-l-indigo-500",  bg: "bg-indigo-50 dark:bg-indigo-950/40" },
    { label: "Final Owed",      value: totals.netOwed,       color: "text-teal-700 dark:text-teal-300",       border: "border-l-teal-600",    bg: "bg-teal-50 dark:bg-teal-950/40" },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-foreground">Financial Overview</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className={`border-l-4 ${s.border} ${s.bg} shadow-sm`}>
            <CardContent className="px-4 py-4">
              <p className={`text-xs font-semibold uppercase tracking-wide ${s.color}`}>
                {s.label}
              </p>
              <p className={`mt-1 text-2xl font-bold ${s.isBad && s.value > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                ${fmt(s.value)}
              </p>
              {s.note && <p className="mt-1 text-[11px] text-muted-foreground">{s.note}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Underpayment Reasons */}
      {analysis.underpaymentReasons.length > 0 && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Underpayment Reasons
          </h4>
          <div className="space-y-2">
            {analysis.underpaymentReasons.map((reason: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audit Findings */}
      {analysis.auditFindings.length > 0 && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <Shield className="h-4 w-4 text-amber-500" />
            Audit Findings
          </h4>
          <div className="space-y-2">
            {analysis.auditFindings.map((finding, idx: number) => {
              const sev = finding.severity;
              const sevStyles =
                sev === "high"
                  ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                  : sev === "medium"
                    ? "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30"
                    : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30";

              return (
                <div key={idx} className={`flex items-start justify-between rounded-lg border p-4 ${sevStyles}`}>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{finding.category}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{finding.issue}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-lg font-bold text-foreground">${fmt(finding.impact)}</span>
                    <Badge variant={sev === "high" ? "destructive" : "secondary"} className="text-[10px] uppercase">
                      {sev}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TAB 2: Depreciation                                          */
/* ══════════════════════════════════════════════════════════════ */

function DepreciationTab({
  analysis,
  totals,
}: {
  analysis: FinancialAnalysisResult;
  totals: FinancialAnalysisResult["totals"];
}) {
  const dep = analysis.depreciation;
  const carrierRate = totals.rcvCarrier > 0 ? (dep.carrierApplied / totals.rcvCarrier) * 100 : 0;
  const correctRate = totals.rcvContractor > 0 ? (dep.correctAmount / totals.rcvContractor) * 100 : 0;
  const hasViolations = dep.violations && dep.violations.length > 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-foreground">Depreciation Analysis</h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/30">
          <CardContent className="px-5 py-5">
            <p className="text-xs font-semibold uppercase text-red-600 dark:text-red-400">Carrier Applied</p>
            <p className="mt-1 text-2xl font-bold text-foreground">${fmt(dep.carrierApplied)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{carrierRate.toFixed(1)}% depreciation rate</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/30">
          <CardContent className="px-5 py-5">
            <p className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">Correct Amount</p>
            <p className="mt-1 text-2xl font-bold text-foreground">${fmt(dep.correctAmount)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{correctRate.toFixed(1)}% depreciation rate</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/30">
          <CardContent className="px-5 py-5">
            <p className="text-xs font-semibold uppercase text-orange-600 dark:text-orange-400">Recoverable</p>
            <p className="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">${fmt(dep.difference)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Overcalculated depreciation</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <CardContent className="flex items-start gap-3 py-5">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">Analysis</p>
            <p className="mt-1 text-sm text-blue-900 dark:text-blue-100">{dep.explanation}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 py-5">
          <div>
            <p className="text-xs text-muted-foreground">Depreciation Type</p>
            <p className="mt-1 text-base font-bold capitalize text-foreground">{dep.type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-1 flex items-center gap-2">
              {hasViolations ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-bold text-red-600 dark:text-red-400">Violations Found</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Compliant</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {hasViolations && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Policy Violations
          </h4>
          {dep.violations!.map((v: string, i: number) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TAB 3: Line Items                                            */
/* ══════════════════════════════════════════════════════════════ */

function LineItemsTab({ analysis }: { analysis: FinancialAnalysisResult }) {
  const items = analysis.lineItemAnalysis;
  const missingCount = items.filter((i) => i.missingFromCarrier).length;
  const supplementCount = items.filter((i) => i.recommendedSupplement).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">Line Item Financial Audit</h3>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span><strong className="text-red-600">{missingCount}</strong> missing from carrier</span>
          <span><strong className="text-orange-600">{supplementCount}</strong> need supplement</span>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Carrier</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contractor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diff</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, idx: number) => (
                <tr key={idx} className={item.missingFromCarrier ? "bg-red-50/50 dark:bg-red-950/20" : "hover:bg-muted/30"}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-foreground">
                    {item.lineCode}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{item.description}</p>
                    {item.justification && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.justification}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    {item.missingFromCarrier ? (
                      <Badge variant="destructive" className="text-[10px]">Missing</Badge>
                    ) : (
                      <span className="text-foreground">${fmt(item.carrier)}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-foreground">
                    ${fmt(item.contractor)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold">
                    {item.underpaid > 0 ? (
                      <span className="text-red-600 dark:text-red-400">-${fmt(item.underpaid)}</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">$0.00</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    {item.recommendedSupplement ? (
                      <Badge variant="secondary" className="text-[10px] text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/40">
                        Supplement
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-300">
                        OK
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TAB 4: Supplements                                           */
/* ══════════════════════════════════════════════════════════════ */

function SupplementsTab({ analysis }: { analysis: FinancialAnalysisResult }) {
  if (analysis.requiredSupplements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-foreground">No Supplements Required</h3>
        <p className="mt-1 text-sm text-muted-foreground">All line items are properly accounted for</p>
      </div>
    );
  }

  const highImpact = analysis.lineItemAnalysis.filter((i) => i.recommendedSupplement && i.contractor > 1000).length;
  const medImpact = analysis.lineItemAnalysis.filter((i) => i.recommendedSupplement && i.contractor >= 500 && i.contractor <= 1000).length;
  const lowImpact = analysis.lineItemAnalysis.filter((i) => i.recommendedSupplement && i.contractor < 500).length;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-foreground">Supplement Opportunities</h3>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/30">
          <CardContent className="px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase text-red-600 dark:text-red-400">High Impact</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{highImpact}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/30">
          <CardContent className="px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase text-orange-600 dark:text-orange-400">Medium</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{medImpact}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
          <CardContent className="px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase text-yellow-600 dark:text-yellow-400">Low</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{lowImpact}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {analysis.requiredSupplements.map((supplement: string, idx: number) => {
          const item = analysis.lineItemAnalysis.find(
            (i) => supplement.includes(i.lineCode) || supplement.includes(i.description)
          );
          const priority = item && item.contractor > 1000 ? "high" : item && item.contractor >= 500 ? "medium" : "low";
          const styles =
            priority === "high"
              ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
              : priority === "medium"
                ? "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30"
                : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30";

          return (
            <div key={idx} className={`flex items-start justify-between rounded-lg border p-4 ${styles}`}>
              <div className="flex items-start gap-3">
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{supplement}</p>
                  {item?.justification && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.justification}</p>
                  )}
                </div>
              </div>
              {item && (
                <span className="shrink-0 text-base font-bold text-foreground">
                  ${fmt(item.contractor)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TAB 5: Settlement                                            */
/* ══════════════════════════════════════════════════════════════ */

function SettlementTab({ analysis }: { analysis: FinancialAnalysisResult }) {
  const proj = analysis.settlementProjection;
  const riskLevel = proj.confidence > 80 ? "Low" : proj.confidence > 60 ? "Medium" : "High";
  const riskColor = riskLevel === "Low" ? "text-emerald-600 dark:text-emerald-400" : riskLevel === "Medium" ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400";

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-foreground">Settlement Projection</h3>

      <Card className="border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-700 dark:from-emerald-950/40 dark:to-teal-950/40">
        <CardContent className="py-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Projected Settlement Range
          </p>
          <p className="mt-3 text-4xl font-bold tracking-tight text-foreground">
            ${fmtShort(proj.min)} &ndash; ${fmtShort(proj.max)}
          </p>
          <p className="mt-2 text-base text-muted-foreground">
            Expected:{" "}
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              ${fmtShort(proj.expected)}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Percent className="h-4 w-4 text-muted-foreground" />
              Confidence Level
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {proj.confidence}%
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 pr-2 transition-all"
              style={{ width: `${proj.confidence}%` } as React.CSSProperties}
            >
              {proj.confidence >= 40 && (
                <span className="text-[10px] font-bold text-white">{proj.confidence}%</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Projection Factors
        </h4>
        <div className="space-y-2">
          {proj.factors.map((factor: string, idx: number) => (
            <div key={idx} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <span className="text-sm text-foreground">{factor}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/30">
          <CardContent className="py-5">
            <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Scale className="h-4 w-4 text-orange-500" />
              Adjuster Pushback Risk
            </h4>
            <p className={`mt-2 text-xl font-bold ${riskColor}`}>{riskLevel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {riskLevel === "Low"
                ? "Strong documentation and clear justifications"
                : riskLevel === "Medium"
                  ? "Additional documentation may be required"
                  : "Expect significant negotiation"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="py-5">
            <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <FileText className="h-4 w-4 text-blue-500" />
              Recommended Strategy
            </h4>
            <div className="mt-2 space-y-1.5">
              {["Prepare detailed supplement packet", "Include weather verification", "Attach manufacturer specs", "Document all discrepancies"].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                  <CheckCircle2 className="h-3 w-3 text-blue-500" />
                  {s}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TAB 6: Exports                                               */
/* ══════════════════════════════════════════════════════════════ */

function ExportsTab({ analysis, claimId }: { analysis: FinancialAnalysisResult; claimId: string }) {
  function downloadText(filename: string, lines: string[]) {
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportAdjuster() {
    const a = analysis;
    downloadText(`adjuster-report-${claimId}.txt`, [
      "FINANCIAL ANALYSIS - ADJUSTER REPORT",
      `Claim: ${claimId}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "=== TOTALS ===",
      `Carrier RCV: $${fmt(a.totals.rcvCarrier)}`,
      `Contractor RCV: $${fmt(a.totals.rcvContractor)}`,
      `Overage: $${fmt(a.totals.overage)}`,
      `Underpayment: $${fmt(a.totals.underpayment)}`,
      `Deductible: $${fmt(a.totals.deductible)}`,
      `Net Owed: $${fmt(a.totals.netOwed)}`,
      "",
      "=== SUMMARY ===",
      a.summary,
      "",
      "=== AUDIT FINDINGS ===",
      ...a.auditFindings.map((f, i) => `${i + 1}. [${f.severity}] ${f.category}: ${f.issue} (impact: $${fmt(f.impact)})`),
      "",
      "=== REQUIRED SUPPLEMENTS ===",
      ...a.requiredSupplements.map((s, i) => `${i + 1}. ${s}`),
      "",
      "=== UNDERPAYMENT REASONS ===",
      ...a.underpaymentReasons.map((r, i) => `${i + 1}. ${r}`),
      "",
      "=== LINE ITEM ANALYSIS ===",
      ...a.lineItemAnalysis.map(
        (li) => `- ${li.description}: Carrier $${fmt(li.carrier)} vs Contractor $${fmt(li.contractor)}${li.underpaid > 0 ? ` (underpaid $${fmt(li.underpaid)})` : ""}`
      ),
    ]);
  }

  function exportHomeowner() {
    const a = analysis;
    downloadText(`homeowner-summary-${claimId}.txt`, [
      "YOUR CLAIM FINANCIAL SUMMARY",
      `Date: ${new Date().toLocaleDateString()}`,
      "",
      "Here is a summary of your insurance claim finances:",
      "",
      `Total Claim Value: $${fmt(a.totals.rcvContractor)}`,
      `Insurance Carrier Estimate: $${fmt(a.totals.rcvCarrier)}`,
      `Underpayment Gap: $${fmt(a.totals.underpayment)}`,
      `Deductible: $${fmt(a.totals.deductible)}`,
      `Net Owed to You: $${fmt(a.totals.netOwed)}`,
      "",
      a.requiredSupplements.length ? "ADDITIONAL WORK NEEDED:" : "No additional supplements needed at this time.",
      ...a.requiredSupplements.map((s, i) => `  ${i + 1}. ${s}`),
      "",
      "If you have any questions, please contact your contractor.",
    ]);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-analysis-${claimId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const exports = [
    {
      title: "Adjuster-Ready Report",
      description: "Professional report with full financial audit, depreciation analysis, and supplement justifications",
      icon: <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      color: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30",
      label: "Download Report",
      onClick: exportAdjuster,
    },
    {
      title: "Homeowner Summary",
      description: "Plain-language summary explaining what is owed, supplements needed, and simple pricing",
      icon: <ArrowDownToLine className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      color: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
      label: "Download Summary",
      onClick: exportHomeowner,
    },
    {
      title: "Raw JSON Data",
      description: "Complete financial analysis data in JSON format for integration with other systems",
      icon: <Download className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
      color: "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30",
      label: "Download JSON",
      onClick: exportJSON,
    },
    {
      title: "Send Supplement Packet",
      description: "Email complete supplement packet directly to carrier adjuster with all documentation",
      icon: <Mail className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
      color: "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30",
      label: "Send to Adjuster",
      onClick: () => alert("Email integration coming soon. Use Download buttons to export and attach to an email manually."),
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-foreground">Export Financial Analysis</h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {exports.map((exp) => (
          <Card key={exp.title} className={exp.color}>
            <CardContent className="flex flex-col gap-4 py-5">
              <div className="flex items-start gap-3">
                {exp.icon}
                <div>
                  <h4 className="font-bold text-foreground">{exp.title}</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">{exp.description}</p>
                </div>
              </div>
              <Button onClick={exp.onClick} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {exp.label}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="py-5">
          <h4 className="mb-3 text-sm font-bold text-foreground">Export Stats</h4>
          <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            {[
              { n: analysis.lineItemAnalysis.length, label: "Line Items" },
              { n: analysis.auditFindings.length, label: "Audit Findings" },
              { n: analysis.requiredSupplements.length, label: "Supplements" },
              { n: analysis.settlementProjection.confidence, label: "Confidence %" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-foreground">{s.n}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
