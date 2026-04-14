import { Activity, Mail, PlusIcon, Target, TrendingUp, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { LeadRoutingDropdown } from "@/components/leads/LeadRoutingDropdown";
import RecordActions from "@/components/RecordActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Leads | SkaiScraper",
  description: "View and manage all sales leads, routing, and pipeline status.",
};

type LeadsSearchParams = {
  search?: string;
  page?: string;
};

export default async function LeadsPage({ searchParams }: { searchParams: LeadsSearchParams }) {
  // Use getOrg with mode: "required" - redirects to /sign-in or /onboarding if no org
  const orgResult = await getOrg({ mode: "required" });

  // If we get here, org is guaranteed (otherwise would have redirected)
  if (!orgResult.ok) {
    throw new Error("Unexpected: getOrg(required) returned not ok without redirecting");
  }

  const orgId = orgResult.orgId;
  let leads: Array<{
    id: string;
    contactId: string;
    title: string;
    stage: string;
    value: number | null;
    createdAt: Date;
    jobCategory: string | null;
  }> = [];
  let contactsById = new Map<
    string,
    { id: string; firstName: string; lastName: string; email: string | null }
  >();
  let totalLeads = 0;

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    if (orgId) {
      // ⚠️ DEMO SEEDING REMOVED FROM RENDER PATH
      // Demo data is seeded via /api/dev/seed-demo or pnpm run seed:minimal-demo

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereClause: any = {
        orgId,
        archivedAt: null,
        AND: [
          // Only show "lead" category and uncategorised. Retail (out_of_pocket, financed, repair) → Retail Workspace.
          // Insurance claims are created via /api/claims/intake, not as leads.
          { OR: [{ jobCategory: "lead" }, { jobCategory: null }] },
          ...(searchParams.search
            ? [{ title: { contains: searchParams.search, mode: "insensitive" } }]
            : []),
        ],
      };

      // Show only unrouted leads (retail out-of-pocket/financed/repair live in Retail Workspace)
      const [fetchedLeads, fetchedTotal] = await Promise.all([
        prisma.leads.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          select: {
            id: true,
            contactId: true,
            title: true,
            stage: true,
            value: true,
            createdAt: true,
            jobCategory: true,
          },
        }),
        prisma.leads.count({ where: whereClause }),
      ]);
      leads = fetchedLeads;
      totalLeads = fetchedTotal;

      const contactIds = Array.from(new Set(leads.map((l) => l.contactId).filter(Boolean)));
      if (contactIds.length > 0) {
        const contacts = await prisma.contacts.findMany({
          where: { id: { in: contactIds }, orgId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });
        contactsById = new Map(contacts.map((c) => [c.id, c]));
      }
    }
  } catch (error) {
    logger.error("[LeadsPage] Failed to fetch leads:", error);
    // Show error state so user knows something went wrong
    leads = [];
    totalLeads = 0;
    // We'll render an error banner below
  }
    contactsById = new Map();
  }

  const newLeadsCount = leads.filter((l) => l.stage === "new").length;
  const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="leads"
        title="Lead Routing"
        subtitle="Route new leads to the right workspace and next step"
        icon={<Target className="h-5 w-5" />}
      >
        <Button
          asChild
          variant="outline"
          className="border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          <Link href="/pipeline">
            <TrendingUp className="mr-2 h-4 w-4" />
            View Pipeline
          </Link>
        </Button>
        <Button asChild className="bg-white text-emerald-700 hover:bg-emerald-50">
          <Link href="/leads/new">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add New Lead
          </Link>
        </Button>
      </PageHero>

      <div className="space-y-6">
        {/* Stats Row - Card-based like Retail Workspace */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 dark:border-emerald-800 dark:from-emerald-900/30 dark:to-green-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                <Target className="h-4 w-4" />
                Pipeline View
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href="/pipeline"
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Open Pipeline →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="rounded-full bg-emerald-500 p-1.5">
                  <Users className="h-3 w-3 text-white" />
                </div>
                Lead Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{newLeadsCount}</p>
              <p className="text-xs text-slate-500">Total routed: {leads.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="rounded-full bg-emerald-500 p-1.5">
                  <TrendingUp className="h-3 w-3 text-white" />
                </div>
                Estimated Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">
                ${totalValue > 0 ? (totalValue / 100).toLocaleString() : "0"}
              </p>
              <p className="text-xs text-slate-500">Total opportunity</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter - Matches Retail & Claims */}
        <Card>
          <CardContent className="p-4">
            <form action="/leads" className="flex gap-4">
              <div className="relative flex-1">
                <Activity className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="search"
                  placeholder="Search leads by title..."
                  className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-slate-900"
                  defaultValue={searchParams.search || ""}
                />
              </div>
              <Button type="submit" variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lead Routing Queue - Card-based rows like Retail Workspace */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Lead Routing Queue</h2>
          {leads.length === 0 ? (
            <Card className="p-12 text-center">
              <Mail className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold">No leads yet</h3>
              <p className="mt-2 text-sm text-slate-500">Start by adding your first lead!</p>
              <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                <Link href="/leads/new">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add First Lead
                </Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {leads.map((lead) => {
                const contact = contactsById.get(lead.contactId);
                const isUnrouted = !lead.jobCategory || lead.jobCategory === "lead";

                return (
                  <Card
                    key={lead.id}
                    className="transition-all hover:border-emerald-300 hover:shadow-md"
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 p-3">
                        <Target className="h-5 w-5 text-white" />
                      </div>

                      <Link href={`/leads/${lead.id}`} className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{lead.title}</h3>
                        {contact && (
                          <p className="text-sm text-slate-500">
                            {contact.firstName} {contact.lastName}
                          </p>
                        )}
                      </Link>

                      <div className="flex shrink-0 items-center gap-3">
                        {isUnrouted && (
                          <LeadRoutingDropdown
                            leadId={lead.id}
                            currentCategory={lead.jobCategory || undefined}
                          />
                        )}
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              lead.stage === "new"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : lead.stage === "qualified"
                                  ? "border-green-300 bg-green-50 text-green-700"
                                  : lead.stage === "proposal"
                                    ? "border-teal-300 bg-teal-50 text-teal-700"
                                    : lead.stage === "won"
                                      ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                                      : "border-slate-300 bg-slate-50 text-slate-700"
                            }
                          >
                            {lead.stage}
                          </Badge>
                          {lead.jobCategory && lead.jobCategory !== "lead" && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                              {lead.jobCategory.replace("_", " ")}
                            </Badge>
                          )}
                          {lead.value && (
                            <p className="mt-1 text-sm font-semibold">
                              ${(lead.value / 100).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <RecordActions
                          deleteEndpoint={`/api/leads/${lead.id}`}
                          itemLabel={lead.title || "Lead"}
                          entityType="Lead"
                          isSoftDelete={true}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {(() => {
                const totalPages = Math.ceil(totalLeads / limit);
                if (totalPages <= 1) return null;
                return (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    {page > 1 && (
                      <Link
                        href={`/leads?page=${page - 1}${searchParams.search ? `&search=${encodeURIComponent(searchParams.search)}` : ""}`}
                      >
                        <Button variant="outline" size="sm">
                          ← Previous
                        </Button>
                      </Link>
                    )}
                    <span className="text-sm text-slate-500">
                      Page {page} of {totalPages} · {totalLeads} leads
                    </span>
                    {page < totalPages && (
                      <Link
                        href={`/leads?page=${page + 1}${searchParams.search ? `&search=${encodeURIComponent(searchParams.search)}` : ""}`}
                      >
                        <Button variant="outline" size="sm">
                          Next →
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
