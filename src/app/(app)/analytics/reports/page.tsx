/**
 * Reports Analytics Dashboard
 * Tracks report generation, types, and usage metrics with real data.
 */

import {
  BarChart3,
  FileBarChart,
  FileCheck,
  FileText,
  History,
  Link as LinkIcon,
  PieChart,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Report Analytics | SkaiScraper",
  description: "Track report generation metrics, types, and usage analytics.",
};

/* ------------------------------------------------------------------ */
/*  Stat card component (Reports Hub style)                           */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
    blue: { bg: "from-blue-50 to-indigo-50", icon: "text-blue-600", border: "border-blue-200" },
    emerald: {
      bg: "from-emerald-50 to-teal-50",
      icon: "text-emerald-600",
      border: "border-emerald-200",
    },
    violet: {
      bg: "from-violet-50 to-purple-50",
      icon: "text-violet-600",
      border: "border-violet-200",
    },
    amber: { bg: "from-amber-50 to-orange-50", icon: "text-amber-600", border: "border-amber-200" },
    rose: { bg: "from-rose-50 to-pink-50", icon: "text-rose-600", border: "border-rose-200" },
  };
  const c = colorMap[color] ?? colorMap.blue;
  return (
    <div
      className={`rounded-xl border ${c.border} bg-gradient-to-br ${c.bg} p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 shadow-sm dark:bg-slate-700`}
        >
          <Icon className={`h-6 w-6 ${c.icon}`} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {subtext && <p className="text-xs text-slate-500 dark:text-slate-400">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Report Type Card                                                  */
/* ------------------------------------------------------------------ */
function ReportTypeCard({
  title,
  count,
  description,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  count: number;
  description: string;
  icon: React.ElementType;
  color: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-md`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white">
              {title}
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              {count}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all group-hover:w-full" />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default async function ReportAnalyticsPage() {
  const orgCtx = await safeOrgContext();
  if (orgCtx.status === "unauthenticated") redirect("/sign-in");

  const orgId = orgCtx.orgId;
  if (!orgId) {
    return (
      <PageContainer>
        <PageHero
          title="Report Analytics"
          subtitle="Connect your organization to see report analytics"
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </PageContainer>
    );
  }

  // Fetch report counts by type from the reports model
  const [
    totalReports,
    claimPackets,
    supplementReports,
    weatherReports,
    videoReports,
    recentReports,
    reportsLast30Days,
    reportsLast7Days,
  ] = await Promise.all([
    // Total reports
    prisma.reports.count({ where: { orgId } }).catch(() => 0),
    // Claim packets (damage_assessment type)
    prisma.reports
      .count({
        where: { orgId, type: { in: ["CLAIM_PACKET", "DAMAGE_ASSESSMENT", "INSURANCE_CLAIM"] } },
      })
      .catch(() => 0),
    // Supplement reports
    prisma.supplementReport.count({ where: { orgId } }).catch(() => 0),
    // Weather reports (count through leads relation since weather_reports doesn't have orgId)
    prisma.weather_reports.count({ where: { leads: { orgId } } }).catch(() => 0),
    // Video reports
    prisma.videoReport.count({ where: { orgId } }).catch(() => 0),
    // Recent reports (last 10)
    prisma.reports
      .findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          type: true,
          createdAt: true,
          pdfUrl: true,
          claims: { select: { claimNumber: true, title: true } },
          leads: { select: { title: true } },
        },
      })
      .catch(() => []),
    // Last 30 days
    prisma.reports
      .count({
        where: { orgId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      })
      .catch(() => 0),
    // Last 7 days
    prisma.reports
      .count({
        where: { orgId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      })
      .catch(() => 0),
  ]);

  // Get AI reports count
  const aiReports = await prisma.ai_reports.count({ where: { orgId } }).catch(() => 0);

  const reportTypes = [
    {
      title: "Claim Packets",
      count: claimPackets,
      description: "Insurance claim documentation packages with damage analysis and evidence.",
      icon: FileCheck,
      color: "from-blue-500 to-blue-600",
      href: "/claims-ready-folder",
    },
    {
      title: "Supplement Reports",
      count: supplementReports,
      description: "Line-item supplements with justifications for additional claim coverage.",
      icon: FileText,
      color: "from-cyan-500 to-cyan-600",
      href: "/ai/tools/supplement",
    },
    {
      title: "Weather Reports",
      count: weatherReports,
      description: "Certified weather verification tied to storm events and loss dates.",
      icon: BarChart3,
      color: "from-sky-500 to-sky-600",
      href: "/reports/weather",
    },
    {
      title: "Video Reports",
      count: videoReports,
      description: "AI-generated video walk-throughs and property documentation.",
      icon: Video,
      color: "from-violet-500 to-violet-600",
      href: "/ai-video-reports",
    },
    {
      title: "AI Reports",
      count: aiReports,
      description: "AI-powered analysis reports including bad faith and claims analysis.",
      icon: Sparkles,
      color: "from-amber-500 to-amber-600",
      href: "/ai/bad-faith",
    },
  ];

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="reports"
        title="Report Analytics"
        subtitle="Track report generation, types, and usage metrics across your organization"
        icon={<FileBarChart className="h-6 w-6" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-white text-blue-600 hover:bg-blue-50">
            <Link href="/reports/hub">
              <FileText className="mr-2 h-4 w-4" />
              Reports Hub
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/claims-ready-folder">
              <FileCheck className="mr-2 h-4 w-4" />
              New Claim Packet
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* Overview Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Reports"
          value={totalReports}
          subtext="All-time generated"
          icon={FileBarChart}
          color="blue"
        />
        <StatCard
          label="Last 30 Days"
          value={reportsLast30Days}
          subtext={`${reportsLast7Days} in last 7 days`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          label="Claim Packets"
          value={claimPackets}
          subtext="Insurance documentation"
          icon={FileCheck}
          color="violet"
        />
        <StatCard
          label="Weather Reports"
          value={weatherReports}
          subtext="Certified verifications"
          icon={BarChart3}
          color="amber"
        />
      </div>

      {/* Reports by Type */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <PieChart className="h-5 w-5 text-blue-600" />
          Reports by Type
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((rt) => (
            <ReportTypeCard key={rt.title} {...rt} />
          ))}
        </div>
      </div>

      {/* Recent Reports */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <History className="h-5 w-5 text-blue-600" />
          Recent Reports
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          {recentReports.length === 0 ? (
            <div className="py-12 text-center">
              <FileBarChart className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                No Reports Yet
              </h3>
              <p className="mb-4 text-sm text-slate-500">
                Generate your first report to start tracking analytics.
              </p>
              <Button asChild>
                <Link href="/reports/hub">Go to Reports Hub</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900 dark:text-white">
                      {report.title}
                    </p>
                    <p className="text-sm text-slate-500">
                      {report.claims?.claimNumber ||
                        report.claims?.title ||
                        report.leads?.title ||
                        "—"}{" "}
                      • {formatReportType(report.type)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                    {report.pdfUrl && (
                      <a
                        href={report.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                      >
                        <LinkIcon className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function formatReportType(type: string | null): string {
  if (!type) return "Report";
  const types: Record<string, string> = {
    CLAIM_PACKET: "Claim Packet",
    INSURANCE_CLAIM: "Insurance Claim",
    DAMAGE_ASSESSMENT: "Damage Assessment",
    RETAIL_PROPOSAL: "Retail Proposal",
    SUPPLEMENT: "Supplement",
    DEPRECIATION: "Depreciation",
    ESTIMATE: "Estimate",
    WEATHER: "Weather Report",
    VIDEO: "Video Report",
  };
  return types[type] || type;
}
