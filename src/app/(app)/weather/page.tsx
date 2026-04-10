import { CloudRain, FileText, Plus } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { NoWeatherReportsEmpty } from "@/components/ui/EmptyStatePresets";
import { getTenant } from "@/lib/auth/tenant";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Weather Reports | SkaiScraper",
  description: "Storm tracking, weather reports, and hail intelligence dashboard",
};

type WeatherReport = {
  id: string;
  address: string | null;
  mode: string | null;
  primaryPeril: string | null;
  overallAssessment: string | null;
  dol: Date | null;
  createdAt: Date;
  claimId: string | null;
};

export default async function WeatherReportsPage() {
  const orgId = await getTenant();

  // Fetch recent weather reports for this org (through claims relation)
  const reports: WeatherReport[] = orgId
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
            claimId: true,
          },
        })
        .catch(() => [])
    : [];

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="Weather Reports"
        subtitle="Storm tracking, hail reports, and weather intelligence for your service area"
        icon={<CloudRain className="h-5 w-5" />}
        section="reports"
      >
        <Button asChild>
          <Link href="/reports/weather">
            <Plus className="mr-2 h-4 w-4" /> Generate Report
          </Link>
        </Button>
      </PageHero>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Reports"
          value={reports.length}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="This Month"
          value={
            reports.filter((r) => {
              const d = new Date(r.createdAt);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length
          }
          icon={<CloudRain className="h-4 w-4" />}
        />
        <StatCard label="Active Storms" value="—" icon={<CloudRain className="h-4 w-4" />} />
        <StatCard label="Coverage Area" value="—" icon={<CloudRain className="h-4 w-4" />} />
      </div>

      {/* Recent Reports */}
      <div className="rounded-xl border bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:bg-slate-900/60">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Weather Reports</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/reports/weather">Generate New Report</Link>
          </Button>
        </div>
        {reports.length === 0 ? (
          <NoWeatherReportsEmpty ctaLabel="Generate Weather Report" ctaHref="/reports/weather" />
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={report.claimId ? `/claims/${report.claimId}?tab=weather` : `/reports/weather`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/50"
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:bg-slate-900/60">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
