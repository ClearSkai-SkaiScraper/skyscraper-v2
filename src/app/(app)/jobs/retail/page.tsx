/**
 * Retail Workspace - Out of Pocket, Financing, and Repair Jobs
 *
 * This workspace handles all non-insurance jobs:
 * - Out of Pocket: Customer pays directly
 * - Financed: Through financing partners
 * - Repair: Standard repair and service work
 */

import {
  Briefcase,
  CreditCard,
  DollarSign,
  Filter,
  Plus,
  Search,
  TrendingUp,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
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

const JOB_CATEGORIES = [
  { id: "out_of_pocket", label: "Out of Pocket", icon: DollarSign, color: "bg-amber-500" },
  { id: "financed", label: "Financed", icon: CreditCard, color: "bg-green-500" },
  { id: "repair", label: "Repair", icon: Wrench, color: "bg-slate-500" },
];

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
    const orgResult = await getActiveOrgContext({ required: true });
    orgId = orgResult.ok ? orgResult.orgId : null;
  } catch (error) {
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
  const totalJobs = jobs.length;

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

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Total Value */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-900/30 dark:to-orange-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
              <DollarSign className="h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              ${(totalValue / 100).toLocaleString()}
            </p>
            <p className="text-xs text-amber-600">{totalJobs} jobs</p>
          </CardContent>
        </Card>

        {/* Category Cards */}
        {JOB_CATEGORIES.map((cat) => {
          const catJobs = jobsByCategory[cat.id as keyof typeof jobsByCategory] || [];
          const catValue = catJobs.reduce((sum, j) => sum + (j.value || 0), 0);
          const Icon = cat.icon;

          return (
            <Card key={cat.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <div className={`rounded-full ${cat.color} p-1.5`}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  {cat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{catJobs.length}</p>
                <p className="text-xs text-slate-500">${(catValue / 100).toLocaleString()}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search & Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search retail jobs..."
                className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Jobs</h2>

        {jobs.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold">No retail jobs yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Route a lead from the pipeline or create a new job
            </p>
            <Button asChild className="mt-4 bg-amber-600 hover:bg-amber-700">
              <Link href="/jobs/retail/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New Job
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {jobs.map((job) => {
              return (
                <Link key={job.id} href={`/jobs/retail/${job.id}`}>
                  <Card className="group overflow-hidden border-slate-200/60 transition-all hover:border-amber-300 hover:shadow-md dark:border-slate-800 dark:hover:border-amber-700">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {job.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className={
                              job.stage === "new"
                                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : job.stage === "qualified"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }
                          >
                            {job.stage}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          >
                            {JOB_CATEGORIES.find((c) => c.id === job.jobCategory)?.label ||
                              job.jobCategory}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {job.contacts && (
                            <span>
                              {job.contacts.firstName} {job.contacts.lastName}
                            </span>
                          )}
                          {job.contacts?.city && (
                            <span>
                              {job.contacts.city}, {job.contacts.state}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          ${((job.value || 0) / 100).toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
