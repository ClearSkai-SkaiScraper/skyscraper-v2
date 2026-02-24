import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import { guarded } from "@/lib/buildPhase";
import { getDelegate } from "@/lib/db/modelAliases";
import { getCurrentUserPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportAnalyticsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { orgId } = await getCurrentUserPermissions();
  if (!orgId) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <PageHero title="Report Analytics" subtitle="Connect your organization to see analytics" />
      </div>
    );
  }

  // Get report statistics
  const [totalReports, totalViews, recentReports, topReports] = await guarded(
    "reports-analytics-primary",
    () =>
      Promise.all([
        getDelegate("reportRecord").count({ where: { orgId } }),
        getDelegate("reportRecord").aggregate({ where: { orgId }, _sum: { viewCount: true } }),
        getDelegate("reportRecord").findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            fileName: true,
            reportType: true,
            createdAt: true,
            viewCount: true,
            lastViewedAt: true,
            shareToken: true,
            claim: { select: { claimNumber: true, propertyAddress: true } },
          },
        }),
        getDelegate("reportRecord").findMany({
          where: { orgId, viewCount: { gt: 0 } },
          orderBy: { viewCount: "desc" },
          take: 5,
          select: {
            id: true,
            fileName: true,
            reportType: true,
            viewCount: true,
            lastViewedAt: true,
            claim: { select: { claimNumber: true, propertyAddress: true } },
          },
        }),
      ]),
    [0, { _sum: { viewCount: 0 } }, [], []]
  );

  // Reports by type
  const reportsByType = await guarded(
    "reports-analytics-by-type",
    () =>
      getDelegate("reportRecord").groupBy({
        by: ["reportType"],
        where: { orgId },
        _count: { id: true },
      }),
    [] as any[]
  );

  // Reports over time (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const _reportsOverTime = await guarded(
    "reports-analytics-over-time",
    () =>
      getDelegate("reportRecord").groupBy({
        by: ["createdAt"],
        where: { orgId, createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }),
    [] as any[]
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHero
        title="Report Analytics"
        subtitle="Track report generation and engagement metrics"
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Total Reports" value={totalReports} icon="📄" />
        <StatCard label="Total Views" value={totalViews._sum.viewCount || 0} icon="👁️" />
        <StatCard
          label="Shared Reports"
          value={recentReports.filter((r) => r.shareToken).length}
          icon="🔗"
        />
        <StatCard
          label="Avg. Views/Report"
          value={totalReports > 0 ? Math.round((totalViews._sum.viewCount || 0) / totalReports) : 0}
          icon="📊"
        />
      </div>

      {/* Reports by Type */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Reports by Type</h2>
        <div className="space-y-2">
          {reportsByType.map((type) => (
            <div key={type.reportType} className="flex items-center justify-between">
              <span className="text-sm">{formatReportType(type.reportType)}</span>
              <span className="text-sm font-medium">{type._count.id}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Viewed Reports */}
      {topReports.length > 0 && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-semibold">Most Viewed Reports</h2>
          <div className="space-y-2">
            {topReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded p-2 hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{report.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {report.claim?.claimNumber || report.claim?.propertyAddress}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{report.viewCount} views</p>
                  {report.lastViewedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last: {new Date(report.lastViewedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reports */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Recent Reports</h2>
        <div className="space-y-2">
          {recentReports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between rounded p-2 hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{report.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {report.claim?.claimNumber || report.claim?.propertyAddress} •{" "}
                  {formatReportType(report.reportType)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {new Date(report.createdAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {report.viewCount} views
                  {report.shareToken && " • Shared"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function formatReportType(type: string): string {
  const types: Record<string, string> = {
    INSURANCE_CLAIM: "Insurance Claim",
    RETAIL_PROPOSAL: "Retail Proposal",
    SUPPLEMENT: "Supplement",
    DEPRECIATION: "Depreciation",
    ESTIMATE: "Estimate",
  };
  return types[type] || type;
}
