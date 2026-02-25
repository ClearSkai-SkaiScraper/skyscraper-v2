import { currentUser } from "@clerk/nextjs/server";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STAGE_CONFIG = [
  { label: "New", color: "bg-sky-500", textColor: "text-sky-700 dark:text-sky-400", icon: Target },
  {
    label: "Inspection",
    color: "bg-blue-500",
    textColor: "text-blue-700 dark:text-blue-400",
    icon: Clock,
  },
  {
    label: "Estimate",
    color: "bg-indigo-500",
    textColor: "text-indigo-700 dark:text-indigo-400",
    icon: TrendingUp,
  },
  {
    label: "Approval",
    color: "bg-amber-500",
    textColor: "text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
  },
  {
    label: "Payment",
    color: "bg-emerald-500",
    textColor: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  {
    label: "Closed",
    color: "bg-green-600",
    textColor: "text-green-700 dark:text-green-400",
    icon: CheckCircle2,
  },
];

export default async function ClaimsTimelinePage() {
  let user;
  try {
    user = await currentUser();
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirect("/sign-in");
  }
  if (!user) redirect("/sign-in");

  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="Claims Timeline"
        subtitle="Visualize claim lifecycle stages and identify bottlenecks across your pipeline"
        icon={<Clock className="h-5 w-5" />}
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Link href="/claims">
            <Button variant="outline" size="sm">
              All Claims
            </Button>
          </Link>
        </div>
      </PageHero>

      {/* ─── KPI Stats ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-sky-50 to-blue-50 p-5 shadow-sm dark:from-sky-950/30 dark:to-blue-950/30">
          <div className="flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-400">
            <Clock className="h-4 w-4" />
            Avg Time to Close
          </div>
          <div className="mt-2 text-3xl font-bold text-[color:var(--text)]">0 days</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No claims closed yet</p>
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
            <Target className="h-4 w-4" />
            Active Claims
          </div>
          <div className="mt-2 text-3xl font-bold text-[color:var(--text)]">0</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">In progress</p>
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-red-50 to-orange-50 p-5 shadow-sm dark:from-red-950/30 dark:to-orange-950/30">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Overdue Claims
          </div>
          <div className="mt-2 text-3xl font-bold text-[color:var(--text)]">0</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Needs attention</p>
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-emerald-50 to-green-50 p-5 shadow-sm dark:from-emerald-950/30 dark:to-green-950/30">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Closed This Month
          </div>
          <div className="mt-2 text-3xl font-bold text-[color:var(--text)]">0</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Successfully closed</p>
        </div>
      </div>

      {/* ─── Pipeline Stage Visualization ─── */}
      <PageSectionCard title="Claim Lifecycle Pipeline">
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          Track how claims move through each stage. Click a stage to filter claims at that point in
          the lifecycle.
        </p>
        <div className="space-y-4">
          {STAGE_CONFIG.map((stage, idx) => {
            const StageIcon = stage.icon;
            return (
              <div
                key={idx}
                className="group flex items-center gap-4 rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-4 transition-all hover:shadow-md"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${stage.color} text-sm font-bold text-white shadow-sm`}
                >
                  <StageIcon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[color:var(--text)]">{stage.label}</span>
                    <span className={`text-sm font-medium ${stage.textColor}`}>0 claims</span>
                  </div>
                  {/* Progress bar placeholder */}
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${stage.color} opacity-30`}
                      style={{ width: "0%" }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-[color:var(--text)]">0 days</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">avg duration</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            );
          })}
        </div>
      </PageSectionCard>

      {/* ─── Getting Started ─── */}
      <PageSectionCard title="Timeline Analytics">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-blue-200 shadow-inner dark:from-sky-900/40 dark:to-blue-900/40">
            <Calendar className="h-8 w-8 text-sky-600 dark:text-sky-400" />
          </div>
          <h3 className="mt-5 text-lg font-semibold text-[color:var(--text)]">
            Timeline Visualization Coming Soon
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Interactive Gantt-style timeline with claim durations, bottleneck detection, and SLA
            tracking. Create claims to populate this dashboard with real data.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/claims">
              <Button className="gap-2">
                <ArrowRight className="h-4 w-4" />
                View All Claims
              </Button>
            </Link>
            <Link href="/analytics/dashboard">
              <Button variant="outline" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </PageSectionCard>
    </PageContainer>
  );
}
