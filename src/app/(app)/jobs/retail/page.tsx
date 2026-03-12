/**
 * Retail Workspace - Out of Pocket, Financing, and Repair Jobs
 *
 * This workspace handles all non-insurance jobs:
 * - Out of Pocket: Customer pays directly
 * - Financed: Through financing partners
 * - Repair: Standard repair and service work
 */

import { Briefcase, Plus, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import RetailJobsClient from "./RetailJobsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retail Jobs | SkaiScraper",
  description: "Manage out-of-pocket, financed, and repair jobs.",
};
interface RetailJob {
  id: string;
  title: string;
  jobCategory: string;
  stage: string;
  value: number | null;
  createdAt: Date;
  contacts: {
    firstName: string | null;
    lastName: string | null;
    street: string | null;
    city: string | null;
    state: string | null;
  } | null;
}

async function getRetailJobs(orgId: string): Promise<RetailJob[]> {
  try {
    const jobs = await prisma.leads.findMany({
      where: {
        orgId,
        jobCategory: { in: ["out_of_pocket", "financed", "repair"] },
      },
      include: {
        contacts: {
          select: {
            firstName: true,
            lastName: true,
            street: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return jobs as RetailJob[];
  } catch (error) {
    logger.error("[getRetailJobs] Error:", error);
    return [];
  }
}

export default async function RetailWorkspacePage() {
  let orgId: string | null = null;
  try {
    const orgResult = await safeOrgContext();
    orgId = orgResult.ok ? orgResult.orgId : null;
  } catch (error) {
    // Re-throw redirect errors (Next.js uses throw for redirects)
    if ((error as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw error;
    logger.error("[RetailWorkspacePage] Org context error:", error);
  }

  let jobs: RetailJob[] = [];
  if (orgId) {
    jobs = await getRetailJobs(orgId);
  }

  // Group by category
  const jobsByCategory = {
    out_of_pocket: jobs.filter((j) => j.jobCategory === "out_of_pocket"),
    financed: jobs.filter((j) => j.jobCategory === "financed"),
    repair: jobs.filter((j) => j.jobCategory === "repair"),
  };

  // Calculate totals
  const totalValue = jobs.reduce((sum, j) => sum + (j.value || 0), 0);

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="jobs"
        title="Retail Workspace"
        subtitle="Out of Pocket, Financing, and Repair Jobs"
        icon={<Briefcase className="h-5 w-5" />}
      >
        <Button
          asChild
          variant="outline"
          className="border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          <Link href="/pipeline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Pipeline
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          <Link href="/leads/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Link>
        </Button>
        <Button asChild className="bg-white text-teal-700 hover:bg-teal-50">
          <Link href="/jobs/retail/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Job
          </Link>
        </Button>
      </PageHero>

      <RetailJobsClient jobs={jobs} totalValue={totalValue} jobsByCategory={jobsByCategory} />
    </PageContainer>
  );
}
