import { BarChart3, Download, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageHero } from "@/components/layout/PageHero";
import CustomReportBuilder from "@/components/reports/CustomReportBuilder";
import DataExportPanel from "@/components/reports/DataExportPanel";
import { getTenant } from "@/lib/auth/tenant";

export const dynamic = "force-dynamic";

export default async function AdvancedAnalyticsPage() {
  const orgId = await getTenant();
  if (!orgId) {
    return <NoOrgMembershipBanner title="Advanced Analytics" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHero
        section="reports"
        title="Advanced Analytics"
        subtitle="Create custom reports, export data, and build powerful dashboards"
        icon={<BarChart3 className="h-5 w-5" />}
      >
        <Link
          href="/reports/history"
          className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
        >
          Report History
        </Link>
      </PageHero>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-sky-50 to-blue-50 p-6 dark:from-sky-950/30 dark:to-blue-950/30">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-[color:var(--text)]">Custom Reports</h3>
          </div>
          <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
            Build reports with custom fields and visualizations
          </p>
          <div className="text-2xl font-bold text-[color:var(--text)]">0</div>
          <p className="text-xs text-slate-700 dark:text-slate-300">Saved reports</p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-green-50 to-teal-50 p-6 dark:from-green-950/30 dark:to-teal-950/30">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
              <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-[color:var(--text)]">Data Exports</h3>
          </div>
          <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
            Export to CSV, Excel, or JSON formats
          </p>
          <div className="text-2xl font-bold text-[color:var(--text)]">∞</div>
          <p className="text-xs text-slate-700 dark:text-slate-300">Unlimited exports</p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-orange-50 to-red-50 p-6 dark:from-orange-950/30 dark:to-red-950/30">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
              <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-[color:var(--text)]">AI Insights</h3>
          </div>
          <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
            Get AI-powered recommendations and trends
          </p>
          <div className="text-2xl font-bold text-[color:var(--text)]">✨</div>
          <p className="text-xs text-slate-700 dark:text-slate-300">Coming soon</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Custom Report Builder */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-[color:var(--text)]">Report Builder</h2>
          <CustomReportBuilder />
        </div>

        {/* Data Export */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-[color:var(--text)]">Export Data</h2>
          <DataExportPanel />
        </div>
      </div>

      {/* Analytics Dashboard Link */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-blue-50 to-purple-50 p-6 dark:from-blue-950/30 dark:to-purple-950/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-[color:var(--text)]">
              <TrendingUp className="h-5 w-5" />
              Standard Analytics Dashboard
            </h3>
            <p className="text-slate-700 dark:text-slate-300">
              View pre-built charts and metrics for quick insights
            </p>
          </div>
          <Link
            href="/reports/analytics"
            className="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-6 py-3 font-semibold text-white shadow-[var(--glow)] transition hover:scale-[1.02]"
          >
            View Dashboard
          </Link>
        </div>
      </div>

      {/* Help Section */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
        <h3 className="mb-3 text-lg font-bold text-blue-900 dark:text-blue-100">
          📊 Analytics Tips
        </h3>
        <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <li>• Use date filters to analyze specific time periods</li>
          <li>• Custom reports are saved and can be reused anytime</li>
          <li>• Export data to CSV for analysis in Excel or Google Sheets</li>
          <li>• Group by different fields to discover trends</li>
        </ul>
      </div>
    </div>
  );
}
