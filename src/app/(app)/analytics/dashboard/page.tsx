import {
  ArrowRight,
  BarChart3,
  DollarSign,
  FileBarChart,
  FileText,
  Plus,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AnalyticsDashboard } from "@/components/claimiq/AnalyticsDashboard";
import KPIDashboardClient from "@/components/kpi-dashboard/KPIDashboardClient";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";
import { groupByWorkflowStatus, WORKFLOW_STATUSES } from "@/lib/statusMapping";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------------------------------------------ */
/*  StatCard (Reports Hub style)                                       */
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
/*  QuickLink (Gradient button style)                                  */
/* ------------------------------------------------------------------ */
function QuickLink({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
    violet: "from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700",
    emerald: "from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700",
    amber: "from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700",
  };
  return (
    <Link href={href}>
      <div
        className={`flex flex-col items-center gap-3 rounded-xl bg-gradient-to-br ${colorMap[color] ?? colorMap.blue} p-5 text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg`}
      >
        <Icon className="h-8 w-8" />
        <span className="font-semibold">{label}</span>
      </div>
    </Link>
  );
}

/**
 * OPTIMIZED ANALYTICS DASHBOARD - Server-side rendered for speed
 */
export default async function AnalyticsDashboardPage() {
  // Get org - redirect if not authenticated
  const orgResult = await getOrg({ mode: "required" });
  if (!orgResult.ok) {
    redirect("/sign-in");
  }

  const organizationId = orgResult.orgId;

  // Fetch all data in parallel - FAST!
  const [leads, claims, retailJobs, recentLeads, recentClaims] = await Promise.all([
    prisma.leads.findMany({
      where: { orgId: organizationId },
      select: { id: true, stage: true, value: true, createdAt: true, jobCategory: true },
    }),
    prisma.claims.findMany({
      where: { orgId: organizationId },
      select: { id: true, status: true, estimatedValue: true, createdAt: true },
    }),
    prisma.leads.findMany({
      where: {
        orgId: organizationId,
        jobCategory: { in: ["out_of_pocket", "financed", "repair"] },
      },
      select: { id: true, value: true },
    }),
    prisma.leads.findMany({
      where: {
        orgId: organizationId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    }),
    prisma.claims.findMany({
      where: {
        orgId: organizationId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    }),
  ]);

  // Calculate metrics
  const totalLeads = leads.length;
  const activeLeads = leads.filter((l) => l.stage !== "closed" && l.stage !== "lost").length;
  const totalClaims = claims.length;
  const totalRetailJobs = retailJobs.length;
  const retailValue = retailJobs.reduce((sum, j) => sum + (j.value || 0), 0);
  const leadsValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);
  const claimsValue = claims.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
  const conversionRate = totalLeads > 0 ? (totalClaims / totalLeads) * 100 : 0;
  const newLeadsLast30Days = recentLeads.length;
  const newClaimsLast30Days = recentClaims.length;

  // Claims by status — mapped to canonical 4-bucket system
  const rawClaimsByStatus = claims.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const claimsByWorkflow = groupByWorkflowStatus(rawClaimsByStatus);

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="reports"
        title="Analytics Dashboard"
        subtitle="Track performance metrics, pipeline health, and conversion rates"
        icon={<BarChart3 className="h-6 w-6" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-white text-blue-600 hover:bg-blue-50">
            <Link href="/analytics/reports">
              <FileBarChart className="mr-2 h-4 w-4" />
              AI Reports Hub
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/analytics/performance">
              <TrendingUp className="mr-2 h-4 w-4" />
              Performance
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* Performance Overview */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Performance Overview
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Leads"
            value={totalLeads}
            subtext={`${newLeadsLast30Days} new (30d)`}
            icon={Users}
            color="blue"
          />
          <StatCard
            label="Total Claims"
            value={totalClaims}
            subtext={`${newClaimsLast30Days} new (30d)`}
            icon={FileText}
            color="violet"
          />
          <StatCard
            label="Conversion Rate"
            value={`${conversionRate.toFixed(1)}%`}
            subtext="Leads → Claims"
            icon={TrendingUp}
            color="emerald"
          />
          <StatCard
            label="Active Leads"
            value={activeLeads}
            subtext={`${totalLeads > 0 ? ((activeLeads / totalLeads) * 100).toFixed(0) : 0}% of total`}
            icon={Users}
            color="amber"
          />
          <StatCard
            label="Retail Jobs"
            value={totalRetailJobs}
            subtext={`$${(retailValue / 100).toLocaleString()} value`}
            icon={DollarSign}
            color="rose"
          />
        </div>
      </div>

      {/* Key Insights */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <BarChart3 className="h-5 w-5 text-violet-600" />
          Key Insights
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Pipeline Value */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300">Pipeline Value</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              ${((leadsValue + claimsValue) / 100).toLocaleString()}
            </p>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="mr-3">Leads: ${(leadsValue / 100).toLocaleString()}</span>
              <span>Claims: ${(claimsValue / 100).toLocaleString()}</span>
            </div>
          </div>

          {/* Claims Status */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300">Claims Status</span>
            </div>
            <div className="space-y-2">
              {WORKFLOW_STATUSES.map((ws) => {
                const count = claimsByWorkflow[ws.value] || 0;
                return (
                  <div key={ws.value} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span className={`inline-block h-2 w-2 rounded-full ${ws.dotColor}`} />
                      {ws.emoji} {ws.label}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300">Quick Actions</span>
            </div>
            <div className="space-y-2">
              <Link
                href="/leads/new"
                className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
              >
                <span>New Lead</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/claims/new"
                className="flex items-center justify-between rounded-lg bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50"
              >
                <span>New Claim</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/jobs/retail/new"
                className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
              >
                <span>New Retail Job</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ClaimIQ Readiness Analytics */}
      <AnalyticsDashboard className="mb-8" />

      {/* Detailed KPIs — Time-Filtered */}
      <div className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          Detailed KPIs
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <KPIDashboardClient embedded />
        </div>
      </div>

      {/* Quick Navigation */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <ArrowRight className="h-5 w-5 text-emerald-600" />
          Quick Navigation
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <QuickLink href="/pipeline" icon={TrendingUp} label="Pipeline" color="blue" />
          <QuickLink href="/claims" icon={FileText} label="Claims" color="violet" />
          <QuickLink
            href="/analytics/reports"
            icon={BarChart3}
            label="AI Reports"
            color="emerald"
          />
          <QuickLink href="/settings" icon={Settings} label="Settings" color="amber" />
        </div>
      </div>
    </PageContainer>
  );
}
