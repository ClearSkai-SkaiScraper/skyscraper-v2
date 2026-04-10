"use client";

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle,
  Clock,
  DollarSign,
  HelpCircle,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface KPIData {
  claimsPerStage: Record<string, number>;
  avgCycleTime: number;
  approvalRatio: number;
  supplementCount: number;
  supplementRatio: number;
  avgRoofSize: number;
  avgMaterialCost: number;
  totalRevenue: number;
  revenueByOrg: Record<string, number>;
  jobsByZip: Record<string, number>;
  aiRiskLevels: { low: number; medium: number; high: number };
  aiPredictedApproval: number;
  redFlags: { type: string; count: number; severity: "low" | "medium" | "high" }[];
}

const defaultKPIData: KPIData = {
  claimsPerStage: {},
  avgCycleTime: 0,
  approvalRatio: 0,
  supplementCount: 0,
  supplementRatio: 0,
  avgRoofSize: 0,
  avgMaterialCost: 0,
  totalRevenue: 0,
  revenueByOrg: {},
  jobsByZip: {},
  aiRiskLevels: { low: 0, medium: 0, high: 0 },
  aiPredictedApproval: 0,
  redFlags: [],
};

export default function KPIDashboardClient({ embedded = false }: { embedded?: boolean }) {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  useEffect(() => {
    void fetchKPIs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  async function fetchKPIs() {
    try {
      const response = await fetch(`/api/dashboard/kpis?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data === "object" && !Array.isArray(data) && !data.error) {
          setKpiData({
            ...defaultKPIData,
            ...data,
            aiRiskLevels: { ...defaultKPIData.aiRiskLevels, ...(data.aiRiskLevels || {}) },
            redFlags: Array.isArray(data.redFlags) ? data.redFlags : [],
            claimsPerStage: data.claimsPerStage || {},
          });
        } else {
          // API returned empty/error — show zeros, not fake data
          setKpiData(defaultKPIData);
        }
      } else {
        setKpiData(defaultKPIData);
      }
    } catch (error) {
      logger.error("Failed to fetch KPIs:", error);
      setKpiData(defaultKPIData);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    const loader = (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#117CFF] border-t-transparent" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading performance data…</p>
        </div>
      </div>
    );
    return embedded ? loader : <PageContainer maxWidth="7xl">{loader}</PageContainer>;
  }

  const data = kpiData || defaultKPIData;
  const totalClaims = Object.values(data.claimsPerStage).reduce((a, b) => a + b, 0);
  const totalRisk = data.aiRiskLevels.low + data.aiRiskLevels.medium + data.aiRiskLevels.high;
  const highPriorityFlags = data.redFlags.filter((f) => f.severity === "high");

  const content = (
    <>
      {/* Time Range Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="7d">7 Days</TabsTrigger>
          <TabsTrigger value="30d">30 Days</TabsTrigger>
          <TabsTrigger value="90d">90 Days</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>

        <TabsContent value={timeRange} className="mt-6 space-y-6">
          {/* ── SCORECARD: 4 big numbers ────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <ScoreCard
              label="Claim Speed"
              value={data.avgCycleTime > 0 ? `${data.avgCycleTime}d` : "—"}
              helper="Avg. days from intake → approval"
              icon={Clock}
              accent="blue"
            />
            <ScoreCard
              label="Win Rate"
              value={`${(data.approvalRatio * 100).toFixed(0)}%`}
              helper="Claims approved vs. total filed"
              icon={CheckCircle}
              accent="green"
            />
            <ScoreCard
              label="Revenue"
              value={
                data.totalRevenue > 0 ? `$${(data.totalRevenue / 100).toLocaleString()}` : "$0"
              }
              helper="Total collected this period"
              icon={DollarSign}
              accent="emerald"
            />
            <ScoreCard
              label="AI Confidence"
              value={
                data.aiPredictedApproval > 0
                  ? `${(data.aiPredictedApproval * 100).toFixed(0)}%`
                  : "—"
              }
              helper="AI-predicted approval rate"
              icon={Shield}
              accent="purple"
            />
          </div>

          {/* ── PIPELINE: Where are your claims? ────────────────── */}
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Your Claims Pipeline
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Where each claim stands right now
                  </p>
                </div>
                <Badge variant="outline" className="font-mono">
                  {totalClaims} total
                </Badge>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2.5">
                {Object.entries(data.claimsPerStage).map(([stage, count]) => {
                  const max = Math.max(...Object.values(data.claimsPerStage), 1);
                  const pct = (count / max) * 100;
                  return (
                    <div key={stage} className="group flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-sm text-slate-600 dark:text-slate-400">
                        {stage}
                      </span>
                      <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                        <div
                          className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-[#117CFF] to-[#117CFF]/70 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                        <span className="relative z-10 flex h-full items-center px-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* ── TWO-COLUMN: Supplements + Materials ─────────────── */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Supplements */}
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">Supplements</h3>
                <p className="text-xs text-slate-500">
                  Additional work added after initial estimate
                </p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
                <div className="px-6 py-5 text-center">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {data.supplementCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Total Filed</p>
                </div>
                <div className="px-6 py-5 text-center">
                  <p className="text-3xl font-bold text-orange-500">
                    {(data.supplementRatio * 100).toFixed(0)}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Supplement Rate</p>
                </div>
              </div>
              <div className="border-t border-slate-100 px-6 py-3 dark:border-slate-800">
                <p className="text-xs text-slate-500">
                  {data.supplementRatio < 0.35
                    ? "✅ Healthy — under 35% target"
                    : "⚠️ High — above 35% target. Review scope quality."}
                </p>
              </div>
            </Card>

            {/* Material Costs */}
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-white">Material Costs</h3>
                <p className="text-xs text-slate-500">Average sizing and pricing data</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
                <div className="px-6 py-5 text-center">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {data.avgRoofSize > 0 ? data.avgRoofSize.toLocaleString() : "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Avg Sq Ft</p>
                </div>
                <div className="px-6 py-5 text-center">
                  <p className="text-3xl font-bold text-emerald-500">
                    {data.avgMaterialCost > 0 ? `$${data.avgMaterialCost.toLocaleString()}` : "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Avg Cost</p>
                </div>
              </div>
              <div className="border-t border-slate-100 px-6 py-3 dark:border-slate-800">
                <p className="text-xs text-slate-500">
                  {data.avgRoofSize > 0 && data.avgMaterialCost > 0
                    ? `$${(data.avgMaterialCost / data.avgRoofSize).toFixed(2)} per sq ft average`
                    : "Create estimates to see material insights"}
                </p>
              </div>
            </Card>
          </div>

          {/* ── RISK: Simple traffic light ──────────────────────── */}
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Claim Risk Overview
                </h3>
                <span className="group relative cursor-help">
                  <HelpCircle className="h-4 w-4 text-slate-400" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900">
                    AI analyzes each claim for documentation gaps and risk factors
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-500">How risky are your current claims?</p>
            </div>
            <div className="p-6">
              <div className="flex items-stretch gap-3">
                {/* Risk bars — visual proportions */}
                {[
                  {
                    label: "Low Risk",
                    count: data.aiRiskLevels.low,
                    color: "bg-green-500",
                    text: "text-green-700 dark:text-green-400",
                  },
                  {
                    label: "Medium Risk",
                    count: data.aiRiskLevels.medium,
                    color: "bg-yellow-500",
                    text: "text-yellow-700 dark:text-yellow-400",
                  },
                  {
                    label: "High Risk",
                    count: data.aiRiskLevels.high,
                    color: "bg-red-500",
                    text: "text-red-700 dark:text-red-400",
                  },
                ].map((level) => (
                  <div
                    key={level.label}
                    className="flex-1 rounded-xl border border-slate-100 p-4 text-center dark:border-slate-800"
                  >
                    <div
                      className={`mx-auto mb-2 h-2 rounded-full ${level.color}`}
                      style={{
                        width: `${Math.max((level.count / Math.max(totalRisk, 1)) * 100, 10)}%`,
                      }}
                    />
                    <p className={`text-2xl font-bold ${level.text}`}>{level.count}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{level.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* ── ACTION ITEMS: Red flags that need attention ──────── */}
          {data.redFlags.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Needs Your Attention
                  </h3>
                  {highPriorityFlags.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {highPriorityFlags.length} urgent
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Issues that could delay claims or reduce approvals
                </p>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {data.redFlags.map((flag, idx) => (
                  <div key={idx} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          flag.severity === "high"
                            ? "bg-red-500"
                            : flag.severity === "medium"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {flag.type}
                      </span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {flag.count} claims
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 px-6 py-3 dark:border-slate-800">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
                  <Link href="/claims">
                    Review Claims <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );

  if (embedded) return content;

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="Performance Dashboard"
        subtitle="See how your business is doing at a glance"
        icon={<BarChart3 className="h-5 w-5" />}
        section="command"
      />
      {content}
    </PageContainer>
  );
}

/* ── Simple score card with helper text ──────────────────────────────────── */
interface ScoreCardProps {
  label: string;
  value: string;
  helper: string;
  icon: React.ElementType;
  accent: "blue" | "green" | "emerald" | "purple";
}

const accentMap = {
  blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
  green: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40",
  emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
  purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40",
};

function ScoreCard({ label, value, helper, icon: Icon, accent }: ScoreCardProps) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white lg:text-3xl">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-2.5 ${accentMap[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{helper}</p>
    </Card>
  );
}
