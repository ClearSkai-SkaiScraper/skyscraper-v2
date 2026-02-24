import { AlertCircle, CheckCircle2, ClipboardList, Clock, FileCheck, Shield } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import {
  ContentCard,
  DataTable,
  DataTableBody,
  DataTableHead,
  EmptyRow,
  Td,
  Th,
} from "@/components/ui/ContentCard";
import { StatCard } from "@/components/ui/MetricCard";
import { guarded } from "@/lib/buildPhase";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import PermitForm from "./PermitForm";

export const dynamic = "force-dynamic";

const statusIcons: Record<string, React.ReactNode> = {
  applied: <Clock className="h-4 w-4 text-blue-500" />,
  approved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  issued: <FileCheck className="h-4 w-4 text-emerald-500" />,
  inspection_scheduled: <ClipboardList className="h-4 w-4 text-yellow-500" />,
  passed: <Shield className="h-4 w-4 text-green-600" />,
  failed: <AlertCircle className="h-4 w-4 text-red-500" />,
  expired: <AlertCircle className="h-4 w-4 text-slate-400" />,
};

const statusColors: Record<string, string> = {
  applied: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  approved: "bg-green-500/20 text-green-600 dark:text-green-400",
  issued: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  inspection_scheduled: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  passed: "bg-green-600/20 text-green-700 dark:text-green-300",
  failed: "bg-red-500/20 text-red-600 dark:text-red-400",
  expired: "bg-slate-500/20 text-slate-600 dark:text-slate-300",
};

export default async function PermitsPage() {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated") redirect("/sign-in");
  if (ctx.status !== "ok" || !ctx.orgId) redirect("/dashboard");

  const permits = await guarded(
    "permits",
    async () => {
      const data = await prisma.permits.findMany({
        where: { orgId: ctx.orgId! },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return data.map((p) => ({
        id: p.id,
        permitNumber: p.permitNumber,
        permitType: p.permitType,
        jurisdiction: p.jurisdiction,
        status: p.status,
        appliedAt: p.appliedAt.toISOString().split("T")[0],
        expiresAt: p.expiresAt?.toISOString().split("T")[0] ?? null,
        inspectionDate: p.inspectionDate?.toISOString().split("T")[0] ?? null,
        fee: p.fee ? Number(p.fee) : null,
        notes: p.notes,
      }));
    },
    []
  );

  const summary = {
    total: permits.length,
    active: permits.filter((p) => !["passed", "failed", "expired"].includes(p.status)).length,
    pendingInspection: permits.filter((p) => p.status === "inspection_scheduled").length,
    passed: permits.filter((p) => p.status === "passed").length,
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="jobs"
        title="Permit Tracker"
        subtitle="Track building permits, inspections, and approvals for your jobs"
        icon={<ClipboardList className="h-5 w-5" />}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total Permits"
          value={summary.total}
          icon={<ClipboardList className="h-5 w-5" />}
          intent="info"
        />
        <StatCard
          label="Active"
          value={summary.active}
          icon={<CheckCircle2 className="h-5 w-5" />}
          intent="success"
        />
        <StatCard
          label="Pending Inspection"
          value={summary.pendingInspection}
          icon={<Clock className="h-5 w-5" />}
          intent="warning"
        />
        <StatCard
          label="Passed"
          value={summary.passed}
          icon={<Shield className="h-5 w-5" />}
          intent="success"
        />
      </div>

      {/* Add permit form */}
      <PermitForm />

      {/* Permits table */}
      <ContentCard noPadding>
        <DataTable>
          <DataTableHead>
            <Th>Permit #</Th>
            <Th>Type</Th>
            <Th>Jurisdiction</Th>
            <Th align="center">Status</Th>
            <Th>Applied</Th>
            <Th>Inspection</Th>
            <Th align="right">Fee</Th>
          </DataTableHead>
          <DataTableBody>
            {permits.length === 0 && (
              <EmptyRow
                colSpan={7}
                message="No permits tracked yet. Add your first permit above."
              />
            )}
            {permits.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <Td mono className="font-medium text-blue-600 dark:text-blue-400">
                  <Link href={`/permits/${p.id}`} className="underline-offset-2 hover:underline">
                    {p.permitNumber}
                  </Link>
                </Td>
                <Td className="capitalize">
                  <Link href={`/permits/${p.id}`}>{p.permitType}</Link>
                </Td>
                <Td>
                  <Link href={`/permits/${p.id}`}>{p.jurisdiction || "—"}</Link>
                </Td>
                <Td align="center">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColors[p.status] || ""}`}
                  >
                    {statusIcons[p.status]} {p.status.replace("_", " ")}
                  </span>
                </Td>
                <Td className="text-xs text-slate-500">{p.appliedAt}</Td>
                <Td className="text-xs text-slate-500">{p.inspectionDate || "—"}</Td>
                <Td align="right" mono>
                  {p.fee ? `$${p.fee.toFixed(2)}` : "—"}
                </Td>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </ContentCard>
    </PageContainer>
  );
}
