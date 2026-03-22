import { Metadata } from "next";

import { PageHero } from "@/components/layout/PageHero";
import { getTenant } from "@/lib/auth/tenant";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Weather Hub | SkaiScraper",
  description: "Storm tracking, weather reports, and hail intelligence dashboard",
};

export default async function WeatherHubPage() {
  const orgId = await getTenant();

  // Fetch recent weather reports for this org (through claims relation)
  const reports = orgId
    ? await prisma.weather_reports
        .findMany({
          where: {
            claims: { orgId },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            address: true,
            mode: true,
            primaryPeril: true,
            overallAssessment: true,
            dol: true,
            createdAt: true,
          },
        })
        .catch(() => [])
    : [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHero
        title="Weather Hub"
        subtitle="Storm tracking, hail reports, and weather intelligence for your service area"
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Reports" value={reports.length} />
        <StatCard
          label="This Month"
          value={
            reports.filter((r) => {
              const d = new Date(r.createdAt);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length
          }
        />
        <StatCard label="Active Storms" value="—" />
        <StatCard label="Coverage Area" value="—" />
      </div>

      {/* Recent Reports */}
      <div className="rounded-xl border bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:bg-slate-900/60">
        <h2 className="mb-4 text-lg font-semibold">Recent Weather Reports</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No weather reports yet. Generate your first report from a claim&apos;s weather tab.
          </p>
        ) : (
          <div className="space-y-2">
            {reports.map((report: any) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50"
              >
                <div>
                  <p className="font-medium">
                    {report.primaryPeril || report.mode || "Weather Report"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {report.address || "Unknown location"} •{" "}
                    {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {report.mode || "complete"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:bg-slate-900/60">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
