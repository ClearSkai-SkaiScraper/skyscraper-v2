import { AlertCircle, CheckCircle2, ClipboardList, Clock, HardHat, Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { guarded } from "@/lib/buildPhase";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { WorkOrderForm } from "./WorkOrderForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Work Orders | SkaiScraper",
  description: "Create and manage work orders for crew assignments and job tracking.",
};

const statusColors: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-600 dark:text-slate-400",
  in_progress: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  completed: "bg-green-500/20 text-green-600 dark:text-green-400",
  cancelled: "bg-red-500/20 text-red-600 dark:text-red-400",
};

const priorityBadge: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  medium: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  in_progress: <Loader2 className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  cancelled: <AlertCircle className="h-4 w-4" />,
};

export default async function WorkOrdersPage() {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated") redirect("/sign-in");
  if (ctx.status !== "ok" || !ctx.orgId) {
    return (
      <PageContainer>
        <NoOrgMembershipBanner title="Work Orders" />
      </PageContainer>
    );
  }

  const workOrders = await guarded(
    "work-orders",
    async () => {
      const data = await prisma.jobs.findMany({
        where: { orgId: ctx.orgId!, jobType: "work_order" },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          claims: { select: { id: true, claimNumber: true, title: true } },
        },
      });
      return data.map((w) => ({
        id: w.id,
        title: w.title as string | null,
        description: w.description as string | null,
        status: w.status as string,
        priority: w.priority as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        claimNumber: (w as any).claims?.claimNumber ?? "—",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        claimTitle: (w as any).claims?.title ?? "—",
        assignedTo: w.foreman as string | null,
        dueDate: (w.scheduledStart as Date | null)?.toISOString().split("T")[0] ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        materials: w.materials as any[] | null,
        createdAt: (w.createdAt as Date).toISOString().split("T")[0],
      }));
    },
    []
  );

  // Get claims for the form dropdown
  const claims = await guarded(
    "work-order-claims",
    async () => {
      return prisma.claims.findMany({
        where: { orgId: ctx.orgId! },
        select: { id: true, claimNumber: true, title: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    },
    []
  );

  const summary = {
    total: workOrders.length,
    pending: workOrders.filter((w) => w.status === "pending").length,
    inProgress: workOrders.filter((w) => w.status === "in_progress").length,
    completed: workOrders.filter((w) => w.status === "completed").length,
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="jobs"
        title="Work Orders"
        subtitle="Create, assign, and track work orders for your jobs"
        icon={<ClipboardList className="h-5 w-5" />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: "Total Orders",
            value: summary.total,
            icon: <ClipboardList className="h-5 w-5 text-blue-500" />,
          },
          {
            label: "Pending",
            value: summary.pending,
            icon: <Clock className="h-5 w-5 text-slate-500" />,
          },
          {
            label: "In Progress",
            value: summary.inProgress,
            icon: <HardHat className="h-5 w-5 text-orange-500" />,
          },
          {
            label: "Completed",
            value: summary.completed,
            icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-5 backdrop-blur-xl"
          >
            <div className="mb-2 flex items-center gap-2">
              {stat.icon}
              <span className="text-sm text-slate-600 dark:text-slate-300">{stat.label}</span>
            </div>
            <div className="text-3xl font-bold text-[color:var(--text)]">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Create Form */}
      <WorkOrderForm claims={claims} />

      {/* Work Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[var(--surface-1)]">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Claim
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Assigned
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {workOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No work orders yet. Create one above.
                  </td>
                </tr>
              )}
              {workOrders.map((w) => (
                <tr key={w.id} className="transition-colors hover:bg-[var(--surface-1)]">
                  <td className="px-6 py-4">
                    <div className="font-medium text-[color:var(--text)]">{w.title}</div>
                    {w.description && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {w.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500">{w.claimNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadge[w.priority] || ""}`}
                    >
                      {w.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[w.status] || ""}`}
                    >
                      {statusIcon[w.status]}
                      {w.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{w.assignedTo || "—"}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{w.dueDate || "—"}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{w.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
