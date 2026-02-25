import { BadgeDollarSign, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import {
  ContentCard,
  DataTable,
  DataTableBody,
  DataTableHead,
  EmptyRow,
  Th,
} from "@/components/ui/ContentCard";
import { StatCard } from "@/components/ui/MetricCard";
import { guarded } from "@/lib/buildPhase";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import CommissionActions from "./CommissionActions";
import CommissionPlansPanel from "./CommissionPlansPanel";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated") redirect("/sign-in");
  if (ctx.status !== "ok" || !ctx.orgId) redirect("/dashboard");

  const records = await guarded(
    "commissions",
    async () => {
      try {
        const data = await prisma.team_performance.findMany({
          where: { orgId: ctx.orgId! },
          orderBy: { createdAt: "desc" },
          take: 100,
        });
        const userIds = [...new Set(data.map((r) => r.userId))];
        const users = await prisma.users.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, headshot_url: true },
        });
        const usersMap = new Map(users.map((u) => [u.id, u]));
        return data.map((r) => ({
          id: r.id,
          userId: r.userId,
          user: usersMap.get(r.userId) ?? null,
          periodStart: r.periodStart.toISOString().split("T")[0],
          periodEnd: r.periodEnd.toISOString().split("T")[0],
          claimsSigned: r.claimsSigned,
          claimsApproved: r.claimsApproved,
          totalRevenue: Number(r.totalRevenueGenerated),
          commissionOwed: Number(r.commissionOwed),
          commissionPaid: Number(r.commissionPaid),
          commissionPending: Number(r.commissionPending),
          closeRate: Number(r.closeRate),
        }));
      } catch (err) {
        logger.error("[commissions] DB query failed:", err);
        return [];
      }
    },
    []
  );

  const totals = {
    owed: records.reduce((s, r) => s + r.commissionOwed, 0),
    paid: records.reduce((s, r) => s + r.commissionPaid, 0),
    pending: records.reduce((s, r) => s + r.commissionPending, 0),
  };

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="Commission Tracker"
        subtitle="Track, approve, and pay commissions for your sales team"
        icon={<BadgeDollarSign className="h-5 w-5" />}
        section="finance"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          label="Pending"
          value={fmt(totals.pending)}
          icon={<Clock className="h-5 w-5" />}
          intent="warning"
          description="Awaiting approval"
        />
        <StatCard
          variant="gradient"
          gradientColor="warning"
          label="Owed"
          value={fmt(totals.owed)}
          icon={<BadgeDollarSign className="h-5 w-5" />}
          description="Approved, unpaid"
        />
        <StatCard
          variant="gradient"
          gradientColor="success"
          label="Paid"
          value={fmt(totals.paid)}
          icon={<CheckCircle className="h-5 w-5" />}
          description="Total paid out"
        />
        <StatCard
          label="Reps"
          value={new Set(records.map((r) => r.userId)).size}
          icon={<TrendingUp className="h-5 w-5" />}
          intent="info"
          description="With commission data"
        />
      </div>

      {/* Commission Plans — inline settings panel */}
      <CommissionPlansPanel />

      {/* Commission Table */}
      <ContentCard header="Commission Records" noPadding>
        <DataTable>
          <DataTableHead>
            <Th>Rep</Th>
            <Th>Period</Th>
            <Th align="right">Revenue</Th>
            <Th align="right">Close Rate</Th>
            <Th align="right">Pending</Th>
            <Th align="right">Owed</Th>
            <Th align="right">Paid</Th>
            <Th align="center">Actions</Th>
          </DataTableHead>
          <DataTableBody>
            {records.length === 0 && (
              <EmptyRow
                colSpan={8}
                message="No commission records yet. Team performance data will appear here."
              />
            )}
            {records.map((r) => (
              <tr
                key={r.id}
                className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {r.user?.headshot_url ? (
                      <img
                        src={r.user.headshot_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
                        {(r.user?.name || r.userId).substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-[color:var(--text)]">
                        {r.user?.name || r.userId.slice(0, 12)}
                      </div>
                      <div className="text-xs text-slate-500">{r.user?.email || ""}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
                  {r.periodStart} → {r.periodEnd}
                </td>
                <td className="px-6 py-4 text-right font-mono text-[color:var(--text)]">
                  {fmt(r.totalRevenue)}
                </td>
                <td className="px-6 py-4 text-right text-[color:var(--text)]">{r.closeRate}%</td>
                <td className="px-6 py-4 text-right font-mono text-yellow-600 dark:text-yellow-400">
                  {fmt(r.commissionPending)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-orange-600 dark:text-orange-400">
                  {fmt(r.commissionOwed)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-green-600 dark:text-green-400">
                  {fmt(r.commissionPaid)}
                </td>
                <td className="px-6 py-4 text-center">
                  <CommissionActions
                    recordId={r.id}
                    pending={r.commissionPending}
                    owed={r.commissionOwed}
                    repName={r.user?.name || undefined}
                  />
                </td>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </ContentCard>
    </PageContainer>
  );
}
