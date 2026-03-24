"use client";

import { useUser } from "@clerk/nextjs";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CloudLightning,
  CloudRain,
  Droplets,
  Flame,
  Loader2,
  MapPin,
  Shield,
  Sparkles,
  TrendingUp,
  Wind,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { markdownBoldToHtml } from "@/lib/sanitize";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface AnalyticsData {
  summary: {
    totalReports: number;
    claimsWithWeather: number;
    avgConfidence: number | null;
    totalEvents: number;
  };
  events: {
    total: number;
    hail: number;
    wind: number;
    tornado: number;
    flood: number;
  };
  perils: Record<string, number>;
  assessments: Record<string, number>;
  monthlyTrend: { month: string; count: number }[];
  topRegions: { region: string; count: number }[];
  recentReports: {
    id: string;
    address: string;
    mode: string;
    peril: string;
    assessment: string;
    confidence: number;
    date: string;
    claimId?: string;
  }[];
}

interface InsightsData {
  hotspots: {
    region: string;
    reports: number;
    topPeril: string | null;
    avgConfidence: number | null;
  }[];
  insights: string[];
  stormActivity: {
    type: string;
    severity: string;
    date: string;
    location: string;
  }[];
  totalReportsAnalyzed: number;
  serviceAreasCovered: number;
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    red: "bg-red-50 text-red-600",
    sky: "bg-sky-50 text-sky-600",
    rose: "bg-rose-50 text-rose-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={`rounded-lg p-3 ${colorMap[color] ?? colorMap.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Peril icon helper                                                  */
/* ------------------------------------------------------------------ */
function PerilIcon({ peril }: { peril: string }) {
  const p = peril.toLowerCase();
  if (p.includes("hail")) return <CloudRain className="h-4 w-4 text-blue-500" />;
  if (p.includes("wind")) return <Wind className="h-4 w-4 text-teal-500" />;
  if (p.includes("tornado")) return <CloudLightning className="h-4 w-4 text-purple-500" />;
  if (p.includes("flood")) return <Droplets className="h-4 w-4 text-cyan-500" />;
  if (p.includes("fire")) return <Flame className="h-4 w-4 text-orange-500" />;
  return <AlertTriangle className="h-4 w-4 text-slate-400" />;
}

/* ------------------------------------------------------------------ */
/*  Assessment badge color                                             */
/* ------------------------------------------------------------------ */
function assessmentColor(a: string) {
  const lower = a.toLowerCase();
  if (lower.includes("strong") || lower.includes("high") || lower.includes("confirmed"))
    return "bg-emerald-100 text-emerald-700";
  if (lower.includes("moderate") || lower.includes("medium") || lower.includes("possible"))
    return "bg-amber-100 text-amber-700";
  if (lower.includes("weak") || lower.includes("low") || lower.includes("unlikely"))
    return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

/* ------------------------------------------------------------------ */
/*  Mini bar chart (CSS-only)                                          */
/* ------------------------------------------------------------------ */
function MiniBarChart({
  data,
  label,
  barColor = "bg-sky-500",
}: {
  data: { label: string; value: number }[];
  label: string;
  barColor?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-700">{label}</p>
      <div className="flex items-end gap-2" style={{ height: 140 }}>
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-slate-500">{d.value}</span>
            <div
              className={`w-full rounded-t-md ${barColor} transition-all`}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: 4 }}
            />
            <span className="text-[10px] text-slate-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Horizontal bar for breakdowns                                      */
/* ------------------------------------------------------------------ */
function HorizontalBar({
  items,
  colorFn,
}: {
  items: { label: string; value: number }[];
  colorFn?: (label: string) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const defaultColor = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("hail")) return "bg-blue-500";
    if (l.includes("wind")) return "bg-teal-500";
    if (l.includes("tornado")) return "bg-purple-500";
    if (l.includes("flood")) return "bg-cyan-500";
    if (l.includes("fire")) return "bg-orange-500";
    return "bg-sky-500";
  };
  const getColor = colorFn || defaultColor;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PerilIcon peril={item.label} />
              <span className="text-sm font-medium capitalize text-slate-700">{item.label}</span>
            </div>
            <span className="text-sm font-bold text-slate-900">{item.value}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full ${getColor(item.label)} transition-all`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function WeatherAnalyticsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/weather/analytics")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const generateInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/weather/analytics/insights", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      setInsights(result);
    } catch (e) {
      logger.error("Failed to generate insights:", e);
    } finally {
      setInsightsLoading(false);
    }
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <PageContainer>
        <PageHero
          section="claims"
          title="Weather Analytics"
          subtitle="Aggregated weather intelligence from your reports and DOL data"
        />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">Loading analytics…</p>
        </div>
      </PageContainer>
    );
  }

  /* ── Error state ── */
  if (error || !data) {
    return (
      <PageContainer>
        <PageHero
          section="claims"
          title="Weather Analytics"
          subtitle="Aggregated weather intelligence from your reports and DOL data"
        />
        <PageSectionCard>
          <div className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="mb-3 h-10 w-10 text-amber-400" />
            <p className="text-slate-600">
              {error || "Could not load analytics. Try again later."}
            </p>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }

  /* ── Empty state ── */
  if (data.summary.totalReports === 0) {
    return (
      <PageContainer>
        <PageHero
          section="claims"
          title="Weather Analytics"
          subtitle="Aggregated weather intelligence from your reports and DOL data"
        />
        <PageSectionCard>
          <div className="flex flex-col items-center py-16 text-center">
            <CloudRain className="mb-4 h-14 w-14 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-700">No weather data yet</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Run a{" "}
              <Link href="/quick-dol" className="font-medium text-sky-600 underline">
                Quick DOL
              </Link>{" "}
              or a{" "}
              <Link href="/reports/weather" className="font-medium text-sky-600 underline">
                Weather Report
              </Link>{" "}
              to generate weather intelligence for your claims and service area.
            </p>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }

  /* ── Prep chart data ── */
  const perilItems = Object.entries(data.perils)
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({ label, value }));

  const monthlyData = data.monthlyTrend.map((t) => ({
    label: t.month.slice(5), // "MM" from "YYYY-MM"
    value: t.count,
  }));

  const eventBreakdown = [
    { label: "Hail", value: data.events.hail },
    { label: "Wind", value: data.events.wind },
    { label: "Tornado", value: data.events.tornado },
    { label: "Flood", value: data.events.flood },
  ].filter((e) => e.value > 0);

  const assessmentItems = Object.entries(data.assessments)
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({ label, value }));

  /* ── Render ── */
  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="Weather Analytics"
        subtitle="AI-powered weather intelligence from your DOL pulls, claims reports, and service area data"
      />

      {/* ── Top Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Weather Reports"
          value={data.summary.totalReports}
          sub="Total generated"
          icon={BarChart3}
          color="blue"
        />
        <StatCard
          label="Claims w/ Weather"
          value={data.summary.claimsWithWeather}
          sub="Verified with weather data"
          icon={Shield}
          color="emerald"
        />
        <StatCard
          label="Avg Confidence"
          value={data.summary.avgConfidence != null ? `${data.summary.avgConfidence}%` : "N/A"}
          sub="Across all reports"
          icon={TrendingUp}
          color="violet"
        />
        <StatCard
          label="Weather Events"
          value={data.summary.totalEvents}
          sub="Tracked in database"
          icon={Zap}
          color="amber"
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Peril Breakdown */}
        <PageSectionCard>
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
            <CloudLightning className="h-5 w-5 text-purple-500" />
            Peril Breakdown
          </h3>
          {perilItems.length > 0 ? (
            <HorizontalBar items={perilItems} />
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">No peril data yet</p>
          )}
        </PageSectionCard>

        {/* Monthly Trend */}
        <PageSectionCard>
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
            <TrendingUp className="h-5 w-5 text-sky-500" />
            Monthly Report Volume
          </h3>
          {monthlyData.length > 0 ? (
            <MiniBarChart data={monthlyData} label="" barColor="bg-sky-500" />
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">Not enough data yet</p>
          )}
        </PageSectionCard>
      </div>

      {/* ── Events & Regions Row ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Storm Event Types */}
        <PageSectionCard>
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
            <CloudRain className="h-5 w-5 text-blue-500" />
            Storm Event Types
          </h3>
          {eventBreakdown.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {eventBreakdown.map((e) => (
                <div
                  key={e.label}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <PerilIcon peril={e.label} />
                  <div>
                    <p className="text-xs text-slate-500">{e.label}</p>
                    <p className="text-lg font-bold text-slate-800">{e.value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">No storm events recorded</p>
          )}
        </PageSectionCard>

        {/* Top Impacted Regions */}
        <PageSectionCard>
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
            <MapPin className="h-5 w-5 text-rose-500" />
            Most Impacted Areas
          </h3>
          {data.topRegions.length > 0 ? (
            <div className="space-y-2">
              {data.topRegions.map((r, i) => (
                <div
                  key={r.region}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{r.region}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {r.count} report{r.count !== 1 ? "s" : ""}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">No region data available</p>
          )}
        </PageSectionCard>
      </div>

      {/* ── Assessment Breakdown ── */}
      {assessmentItems.length > 0 && (
        <div className="mt-6">
          <PageSectionCard>
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
              <Shield className="h-5 w-5 text-emerald-500" />
              Verification Assessments
            </h3>
            <div className="flex flex-wrap gap-3">
              {assessmentItems.map((a) => (
                <div
                  key={a.label}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${assessmentColor(a.label)}`}
                >
                  {a.label}
                  <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold">
                    {a.value}
                  </span>
                </div>
              ))}
            </div>
          </PageSectionCard>
        </div>
      )}

      {/* ── Recent Reports Feed ── */}
      <div className="mt-6">
        <PageSectionCard>
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Recent Weather Reports
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase text-slate-400">
                  <th className="py-2 pr-4">Address</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Peril</th>
                  <th className="py-2 pr-4">Assessment</th>
                  <th className="py-2 pr-4">Confidence</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentReports.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="max-w-[200px] truncate py-2.5 pr-4 font-medium text-slate-700">
                      {r.address || "—"}
                    </td>
                    <td className="py-2.5 pr-4 capitalize text-slate-500">{r.mode || "—"}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1.5">
                        <PerilIcon peril={r.peril || ""} />
                        <span className="capitalize text-slate-600">{r.peril || "—"}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      {r.assessment ? (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${assessmentColor(r.assessment)}`}
                        >
                          {r.assessment}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {r.confidence != null ? (
                        <span className="font-medium text-slate-700">{r.confidence}%</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-slate-500">
                      {r.date ? new Date(r.date).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageSectionCard>
      </div>

      {/* ── Quick Action Links ── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link
          href="/quick-dol"
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-sky-300 hover:shadow-md"
        >
          <div className="rounded-lg bg-blue-50 p-3 transition-colors group-hover:bg-blue-100">
            <Zap className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Quick DOL</p>
            <p className="text-xs text-slate-500">Run a date-of-loss weather lookup</p>
          </div>
        </Link>
        <Link
          href="/reports/weather"
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
        >
          <div className="rounded-lg bg-emerald-50 p-3 transition-colors group-hover:bg-emerald-100">
            <CloudRain className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Weather Report</p>
            <p className="text-xs text-slate-500">Generate carrier-grade weather verification</p>
          </div>
        </Link>
        <Link
          href="/claims-ready-folder"
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-violet-300 hover:shadow-md"
        >
          <div className="rounded-lg bg-violet-50 p-3 transition-colors group-hover:bg-violet-100">
            <Shield className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Claims Assembly</p>
            <p className="text-xs text-slate-500">Assemble carrier-compliant packets</p>
          </div>
        </Link>
      </div>

      {/* ── AI Service Area Intelligence ── */}
      <div className="mt-8">
        <PageSectionCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <BrainCircuit className="h-5 w-5 text-purple-500" />
              AI Service Area Intelligence
            </h3>
            <Button
              onClick={generateInsights}
              disabled={insightsLoading}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {insightsLoading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {insights ? "Refresh Insights" : "Generate Insights"}
                </>
              )}
            </Button>
          </div>

          {!insights && !insightsLoading && (
            <div className="flex flex-col items-center py-10 text-center">
              <BrainCircuit className="mb-3 h-12 w-12 text-slate-300" />
              <h4 className="font-medium text-slate-700">AI-Powered Weather Intelligence</h4>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Analyze your weather reports, DOL pulls, and claims data to uncover the
                highest-impact areas in your service region with actionable insights.
              </p>
            </div>
          )}

          {insights && (
            <div className="space-y-6">
              {/* Stats Row */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-purple-100 bg-purple-50 p-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {insights.totalReportsAnalyzed}
                  </p>
                  <p className="text-xs text-purple-600">Reports Analyzed</p>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-center">
                  <p className="text-2xl font-bold text-indigo-700">
                    {insights.serviceAreasCovered}
                  </p>
                  <p className="text-xs text-indigo-600">Service Areas</p>
                </div>
                <div className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-center">
                  <p className="text-2xl font-bold text-sky-700">
                    {insights.stormActivity?.length || 0}
                  </p>
                  <p className="text-xs text-sky-600">Recent Storm Events</p>
                </div>
              </div>

              {/* AI Insights */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Key Insights
                </h4>
                <div className="space-y-2">
                  {insights.insights.map((insight, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                      dangerouslySetInnerHTML={{
                        __html: markdownBoldToHtml(insight),
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Hotspots */}
              {insights.hotspots.length > 0 && (
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    Service Area Hotspots
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {insights.hotspots.map((hs, i) => (
                      <div
                        key={hs.region}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-700">{hs.region}</p>
                            <p className="text-xs text-slate-400">
                              {hs.reports} reports · {hs.topPeril || "Mixed perils"}
                            </p>
                          </div>
                        </div>
                        {hs.avgConfidence && (
                          <Badge variant="secondary" className="text-xs">
                            {hs.avgConfidence}% conf
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Storm Activity */}
              {insights.stormActivity && insights.stormActivity.length > 0 && (
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CloudLightning className="h-4 w-4 text-amber-500" />
                    Recent Storm Activity (90 days)
                  </h4>
                  <div className="space-y-2">
                    {insights.stormActivity.map((storm, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-amber-50 bg-amber-50/50 px-4 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <PerilIcon peril={storm.type || ""} />
                          <div>
                            <p className="text-sm font-medium capitalize text-slate-700">
                              {storm.type?.replace(/_/g, " ") || "Weather Event"}
                            </p>
                            <p className="text-xs text-slate-400">{storm.location || "—"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {storm.severity && (
                            <Badge variant="outline" className="mb-0.5 text-xs">
                              {storm.severity}
                            </Badge>
                          )}
                          <p className="text-xs text-slate-400">
                            {storm.date ? new Date(storm.date).toLocaleDateString() : "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-right text-xs text-slate-400">
                Generated {new Date(insights.generatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </PageSectionCard>
      </div>
    </PageContainer>
  );
}
