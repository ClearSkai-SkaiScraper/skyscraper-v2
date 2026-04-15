/* eslint-disable @typescript-eslint/no-explicit-any */
import { Calculator, FileText, Plus } from "lucide-react";
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
import { guarded } from "@/lib/buildPhase";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estimates | SkaiScraper",
  description: "View and manage project estimates.",
};

export default async function EstimatesPage() {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated") redirect("/sign-in");
  if (ctx.status !== "ok" || !ctx.orgId) {
    return (
      <PageContainer>
        <NoOrgMembershipBanner title="Estimates" />
      </PageContainer>
    );
  }

  const estimates = await guarded(
    "estimates",
    async () => {
      try {
        // Estimates are stored in contractor_invoices with kind='estimate'
        const orgJobs = await prisma.crm_jobs.findMany({
          where: { org_id: ctx.orgId! },
          select: { id: true, insured_name: true, property_address: true },
        });
        const jobMap = new Map(orgJobs.map((j) => [j.id, j]));
        const jobIds = orgJobs.map((j) => j.id);

        if (jobIds.length === 0) return [];

        const data = await prisma.contractor_invoices.findMany({
          where: { job_id: { in: jobIds }, kind: "estimate" },
          orderBy: { created_at: "desc" },
          take: 100,
        });

        return data.map((est) => {
          const totals = est.totals as any;
          const job = jobMap.get(est.job_id);
          return {
            id: est.id,
            estimateNo: est.invoice_no,
            jobId: est.job_id,
            jobName: job?.insured_name || job?.property_address || est.job_id.slice(0, 8),
            total: totals?.total ?? 0,
            status: totals?.status ?? "draft",
            createdAt: est.created_at.toISOString().split("T")[0],
          };
        });
      } catch (err) {
        logger.error("[estimates] DB query failed:", err);
        return [];
      }
    },
    []
  );

  const statusColors: Record<string, string> = {
    draft: "bg-slate-500/20 text-slate-600 dark:text-slate-300",
    sent: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    approved: "bg-green-500/20 text-green-600 dark:text-green-400",
    declined: "bg-red-500/20 text-red-600 dark:text-red-400",
  };

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalValue = estimates.reduce((s, e) => s + e.total, 0);

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="Estimates"
        subtitle="Create and manage project estimates"
        icon={<Calculator className="h-5 w-5" />}
        section="jobs"
      >
        <Button asChild>
          <Link href="/estimates/new">
            <Plus className="mr-2 h-4 w-4" /> New Estimate
          </Link>
        </Button>
      </PageHero>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Total Estimates"
          value={estimates.length}
          icon={<FileText className="h-5 w-5" />}
          intent="info"
        />
        <StatCard
          variant="gradient"
          gradientColor="blue"
          label="Total Value"
          value={fmt(totalValue)}
          icon={<Calculator className="h-5 w-5" />}
        />
        <StatCard
          label="Draft"
          value={estimates.filter((e) => e.status === "draft").length}
          icon={<FileText className="h-5 w-5" />}
          intent="info"
        />
      </div>

      <ContentCard noPadding>
        <DataTable>
          <DataTableHead>
            <Th>Estimate #</Th>
            <Th>Job</Th>
            <Th align="right">Total</Th>
            <Th align="center">Status</Th>
            <Th>Date</Th>
          </DataTableHead>
          <DataTableBody>
            {estimates.length === 0 && (
              <EmptyRow
                colSpan={5}
                message="No estimates yet. Create your first estimate to get started."
              />
            )}
            {estimates.map((est) => (
              <tr
                key={est.id}
                className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <Td mono className="font-medium text-blue-600 dark:text-blue-400">
                  {est.estimateNo}
                </Td>
                <Td>{est.jobName}</Td>
                <Td align="right" mono>
                  {fmt(est.total)}
                </Td>
                <Td align="center">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColors[est.status] || statusColors.draft}`}
                  >
                    {est.status}
                  </span>
                </Td>
                <Td className="text-xs text-slate-500">{est.createdAt}</Td>
              </tr>
            ))}
          </DataTableBody>
        </DataTable>
      </ContentCard>
    </PageContainer>
  );
}
