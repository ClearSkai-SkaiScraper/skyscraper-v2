/**
 * #184 — Vendor Calendar / Scheduling
 * Server component with a CSS-grid monthly calendar,
 * job details, and availability management.
 */

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Settings,
  Wrench,
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
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type CalendarJob = {
  id: string;
  title: string;
  tradeType: string | null;
  scheduledDate: Date;
  status: string;
  propertyCity: string | null;
  propertyState: string | null;
  urgency: string | null;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    new: "bg-blue-500",
    scheduled: "bg-indigo-500",
    in_progress: "bg-amber-500",
    completed: "bg-emerald-500",
    cancelled: "bg-red-400",
  };
  return map[status] ?? "bg-slate-400";
}

function urgencyBadge(urgency: string | null) {
  if (!urgency || urgency === "normal") return null;
  const map: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    high: "bg-orange-100 text-orange-700",
    emergency: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${map[urgency] ?? ""}`}
    >
      {urgency}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const orgCtx = await safeOrgContext();
  if (orgCtx.status === "unauthenticated" || !orgCtx.userId) redirect("/sign-in");

  const userId = orgCtx.userId;

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
          title="Schedule & Calendar"
          subtitle="Set up your trades profile to use the calendar"
          icon={<CalendarIcon className="h-5 w-5" />}
          section="build"
        />
        <PageSectionCard>
          <div className="py-10 text-center">
            <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h2 className="mb-2 text-lg font-semibold">No Profile Found</h2>
            <p className="mb-4 text-sm text-slate-500">
              Create your trades profile to manage your schedule.
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

  // Parse month/year from search params (defaults to current)
  const params = await searchParams;
  const now = new Date();
  const viewYear = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const viewMonth = params.month ? parseInt(params.month, 10) - 1 : now.getMonth();

  const companyId = member.companyId;

  // Fetch jobs with scheduled dates in this month
  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd = new Date(viewYear, viewMonth + 1, 1);

  const rawJobs = companyId
    ? await prisma.clientJob
        .findMany({
          where: {
            proCompanyId: companyId,
            scheduledDate: { gte: monthStart, lt: monthEnd },
          },
          select: {
            id: true,
            title: true,
            tradeType: true,
            scheduledDate: true,
            status: true,
            propertyCity: true,
            propertyState: true,
            urgency: true,
          },
          orderBy: { scheduledDate: "asc" },
        })
        .catch(() => [])
    : [];

  const jobs: CalendarJob[] = rawJobs
    .filter((j): j is typeof j & { scheduledDate: Date } => j.scheduledDate !== null)
    .map((j) => ({ ...j, scheduledDate: j.scheduledDate! }));

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Group jobs by day number
  const jobsByDay = new Map<number, CalendarJob[]>();
  for (const job of jobs) {
    const day = job.scheduledDate.getDate();
    if (!jobsByDay.has(day)) jobsByDay.set(day, []);
    jobsByDay.get(day)!.push(job);
  }

  // Nav links
  const prevMonth = viewMonth === 0 ? 12 : viewMonth;
  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  const nextMonth = viewMonth === 11 ? 1 : viewMonth + 2;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  // Upcoming jobs (next 7 days)
  const today = new Date();
  const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingJobs = companyId
    ? await prisma.clientJob
        .findMany({
          where: {
            proCompanyId: companyId,
            scheduledDate: { gte: today, lt: weekEnd },
          },
          select: {
            id: true,
            title: true,
            tradeType: true,
            scheduledDate: true,
            status: true,
            propertyCity: true,
            propertyState: true,
            urgency: true,
          },
          orderBy: { scheduledDate: "asc" },
          take: 10,
        })
        .catch(() => [])
    : [];

  // Availability (uses hoursOfOperation from profile)
  const hours = (member.hoursOfOperation ?? {}) as Record<string, string>;

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="Schedule & Calendar"
        subtitle={`${MONTH_NAMES[viewMonth]} ${viewYear} — ${jobs.length} scheduled job${jobs.length !== 1 ? "s" : ""}`}
        icon={<CalendarIcon className="h-5 w-5" />}
        section="build"
      >
        <Link
          href="/trades/jobs"
          className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/30"
        >
          Job Board
        </Link>
      </PageHero>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ── Calendar Grid ── */}
        <PageSectionCard noPadding>
          {/* Month navigation */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <Link
              href={`/trades/calendar?month=${prevMonth}&year=${prevYear}`}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <h2 className="text-sm font-bold text-slate-800">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h2>
            <Link
              href={`/trades/calendar?month=${nextMonth}&year=${nextYear}`}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {/* Empty leading cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[80px] border-b border-r border-slate-50 bg-slate-50/50 p-1"
              />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayJobs = jobsByDay.get(day) ?? [];
              const isToday =
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();

              return (
                <div
                  key={day}
                  className={`min-h-[80px] border-b border-r border-slate-100 p-1 transition ${
                    isToday ? "bg-blue-50/60" : "hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday ? "bg-blue-600 text-white" : "text-slate-600"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayJobs.slice(0, 3).map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: "transparent" }}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${statusColor(job.status)}`}
                        />
                        <span className="truncate text-[10px] text-slate-700">{job.title}</span>
                      </div>
                    ))}
                    {dayJobs.length > 3 && (
                      <span className="text-[9px] font-medium text-blue-500">
                        +{dayJobs.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </PageSectionCard>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Upcoming */}
          <PageSectionCard title="Upcoming Jobs" subtitle="Next 7 days">
            {upcomingJobs.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No jobs scheduled this week</p>
            ) : (
              <div className="space-y-2">
                {upcomingJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-lg border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/30"
                  >
                    <div className="mb-1 flex items-start justify-between">
                      <p className="text-sm font-semibold text-slate-700">{job.title}</p>
                      {job.urgency && urgencyBadge(job.urgency)}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                      {job.scheduledDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(job.scheduledDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      {job.propertyCity && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.propertyCity}
                          {job.propertyState ? `, ${job.propertyState}` : ""}
                        </span>
                      )}
                      {job.tradeType && (
                        <span className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          {job.tradeType}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${statusColor(job.status)}`}
                      >
                        {job.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageSectionCard>

          {/* Availability */}
          <PageSectionCard title="Availability" subtitle="Your working hours">
            <div className="space-y-1.5">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                (day) => {
                  const val = hours[day.toLowerCase()] || hours[day];
                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="font-medium text-slate-600">{day}</span>
                      <span className={val ? "text-emerald-600" : "text-slate-400"}>
                        {val || "Not set"}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
            <Link
              href="/trades/profile/edit"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <Settings className="h-3 w-3" />
              Edit Hours
            </Link>
          </PageSectionCard>

          {/* Legend */}
          <PageSectionCard title="Status Legend">
            <div className="space-y-2">
              {[
                { label: "New", color: "bg-blue-500" },
                { label: "Scheduled", color: "bg-indigo-500" },
                { label: "In Progress", color: "bg-amber-500" },
                { label: "Completed", color: "bg-emerald-500" },
                { label: "Cancelled", color: "bg-red-400" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                  {s.label}
                </div>
              ))}
            </div>
          </PageSectionCard>
        </div>
      </div>
    </PageContainer>
  );
}
