/**
 * Job Pipeline - Central Hub for ALL Active Jobs
 *
 * The single source of truth for job management:
 * - Insurance Claims (claim)
 * - Repair Jobs (repair)
 * - Out of Pocket (out_of_pocket)
 * - Financed Jobs (financed)
 *
 * Features:
 * - Total Pipeline Value widget
 * - Search & Filter across all jobs
 * - AI Recommendations widget
 * - Category breakdown bubbles
 * - Drag & drop between stages
 */

import {
  Brain,
  CreditCard,
  DollarSign,
  FileText,
  Filter,
  Lightbulb,
  Search,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { JobsCategoryBoard } from "./JobsCategoryBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Job Pipeline | SkaiScraper",
  description: "Central hub for all active jobs — claims, repair, out-of-pocket, and financed.",
};

// Category configuration - includes claims for full visibility
const CATEGORIES = [
  {
    id: "claim",
    label: "Insurance Claims",
    description: "Active insurance claims",
    icon: FileText,
    color: "border-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
  },
  {
    id: "repair",
    label: "Repair Jobs",
    description: "Standard repair and service work",
    icon: Wrench,
    color: "border-slate-500",
    bgColor: "bg-slate-50 dark:bg-slate-900/30",
  },
  {
    id: "out_of_pocket",
    label: "Out of Pocket",
    description: "Customer pays directly",
    icon: DollarSign,
    color: "border-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-900/30",
  },
  {
    id: "financed",
    label: "Financed Jobs",
    description: "Financing through partners",
    icon: CreditCard,
    color: "border-green-500",
    bgColor: "bg-green-50 dark:bg-green-900/30",
  },
];

async function getCategoryStats(orgId: string) {
  try {
    const stats = await prisma.leads.groupBy({
      by: ["jobCategory", "stage"],
      where: { orgId },
      _count: { id: true },
      _sum: { value: true },
    });
    return stats;
  } catch (error) {
    logger.error("[getCategoryStats] Error:", error);
    return [];
  }
}

async function getJobsByCategory(orgId: string) {
  try {
    // Get ALL leads — real data only, no demo fallback
    // Leads with 'general' category show as repair in pipeline
    const leads = await prisma.leads.findMany({
      where: {
        orgId,
      },
      include: {
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            street: true,
            city: true,
            state: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    // Also get claims and format them as pipeline items
    const claims = await prisma.claims.findMany({
      where: { orgId },
      select: {
        id: true,
        title: true,
        status: true,
        lifecycle_stage: true,
        estimatedValue: true,
        claimNumber: true,
        carrier: true,
        updatedAt: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
            contacts: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    // Map lifecycle_stage → pipeline stage (1:1, matches stageToLifecycle in /api/pipeline/move)
    const lifecycleToStage: Record<string, string> = {
      FILED: "new",
      ADJUSTER_REVIEW: "qualified",
      BUILD: "proposal",
      APPROVED: "negotiation",
      COMPLETED: "won",
      // Fallbacks for stages not directly used by pipeline drag-and-drop
      DENIED: "new",
      APPEAL: "negotiation",
      DEPRECIATION: "won",
    };

    // Status-based fallback for claims that don't have lifecycle_stage set yet
    const statusFallback: Record<string, string> = {
      new: "new",
      in_progress: "negotiation",
      completed: "won",
      closed: "won",
    };

    // Convert claims to pipeline format
    const claimItems = claims.map((claim) => ({
      id: claim.id,
      title: claim.title,
      jobCategory: "claim",
      stage: claim.lifecycle_stage
        ? (lifecycleToStage[claim.lifecycle_stage] ?? "new")
        : (statusFallback[claim.status ?? ""] ?? "new"),
      value: claim.estimatedValue || 0,
      contacts: {
        firstName: claim.properties?.contacts?.firstName || "Insured",
        lastName: claim.properties?.contacts?.lastName || "",
        street: claim.properties?.street || "",
        city: claim.properties?.city || "",
        state: claim.properties?.state || "",
      },
      updatedAt: claim.updatedAt,
      claimNumber: claim.claimNumber,
      carrier: claim.carrier,
    }));

    // Normalize lead categories — 'general' and unknown map to 'repair'
    const normalizedLeads = leads.map((lead) => ({
      ...lead,
      jobCategory:
        lead.jobCategory &&
        ["claim", "repair", "out_of_pocket", "financed"].includes(lead.jobCategory)
          ? lead.jobCategory
          : "repair",
    }));

    return [...claimItems, ...normalizedLeads];
  } catch (error) {
    logger.error("[getJobsByCategory] Error:", error);
    return [];
  }
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: searchQuery } = await searchParams;
  let orgId: string | null = null;
  let jobs: any[] = [];
  let stats: any[] = [];

  try {
    // Use safeOrgContext — matches the resolver used by leads/claims API routes
    // This ensures we query the same org where data was created
    const orgResult = await safeOrgContext();
    orgId = orgResult.ok ? orgResult.orgId : null;

    if (orgId) {
      // Real data only — no demo mode fallback
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      [jobs, stats] = await Promise.all([getJobsByCategory(orgId), getCategoryStats(orgId)]);
    }
    // If no orgId, continue with empty state — don't redirect
  } catch (error) {
    // Re-throw redirect errors (Next.js uses throw for redirects)
    if ((error as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw error;
    logger.error("[PipelinePage] Error:", error);
  }

  // Group jobs by category (includes claims)
  // Apply search filter if query provided
  const lowerQ = searchQuery?.toLowerCase() || "";
  const filteredJobs = lowerQ
    ? jobs.filter(
        (j) =>
          j.title?.toLowerCase().includes(lowerQ) ||
          j.insuredName?.toLowerCase().includes(lowerQ) ||
          j.address?.toLowerCase().includes(lowerQ) ||
          j.claimNumber?.toLowerCase().includes(lowerQ)
      )
    : jobs;

  const jobsByCategory = {
    claim: filteredJobs.filter((j) => j.jobCategory === "claim"),
    repair: filteredJobs.filter((j) => j.jobCategory === "repair"),
    out_of_pocket: filteredJobs.filter((j) => j.jobCategory === "out_of_pocket"),
    financed: filteredJobs.filter((j) => j.jobCategory === "financed"),
  };

  // Calculate totals per category
  const categoryTotals = CATEGORIES.map((cat) => {
    const catJobs = jobsByCategory[cat.id as keyof typeof jobsByCategory] || [];
    const total = catJobs.reduce((sum, j) => sum + (j.value || 0), 0);
    return { ...cat, count: catJobs.length, total };
  });

  return (
    <PageContainer maxWidth="full">
      <PageHero
        section="jobs"
        title="Job Pipeline"
        subtitle="Central hub for all active jobs — claims, retail, financed, and repairs"
        icon={<TrendingUp className="h-5 w-5" />}
      >
        <Button
          asChild
          variant="outline"
          className="border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          <Link href="/leads">
            <Filter className="mr-2 h-4 w-4" />
            View Leads
          </Link>
        </Button>
        <Button asChild className="bg-white text-teal-700 hover:bg-teal-50">
          <Link href="/leads/new">+ New Lead</Link>
        </Button>
      </PageHero>

      {/* Top Stats Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Total Pipeline Value */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-800 dark:from-emerald-900/30 dark:to-teal-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
              <DollarSign className="h-4 w-4" />
              Total Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              ${(categoryTotals.reduce((sum, c) => sum + (c.total || 0), 0) / 100).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              {categoryTotals.reduce((sum, c) => sum + c.count, 0)} active jobs
            </p>
          </CardContent>
        </Card>

        {/* Search & Filter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Search className="h-4 w-4" />
              Quick Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form method="GET" className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="q"
                  defaultValue={searchQuery || ""}
                  placeholder="Search jobs..."
                  className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <Button variant="outline" size="sm" type="submit">
                <Filter className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 dark:border-purple-800 dark:from-purple-900/30 dark:to-indigo-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-purple-800 dark:text-purple-200">
              <Brain className="h-4 w-4" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-3 w-3 text-amber-500" />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {categoryTotals.find((c) => c.id === "claim")?.count || 0} claims need follow-up
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3 w-3 text-purple-500" />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  $
                  {(
                    (categoryTotals.find((c) => c.id === "out_of_pocket")?.total || 0) / 100
                  ).toLocaleString()}{" "}
                  in retail opportunities
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Summary Bubbles - 4 columns side by side */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categoryTotals.map((cat) => {
          const Icon = cat.icon;
          const workspaceHref = cat.id === "claim" ? "/claims" : "/jobs/retail";
          return (
            <Link
              key={cat.id}
              href={workspaceHref}
              className={`group relative overflow-hidden rounded-xl border-2 ${cat.color} ${cat.bgColor} p-3 shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg`}
            >
              <div className="relative z-10">
                {/* Header */}
                <div className="mb-2 flex items-center gap-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 shadow-sm dark:bg-slate-800/80">
                    <Icon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{cat.label}</h3>
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white/90 px-2 text-sm font-bold text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white">
                    {cat.count}
                  </span>
                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                    ${((cat.total || 0) / 100).toLocaleString()}
                  </span>
                </div>

                {/* Hover hint */}
                <p className="mt-2 text-xs text-slate-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-400">
                  Click to open workspace →
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Board */}
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-slate-100" />}>
        <JobsCategoryBoard initialJobs={jobs} />
      </Suspense>
    </PageContainer>
  );
}
