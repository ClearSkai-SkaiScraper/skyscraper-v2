"use client";

import { logger } from "@/lib/logger";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle,
  Clock,
  DollarSign,
  PieChart,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface KPIData {
  // Claims Flow
  claimsPerStage: Record<string, number>;
  avgCycleTime: number;
  approvalRatio: number;

  // Supplements
  supplementCount: number;
  supplementRatio: number;

  // Financial
  avgRoofSize: number;
  avgMaterialCost: number;
  totalRevenue: number;
  revenueByOrg: Record<string, number>;

  // Geographic
  jobsByZip: Record<string, number>;

  // AI Metrics
  aiRiskLevels: {
    low: number;
    medium: number;
    high: number;
  };
  aiPredictedApproval: number;

  // Red Flags
  redFlags: {
    type: string;
    count: number;
    severity: "low" | "medium" | "high";
  }[];
}

export default function KPIDashboardClient() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  useEffect(() => {
    fetchKPIs();
  }, [timeRange]);

  async function fetchKPIs() {
    try {
      const response = await fetch(`/api/dashboard/kpis?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        // API returns a flat array of KPI cards — merge into our shape
        if (Array.isArray(data)) {
          const lookup: Record<string, string> = {};
          data.forEach((k: any) => {
            lookup[k.id || k.label] = k.value;
          });
          // Merge real API values into mock template so all fields exist
          setKpiData((prev) => ({
            ...(prev || mockData),
            totalRevenue:
              parseFloat(
                (lookup["mtd-revenue"] || lookup["MTD Revenue"] || "0").replace(/[$,]/g, "")
              ) * 100 || mockData.totalRevenue,
          }));
        } else if (data && typeof data === "object" && !Array.isArray(data)) {
          setKpiData(data);
        }
        // If unexpected shape, mockData fallback will be used
      }
    } catch (error) {
      logger.error("Failed to fetch KPIs:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PageContainer maxWidth="7xl">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading KPI dashboard...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  const mockData: KPIData = {
    claimsPerStage: {
      "Lead Intake": 24,
      "Inspection Scheduled": 18,
      "Inspection Completed": 12,
      "Estimate Drafting": 8,
      Submitted: 15,
      "In Review": 10,
      Supplementing: 7,
      Approved: 22,
      "In Production": 14,
      Completed: 45,
    },
    avgCycleTime: 28.5,
    approvalRatio: 0.87,
    supplementCount: 42,
    supplementRatio: 0.31,
    avgRoofSize: 3250,
    avgMaterialCost: 12500,
    totalRevenue: 2847000,
    revenueByOrg: {
      "Org A": 1200000,
      "Org B": 950000,
      "Org C": 697000,
    },
    jobsByZip: {
      "75001": 23,
      "75002": 18,
      "75003": 31,
      "75004": 15,
      "75005": 27,
    },
    aiRiskLevels: {
      low: 102,
      medium: 34,
      high: 12,
    },
    aiPredictedApproval: 0.92,
    redFlags: [
      { type: "Delayed Adjuster Callback", count: 8, severity: "medium" },
      { type: "Missing Documentation", count: 15, severity: "high" },
      { type: "No Weather Chain", count: 5, severity: "medium" },
      { type: "Incomplete Photos", count: 12, severity: "medium" },
      { type: "Poor Coverage Patterns", count: 3, severity: "low" },
    ],
  };

  const data = kpiData || mockData;

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="KPI Intelligence Dashboard"
        subtitle="Executive overview and performance analytics"
        icon={<BarChart3 className="h-5 w-5" />}
        section="command"
      />

      {/* Time Range Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
          <TabsTrigger value="90d">Last 90 Days</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>

        <TabsContent value={timeRange} className="mt-6 space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Avg Cycle Time"
              value={`${data.avgCycleTime} days`}
              trend={-12}
              icon={Clock}
              color="text-blue-500"
            />
            <MetricCard
              title="Approval Ratio"
              value={`${(data.approvalRatio * 100).toFixed(0)}%`}
              trend={5}
              icon={CheckCircle}
              color="text-green-500"
            />
            <MetricCard
              title="Total Revenue"
              value={`$${(data.totalRevenue / 1000000).toFixed(2)}M`}
              trend={23}
              icon={DollarSign}
              color="text-emerald-500"
            />
            <MetricCard
              title="AI Predicted Approval"
              value={`${(data.aiPredictedApproval * 100).toFixed(0)}%`}
              trend={8}
              icon={Zap}
              color="text-purple-500"
            />
          </div>

          {/* Claims Pipeline Chart */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Claims Per Stage
                </h2>
                <Badge variant="outline" className="text-slate-400">
                  {Object.values(data.claimsPerStage).reduce((a, b) => a + b, 0)} Total
                </Badge>
              </div>

              <div className="space-y-3">
                {Object.entries(data.claimsPerStage).map(([stage, count]) => (
                  <div key={stage} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{stage}</span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{
                          width: `${(count / Math.max(...Object.values(data.claimsPerStage))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Supplements & Material Costs */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <Activity className="h-5 w-5 text-orange-500" />
                Supplement Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total Supplements</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {data.supplementCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Supplement Ratio</span>
                  <span className="text-2xl font-bold text-orange-500">
                    {(data.supplementRatio * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="border-t border-slate-200/60 pt-2 dark:border-slate-700/50">
                  <p className="text-xs text-slate-500">
                    {data.supplementRatio < 0.35
                      ? "✅ Within target range"
                      : "⚠️ Above target threshold"}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                <PieChart className="h-5 w-5 text-green-500" />
                Material Insights
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Avg Roof Size</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {data.avgRoofSize.toLocaleString()} sq ft
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Avg Material Cost</span>
                  <span className="text-2xl font-bold text-green-500">
                    ${data.avgMaterialCost.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-slate-200/60 pt-2 dark:border-slate-700/50">
                  <p className="text-xs text-slate-500">
                    Cost per sq ft: ${(data.avgMaterialCost / data.avgRoofSize).toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* AI Risk Levels */}
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Target className="h-5 w-5 text-purple-500" />
              AI Risk Assessment
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-500">
                  {data.aiRiskLevels.low}
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Low Risk</div>
              </div>
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">
                  {data.aiRiskLevels.medium}
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Medium Risk</div>
              </div>
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
                <div className="text-3xl font-bold text-red-600 dark:text-red-500">
                  {data.aiRiskLevels.high}
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">High Risk</div>
              </div>
            </div>
          </Card>

          {/* Red Flags */}
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              AI Red Flag Events
            </h3>
            <div className="space-y-3">
              {data.redFlags.map((flag, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-slate-100/80 p-3 transition-colors hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        flag.severity === "high"
                          ? "bg-red-500"
                          : flag.severity === "medium"
                            ? "bg-yellow-500"
                            : "bg-blue-500"
                      }`}
                    />
                    <span className="text-slate-700 dark:text-slate-300">{flag.type}</span>
                  </div>
                  <Badge variant={flag.severity === "high" ? "destructive" : "secondary"}>
                    {flag.count} claims
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Revenue by Org */}
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Award className="h-5 w-5 text-amber-500" />
              Revenue by Organization
            </h3>
            <div className="space-y-3">
              {Object.entries(data.revenueByOrg).map(([org, revenue]) => (
                <div key={org} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{org}</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      ${(revenue / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                      style={{
                        width: `${(revenue / Math.max(...Object.values(data.revenueByOrg))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  trend: number;
  icon: React.ElementType;
  color: string;
}

function MetricCard({ title, value, trend, icon: Icon, color }: MetricCardProps) {
  const isPositive = trend > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="p-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Icon className={`h-5 w-5 ${color}`} />
          <div
            className={`flex items-center gap-1 text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}
          >
            <TrendIcon className="h-4 w-4" />
            <span>{Math.abs(trend)}%</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </Card>
  );
}
