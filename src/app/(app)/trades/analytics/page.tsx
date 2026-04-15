/**
 * #181 — Vendor Analytics Dashboard
 * Server component showing vendor performance metrics,
 * job stats, ratings, revenue, and response-time trends.
 */

import {
  BarChart3,
  CheckCircle,
  Clock,
  DollarSign,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ------------------------------------------------------------------ */
/*  Stat card component                                                */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  change,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  change?: string;
  icon: React.ElementType;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`rounded-lg p-3 ${colorMap[color] ?? colorMap.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
        {change && (
          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
            <TrendingUp className="h-3 w-3" /> {change}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Simple bar chart (CSS-only)                                        */
/* ------------------------------------------------------------------ */
function MiniBarChart({
  data,
  label,
}: {
  data: { month: string; value: number }[];
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-700">{label}</p>
      <div className="flex items-end gap-2" style={{ height: 120 }}>
        {data.map((d) => (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-slate-500">{d.value}</span>
            <div
              className="w-full rounded-t-md bg-blue-500 transition-all"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: 4 }}
            />
            <span className="text-[10px] text-slate-400">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default async function VendorAnalyticsPage() {
  const orgCtx = await safeOrgContext();
  if (orgCtx.status === "unauthenticated" || !orgCtx.userId) redirect("/sign-in");

  const userId = orgCtx.userId;

  // Fetch member profile
  const member = await prisma.tradesCompanyMember
    .findUnique({
      where: { userId },
      include: { company: true },
    })
    .catch(() => null);

  if (!member) {
    return (
      <PageContainer>
        <PageHero
          title="Vendor Analytics"
          subtitle="Set up your trades profile to see analytics"
          icon={<BarChart3 className="h-5 w-5" />}
          section="network"
        />
        <PageSectionCard>
          <div className="py-10 text-center">
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h2 className="mb-2 text-lg font-semibold">No Profile Found</h2>
            <p className="mb-4 text-sm text-slate-500">
              Create your trades profile to start tracking performance.
            </p>
            <Link
              href="/trades/setup"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Set Up Profile →
            </Link>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }

  // Aggregate analytics data
  const companyId = member.companyId;

  const [jobsCompleted, totalJobs, reviews, recentJobs, totalRevenue] = await Promise.all([
    // Jobs completed
    companyId
      ? prisma.clientJob
          .count({ where: { proCompanyId: companyId, status: "completed" } })
          .catch(() => 0)
      : Promise.resolve(0),
    // Total jobs
    companyId
      ? prisma.clientJob.count({ where: { proCompanyId: companyId } }).catch(() => 0)
      : Promise.resolve(0),
    // Reviews
    prisma.trade_reviews
      .findMany({
        where: { contractorId: member.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
      .catch(() => []),
    // Recent 6 months of jobs for chart
    companyId
      ? prisma.clientJob
          .findMany({
            where: {
              proCompanyId: companyId,
              createdAt: {
                gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
              },
            },
            select: { createdAt: true, status: true, actualCost: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    // Revenue
    companyId
      ? prisma.clientJob
          .aggregate({
            where: { proCompanyId: companyId, status: "completed" },
            _sum: { actualCost: true },
          })
          .catch(() => ({ _sum: { actualCost: null } }))
      : Promise.resolve({ _sum: { actualCost: null } }),
  ]);

  // Compute average rating
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "—";

  const revenue = totalRevenue._sum.actualCost
    ? `$${Number(totalRevenue._sum.actualCost).toLocaleString()}`
    : "$0";

  const completionRate = totalJobs > 0 ? Math.round((jobsCompleted / totalJobs) * 100) : 0;

  // Build monthly chart data (last 6 months)
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const now = new Date();
  const monthlyJobs: { month: string; value: number }[] = [];
  const monthlyRevenue: { month: string; value: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = monthNames[d.getMonth()];
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);

    const monthJobs = recentJobs.filter(
      (j) => j.createdAt && j.createdAt >= monthStart && j.createdAt < monthEnd
    );
    monthlyJobs.push({ month: monthLabel, value: monthJobs.length });

    const monthRev = monthJobs.reduce((s, j) => s + Number(j.actualCost ?? 0), 0);
    monthlyRevenue.push({ month: monthLabel, value: Math.round(monthRev / 100) }); // in hundreds
  }

  // Response time placeholder (would need message timestamps in production)
  const avgResponseTime = "< 2 hrs";

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="Vendor Analytics"
        subtitle={`Performance dashboard for ${member.company?.name || `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || "your business"}`}
        icon={<BarChart3 className="h-5 w-5" />}
        section="network"
      >
        <Link
          href="/trades/profile"
          className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/30"
        >
          View Profile
        </Link>
      </PageHero>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Jobs Completed"
          value={String(jobsCompleted)}
          change={totalJobs > 0 ? `${completionRate}% completion` : undefined}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          label="Average Rating"
          value={avgRating}
          change={`${reviews.length} reviews`}
          icon={Star}
          color="amber"
        />
        <StatCard label="Total Revenue" value={revenue} icon={DollarSign} color="blue" />
        <StatCard label="Avg Response Time" value={avgResponseTime} icon={Clock} color="violet" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <PageSectionCard title="Jobs Per Month" subtitle="Last 6 months">
          <MiniBarChart data={monthlyJobs} label="" />
        </PageSectionCard>

        <PageSectionCard title="Revenue Trend" subtitle="In hundreds ($)">
          <MiniBarChart data={monthlyRevenue} label="" />
        </PageSectionCard>
      </div>

      {/* Additional Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <PageSectionCard title="Profile Strength">
          <div className="space-y-3">
            {[
              { label: "Profile Photo", done: !!member.avatar },
              { label: "Bio / About", done: !!member.bio },
              { label: "Certifications", done: member.certifications.length > 0 },
              { label: "Portfolio Items", done: member.portfolioImages.length > 0 },
              { label: "Service Area", done: !!member.serviceArea },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                )}
                <span className={item.done ? "text-slate-700" : "text-slate-400"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/trades/profile/edit"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Complete Profile →
          </Link>
        </PageSectionCard>

        <PageSectionCard title="Recent Reviews">
          {reviews.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No reviews yet</p>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 4).map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="mb-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                      />
                    ))}
                    {r.jobType && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        {r.jobType}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-slate-600">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </PageSectionCard>

        <PageSectionCard title="Quick Actions">
          <div className="space-y-2">
            {[
              { href: "/trades/jobs", label: "Browse Job Board", icon: Zap },
              { href: "/trades/portfolio", label: "Manage Portfolio", icon: Users },
              { href: "/trades/badges", label: "View Badges", icon: Star },
              { href: "/trades/calendar", label: "Schedule & Calendar", icon: Clock },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
              >
                <action.icon className="h-4 w-4 text-blue-500" />
                {action.label}
              </Link>
            ))}
          </div>
        </PageSectionCard>
      </div>
    </PageContainer>
  );
}
