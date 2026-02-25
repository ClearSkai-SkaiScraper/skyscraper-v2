import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

// ── Stage configuration: map claim statuses to pipeline stages ─────
const STAGE_CONFIG = [
  {
    label: "New",
    statuses: ["new", "lead", "intake"],
    color: "bg-sky-500",
    textColor: "text-sky-700 dark:text-sky-400",
    icon: Target,
  },
  {
    label: "Inspection",
    statuses: ["inspection", "inspection_scheduled", "inspection_completed"],
    color: "bg-blue-500",
    textColor: "text-blue-700 dark:text-blue-400",
    icon: Clock,
  },
  {
    label: "Estimate",
    statuses: ["estimate", "estimate_drafting", "submitted", "supplementing", "in_review"],
    color: "bg-indigo-500",
    textColor: "text-indigo-700 dark:text-indigo-400",
    icon: TrendingUp,
  },
  {
    label: "Approval",
    statuses: ["approved", "pending_approval", "denied", "appeal"],
    color: "bg-amber-500",
    textColor: "text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
  },
  {
    label: "In Production",
    statuses: ["in_production", "build", "scheduled", "in_progress"],
    color: "bg-emerald-500",
    textColor: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  {
    label: "Closed",
    statuses: ["closed", "completed", "paid"],
    color: "bg-green-600",
    textColor: "text-green-700 dark:text-green-400",
    icon: CheckCircle2,
  },
];

const closedStatuses = ["closed", "completed", "paid"];

function mapStatusToStage(status: string | null): string {
  if (!status) return "New";
  const lower = status.toLowerCase().replace(/[\s-]+/g, "_");
  for (const stage of STAGE_CONFIG) {
    if (stage.statuses.includes(lower)) return stage.label;
  }
  return "New"; // fallback
}

export default async function ClaimsTimelinePage() {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated") redirect("/sign-in");

  const orgId = ctx.orgId;

  // ── Fetch real claims data ─────────────────────────────────────
  let claims: {
    id: string;
    status: string | null;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    claimNumber: string;
  }[] = [];

  try {
    if (orgId) {
      claims = await prisma.claims.findMany({
        where: { orgId, archivedAt: null },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          title: true,
          claimNumber: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }
  } catch (err) {
    logger.error("[ClaimsTimeline] Failed to fetch claims:", err);
  }

  // ── Compute KPI metrics ────────────────────────────────────────
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const closedClaims = claims.filter((c) =>
    closedStatuses.includes((c.status || "").toLowerCase())
  );
  const activeClaims = claims.filter(
    (c) => !closedStatuses.includes((c.status || "").toLowerCase())
  );
  const closedThisMonth = closedClaims.filter((c) => c.updatedAt >= startOfMonth);

  // Avg time to close (for claims closed in last 30 days)
  const recentlyClosed = closedClaims.filter((c) => c.updatedAt >= thirtyDaysAgo);
  const avgCloseTimeDays =
    recentlyClosed.length > 0
      ? Math.round(
          recentlyClosed.reduce(
            (sum, c) =>
              sum + (c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24),
            0
          ) / recentlyClosed.length
        )
      : 0;

  // Overdue: open claims older than 30 days
  const overdueClaims = activeClaims.filter((c) => c.createdAt < thirtyDaysAgo);

  // ── Stage counts ───────────────────────────────────────────────
  const stageCounts: Record<string, number> = {};
  const stageClaimsList: Record<string, typeof claims> = {};
  for (const stage of STAGE_CONFIG) {
    stageCounts[stage.label] = 0;
    stageClaimsList[stage.label] = [];
  }
  for (const claim of claims) {
    const stage = mapStatusToStage(claim.status);
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    if (!stageClaimsList[stage]) stageClaimsList[stage] = [];
    stageClaimsList[stage].push(claim);
  }
  const maxStageCount = Math.max(1, ...Object.values(stageCounts));

  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="Claims Timeline"
        subtitle="Visualize claim lifecycle stages and identify bottlenecks across your pipeline"
        icon={<Clock className="h-5 w-5" />}
      >
        <div className="flex gap-2">
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
          <div className="mt-2 text-3xl font-bold text-[color:var(--text)]">
            {avgCloseTimeDays > 0 ? `${avgCloseTimeDays} days` : "—"}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {recentlyClosed.length > 0
              ? `Based on ${recentlyClosed.length} recently closed`
              : "No claims closed in last 30 days"}
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
            <Target className="h-4 w-4" />
            Active Claims
          </div>
          <div className="mt-2 text-3xl font-bold text-[color:var(--text)]">
            {activeClaims.length}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            In progress across all stages
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-red-50 to-orange-50 p-5 shadow-sm dark:from-red-950/30 dark:to-orange-950/30">
          <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Overdue Claims
          </div>
          <div className="mt-2 text-3xl font-bold text-[color:var(--text)]">
            {overdueClaims.length}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Open &gt; 30 days — needs attention
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-emerald-50 to-green-50 p-5 shadow-sm dark:from-emerald-950/30 dark:to-green-950/30">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Closed This Month
          </div>
          <div className="mt-2 text-3xl font-bold text-[color:var(--text)]">
            {closedThisMonth.length}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Successfully resolved</p>
        </div>
      </div>

      {/* ─── Pipeline Stage Visualization ─── */}
      <PageSectionCard title="Claim Lifecycle Pipeline">
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          Track how claims move through each stage. {claims.length} total claims in your workspace.
        </p>
        <div className="space-y-4">
          {STAGE_CONFIG.map((stage, idx) => {
            const StageIcon = stage.icon;
            const count = stageCounts[stage.label] || 0;
            const pct = (count / maxStageCount) * 100;
            // Avg duration for claims currently in this stage
            const stageClaims = stageClaimsList[stage.label] || [];
            const avgDays =
              stageClaims.length > 0
                ? Math.round(
                    stageClaims.reduce(
                      (sum, c) =>
                        sum + (now.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24),
                      0
                    ) / stageClaims.length
                  )
                : 0;

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
                    <span className={`text-sm font-medium ${stage.textColor}`}>
                      {count} claim{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${stage.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-[color:var(--text)]">
                    {avgDays > 0 ? `${avgDays} days` : "—"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">avg age</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            );
          })}
        </div>
      </PageSectionCard>

      {/* ─── Recent Claims ─── */}
      {claims.length > 0 ? (
        <PageSectionCard title="Recent Claims">
          <div className="space-y-2">
            {claims.slice(0, 10).map((claim) => (
              <Link
                key={claim.id}
                href={`/claims/${claim.id}`}
                className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
              >
                <div>
                  <div className="font-medium text-[color:var(--text)]">{claim.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {claim.claimNumber} · {claim.status || "new"} ·{" "}
                    {claim.createdAt.toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      closedStatuses.includes((claim.status || "").toLowerCase())
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {mapStatusToStage(claim.status)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
          {claims.length > 10 && (
            <div className="mt-4 text-center">
              <Link href="/claims">
                <Button variant="outline" size="sm">
                  View all {claims.length} claims →
                </Button>
              </Link>
            </div>
          )}
        </PageSectionCard>
      ) : (
        <PageSectionCard title="Timeline Analytics">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-blue-200 shadow-inner dark:from-sky-900/40 dark:to-blue-900/40">
              <Calendar className="h-8 w-8 text-sky-600 dark:text-sky-400" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-[color:var(--text)]">No Claims Yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Create your first claim to see pipeline analytics, bottleneck detection, and lifecycle
              tracking in real time.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/claims/new">
                <Button className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Create First Claim
                </Button>
              </Link>
              <Link href="/claims">
                <Button variant="outline" className="gap-2">
                  View Claims
                </Button>
              </Link>
            </div>
          </div>
        </PageSectionCard>
      )}
    </PageContainer>
  );
}
