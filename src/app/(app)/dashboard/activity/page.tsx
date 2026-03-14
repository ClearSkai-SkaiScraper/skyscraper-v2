/**
 * Team Activity Dashboard
 * Real-time feed of recent actions across claims, leads, reports, and inspections.
 */

import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  FileBarChart,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------------------------------------------ */
/*  Stat Card (Reports Hub style)                                      */
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
  };
  const c = colorMap[color] ?? colorMap.blue;
  return (
    <div
      className={`rounded-xl border ${c.border} bg-gradient-to-br ${c.bg} p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 shadow-sm dark:bg-slate-700">
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
/*  Activity Item                                                      */
/* ------------------------------------------------------------------ */
function ActivityItem({
  icon: Icon,
  title,
  timestamp,
  color,
  href,
}: {
  icon: React.ElementType;
  title: string;
  timestamp: string;
  color: string;
  href?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    violet: "from-violet-500 to-violet-600",
    amber: "from-amber-500 to-amber-600",
  };
  const content = (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colorMap[color] ?? colorMap.blue} shadow-md`}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900 dark:text-white">{title}</p>
        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{timestamp}</span>
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default async function ActivityPage() {
  const orgCtx = await getOrg({ mode: "required" });
  if (!orgCtx.ok) throw new Error("Unreachable: mode required should redirect");
  const orgId = orgCtx.orgId;

  let recentClaims: any[] = [];
  let recentLeads: any[] = [];
  let recentReports: any[] = [];
  let recentInspections: any[] = [];

  try {
    [recentClaims, recentLeads, recentReports, recentInspections] = await Promise.all([
      prisma.claims.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, claimNumber: true, status: true, createdAt: true, damageType: true },
      }),
      prisma.leads.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, stage: true, createdAt: true, title: true },
      }),
      prisma.ai_reports.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, type: true, createdAt: true, status: true },
      }),
      prisma.inspections.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, type: true, createdAt: true, status: true },
      }),
    ]);
  } catch (err: any) {
    return (
      <PageContainer>
        <PageHero
          section="command"
          title="Team Activity"
          subtitle="Error loading activity feed"
          icon={<Activity className="h-6 w-6" />}
        />
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950/30">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">
            Activity Feed Error
          </h2>
          <p className="text-sm text-red-600 dark:text-red-300">
            {err?.message?.includes("Unknown field")
              ? "Schema mismatch detected — feed temporarily unavailable."
              : "Failed to load recent activity."}
          </p>
        </div>
      </PageContainer>
    );
  }

  function formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  type ActivityItemData = {
    id: string;
    title: string;
    timestamp: string;
    icon: React.ElementType;
    color: string;
    href?: string;
    createdAt: Date;
  };

  const activities: ActivityItemData[] = [];

  recentClaims.forEach((claim) => {
    activities.push({
      id: `claim-${claim.id}`,
      title: `Claim ${claim.claimNumber || "#" + claim.id.slice(0, 8)} — ${claim.damageType || claim.status}`,
      timestamp: formatTimestamp(claim.createdAt),
      icon: FileText,
      color: "blue",
      href: `/claims/${claim.id}`,
      createdAt: claim.createdAt,
    });
  });

  recentLeads.forEach((lead) => {
    activities.push({
      id: `lead-${lead.id}`,
      title: `Lead ${lead.title || "updated"} — Stage: ${lead.stage}`,
      timestamp: formatTimestamp(lead.createdAt),
      icon: Users,
      color: "emerald",
      href: `/leads/${lead.id}`,
      createdAt: lead.createdAt,
    });
  });

  recentReports.forEach((report) => {
    activities.push({
      id: `report-${report.id}`,
      title: `${report.type || "AI"} Report Generated — ${report.status}`,
      timestamp: formatTimestamp(report.createdAt),
      icon: FileBarChart,
      color: "violet",
      createdAt: report.createdAt,
    });
  });

  recentInspections.forEach((inspection) => {
    activities.push({
      id: `inspection-${inspection.id}`,
      title: `${inspection.type || "Property"} Inspection — ${inspection.status}`,
      timestamp: formatTimestamp(inspection.createdAt),
      icon: CheckCircle,
      color: "amber",
      createdAt: inspection.createdAt,
    });
  });

  activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const displayActivities = activities.slice(0, 20);

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="command"
        title="Team Activity"
        subtitle="Real-time feed of your team's latest actions across claims, leads, and reports"
        icon={<Activity className="h-6 w-6" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-white text-blue-600 hover:bg-blue-50">
            <Link href="/dashboard">
              <TrendingUp className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/analytics/dashboard">
              <FileBarChart className="mr-2 h-4 w-4" />
              Analytics Dashboard
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* Stats Overview */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Recent Claims"
          value={recentClaims.length}
          subtext="Last 10 activities"
          icon={FileText}
          color="blue"
        />
        <StatCard
          label="Recent Leads"
          value={recentLeads.length}
          subtext="Last 10 activities"
          icon={Users}
          color="emerald"
        />
        <StatCard
          label="Reports Generated"
          value={recentReports.length}
          subtext="Last 10 activities"
          icon={FileBarChart}
          color="violet"
        />
        <StatCard
          label="Inspections"
          value={recentInspections.length}
          subtext="Last 10 activities"
          icon={CheckCircle}
          color="amber"
        />
      </div>

      {/* Activity Feed */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Calendar className="h-5 w-5 text-blue-600" />
          Recent Activity
        </h2>
        <div className="space-y-3">
          {displayActivities.length > 0 ? (
            displayActivities.map((activity) => (
              <ActivityItem
                key={activity.id}
                icon={activity.icon}
                title={activity.title}
                timestamp={activity.timestamp}
                color={activity.color}
                href={activity.href}
              />
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-800">
              <Activity className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                No Recent Activity
              </h3>
              <p className="mb-4 text-sm text-slate-500">
                Activity will appear here as your team creates claims, leads, and reports.
              </p>
              <Button asChild>
                <Link href="/leads/new">Create Your First Lead</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
