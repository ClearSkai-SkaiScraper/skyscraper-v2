import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/MetricCard";
import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PerformanceMonitoringPage() {
  const { orgId } = await getCurrentUserPermissions();
  if (!orgId) return <NoOrgMembershipBanner title="Performance Monitoring" />;

  // ── Real data: org-wide activity metrics ─────────────────────────
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalClaims,
    recentClaims,
    completedClaims,
    totalLeads,
    recentLeads,
    teamMembers,
    totalJobs,
  ] = await Promise.all([
    prisma.claims.count({ where: { orgId } }).catch(() => 0),
    prisma.claims.count({ where: { orgId, createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
    prisma.claims
      .count({ where: { orgId, status: { in: ["completed", "closed", "paid"] } } })
      .catch(() => 0),
    prisma.leads.count({ where: { orgId } }).catch(() => 0),
    prisma.leads.count({ where: { orgId, createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
    prisma.tradesCompanyMember
      .count({
        where: { company: { orgId }, isActive: true },
      })
      .catch(() => 0),
    prisma.jobs.count({ where: { orgId } }).catch(() => 0),
  ]);

  // Recent activity: last 10 updated claims
  let recentActivity: any[] = [];
  try {
    recentActivity = await prisma.claims.findMany({
      where: { orgId, updatedAt: { gte: sevenDaysAgo } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        claimNumber: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    });
  } catch {}

  const completionRate = totalClaims > 0 ? Math.round((completedClaims / totalClaims) * 100) : 0;

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">Performance Overview</h1>
        <p className="text-gray-600">Organization metrics and activity summary</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          variant="gradient"
          gradientColor="blue"
          label="Total Claims"
          value={totalClaims}
          icon={<FileText className="h-8 w-8" />}
        />
        <StatCard
          variant="gradient"
          gradientColor="success"
          label="Completion Rate"
          value={`${completionRate}%`}
          icon={<CheckCircle2 className="h-8 w-8" />}
        />
        <StatCard
          variant="gradient"
          gradientColor="purple"
          label="Total Leads"
          value={totalLeads}
          icon={<Users className="h-8 w-8" />}
        />
        <StatCard
          variant="gradient"
          gradientColor="warning"
          label="Team Members"
          value={teamMembers}
          icon={<Users className="h-8 w-8" />}
        />
      </div>

      {/* 30-Day Summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              30-Day Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">New Claims</dt>
                <dd className="font-semibold">{recentClaims}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">New Leads</dt>
                <dd className="font-semibold">{recentLeads}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Total Jobs</dt>
                <dd className="font-semibold">{totalJobs}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Completed Claims</dt>
                <dd className="font-semibold text-green-600">{completedClaims}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              Recent Activity (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-gray-500">No recent activity this week</p>
            ) : (
              <div className="divide-y">
                {recentActivity.map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link
                        href={`/claims/${claim.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {claim.claimNumber || claim.title || "Claim"}
                      </Link>
                      <p className="text-sm text-gray-500">
                        Updated {new Date(claim.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700">
                      {claim.status?.replace(/_/g, " ") || "open"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/analytics"
          className="flex items-center gap-3 rounded-lg border bg-white p-6 shadow transition-shadow hover:shadow-md"
        >
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <div>
            <h3 className="font-semibold">Detailed Analytics</h3>
            <p className="text-sm text-gray-600">Charts, trends & revenue data</p>
          </div>
        </Link>
        <Link
          href="/claims"
          className="flex items-center gap-3 rounded-lg border bg-white p-6 shadow transition-shadow hover:shadow-md"
        >
          <FileText className="h-8 w-8 text-purple-600" />
          <div>
            <h3 className="font-semibold">Claims Pipeline</h3>
            <p className="text-sm text-gray-600">View all claims & statuses</p>
          </div>
        </Link>
        <Link
          href="/leads"
          className="flex items-center gap-3 rounded-lg border bg-white p-6 shadow transition-shadow hover:shadow-md"
        >
          <Activity className="h-8 w-8 text-green-600" />
          <div>
            <h3 className="font-semibold">Lead Management</h3>
            <p className="text-sm text-gray-600">Track & convert new leads</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
