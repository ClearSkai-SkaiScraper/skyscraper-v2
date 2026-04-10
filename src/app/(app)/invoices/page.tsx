/* eslint-disable @typescript-eslint/no-explicit-any */
import { DollarSign, FileText, Plus, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
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
import { hasMinimumRole } from "@/lib/auth/rbac";
import { guarded } from "@/lib/buildPhase";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoices | SkaiScraper",
  description: "Create, send, and track invoices for your jobs and claims.",
};

export default async function InvoicesPage() {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated") redirect("/sign-in");
  if (ctx.status !== "ok" || !ctx.orgId) {
    return (
      <PageContainer>
        <NoOrgMembershipBanner title="Invoices" />
      </PageContainer>
    );
  }

  // RBAC: Invoice data requires at least OFFICE_STAFF role
  if (!ctx.role || !hasMinimumRole(ctx.role, "member")) {
    return (
      <PageContainer>
        <PageHero
          section="finance"
          title="Invoices"
          subtitle="Create, send, and track invoices"
          icon={<FileText className="h-5 w-5" />}
        />
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 py-12 text-center dark:border-amber-800 dark:bg-amber-950/20">
          <FileText className="h-12 w-12 text-amber-500" />
          <div>
            <h3 className="text-lg font-semibold">Access Restricted</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Invoice management requires office staff access or above.
            </p>
          </div>
        </div>
      </PageContainer>
    );
  }

  const invoices = await guarded(
    "invoices",
    async () => {
      try {
        // Get all jobs for this org
        const orgJobs = await prisma.crm_jobs.findMany({
          where: { org_id: ctx.orgId! },
          select: { id: true, status: true, insured_name: true, property_address: true },
        });
        const jobMap = new Map(orgJobs.map((j) => [j.id, j]));
        const jobIds = orgJobs.map((j) => j.id);

        if (jobIds.length === 0) return [];

        const data = await prisma.contractor_invoices.findMany({
          where: { job_id: { in: jobIds } },
          orderBy: { created_at: "desc" },
          take: 100,
        });

        return data.map((inv) => {
          const totals = inv.totals as any;
          const job = jobMap.get(inv.job_id);
          return {
            id: inv.id,
            invoiceNo: inv.invoice_no,
            jobId: inv.job_id,
            jobName: job?.insured_name || job?.property_address || inv.job_id.slice(0, 8),
            kind: inv.kind,
            total: totals?.total ?? 0,
            paidAmount: totals?.paidAmount ?? 0,
            balanceDue: totals?.balanceDue ?? totals?.total ?? 0,
            status: totals?.status ?? "draft",
            createdAt: inv.created_at.toISOString().split("T")[0],
          };
        });
      } catch (err) {
        logger.error("[invoices] DB query failed:", err);
        return [];
      }
    },
    []
  );

  const statusColors: Record<string, string> = {
    draft: "bg-slate-500/20 text-slate-600 dark:text-slate-300",
    sent: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    paid: "bg-green-500/20 text-green-600 dark:text-green-400",
    partial: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    voided: "bg-red-500/20 text-red-600 dark:text-red-400",
    overdue: "bg-red-500/20 text-red-600 dark:text-red-400",
  };

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalBilled = invoices.reduce((s, i) => s + i.total, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalOutstanding = invoices.reduce((s, i) => s + i.balanceDue, 0);

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="Invoice Manager"
        subtitle="Create, send, and track invoices for your jobs"
        icon={<FileText className="h-5 w-5" />}
        section="finance"
      >
        <Button asChild>
          <Link href="/invoices/create">
            <Plus className="mr-2 h-4 w-4" /> New Invoice
          </Link>
        </Button>
      </PageHero>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Total Billed"
          value={fmt(totalBilled)}
          icon={<FileText className="h-5 w-5" />}
          intent="info"
          description={`${invoices.length} invoices`}
        />
        <StatCard
          variant="gradient"
          gradientColor="success"
          label="Collected"
          value={fmt(totalCollected)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          variant="gradient"
          gradientColor="warning"
          label="Outstanding"
          value={fmt(totalOutstanding)}
          icon={<Send className="h-5 w-5" />}
        />
      </div>

      {/* Invoice Table */}
      <ContentCard noPadding>
        <DataTable>
          <DataTableHead>
            <Th>Invoice #</Th>
            <Th>Job</Th>
            <Th>Type</Th>
            <Th align="right">Total</Th>
            <Th align="right">Balance Due</Th>
            <Th align="center">Status</Th>
            <Th>Date</Th>
          </DataTableHead>
          <DataTableBody>
            {invoices.length === 0 && (
              <EmptyRow
                colSpan={7}
                message="No invoices yet. Create your first invoice to get started."
              />
            )}
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="cursor-pointer transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <Td mono className="font-medium text-blue-600 dark:text-blue-400">
                  <Link href={`/invoices/${inv.id}`} className="underline-offset-2 hover:underline">
                    {inv.invoiceNo}
                  </Link>
                </Td>
                <Td>{inv.jobName}</Td>
                <Td>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize dark:bg-slate-800">
                    {inv.kind}
                  </span>
                </Td>
                <Td align="right" mono>
                  {fmt(inv.total)}
                </Td>
                <Td align="right" mono>
                  {fmt(inv.balanceDue)}
                </Td>
                <Td align="center">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColors[inv.status] || statusColors.draft}`}
                  >
                    {inv.status}
                  </span>
                </Td>
                <Td className="text-xs text-slate-500">{inv.createdAt}</Td>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </ContentCard>
    </PageContainer>
  );
}
