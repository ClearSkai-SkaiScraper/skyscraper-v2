// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string };
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { orgId } = await getCurrentUserPermissions();

  if (!orgId) {
    redirect("/onboarding/start");
  }

  const query = searchParams.q || "";
  const type = searchParams.type || "all";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results: any = {
    claims: [],
    leads: [],
    jobs: [],
    clients: [],
  };

  try {
    if (query) {
      // Search across all entities
      if (type === "all" || type === "claims") {
        results.claims = await prisma.claims.findMany({
          where: {
            orgId,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { claimNumber: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 10,
        });
      }

      if (type === "all" || type === "leads") {
        results.leads = await prisma.leads.findMany({
          where: {
            orgId,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 10,
        });
      }

      if (type === "all" || type === "jobs") {
        results.jobs = await prisma.jobs.findMany({
          where: {
            orgId,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { jobType: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 10,
        });
      }

      if (type === "all" || type === "clients") {
        results.clients = await prisma.client.findMany({
          where: {
            orgId,
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 10,
        });
      }
    }
  } catch (error) {
    logger.error("[SearchPage] Database error:", error);
  }

  const totalResults =
    results.claims.length + results.leads.length + results.jobs.length + results.clients.length;

  const filterLink = (filterType: string, label: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (filterType !== "all") params.set("type", filterType);
    const href = `/search${params.toString() ? `?${params.toString()}` : ""}`;
    return (
      <Link key={filterType} href={href}>
        <Badge variant={type === filterType ? "default" : "outline"} className="cursor-pointer">
          {label}
        </Badge>
      </Link>
    );
  };

  return (
    <>
      <PageHero
        title="Search Results"
        subtitle={
          query
            ? `Found ${totalResults} results for "${query}"`
            : "Enter a search query to find claims, leads, jobs, and clients"
        }
        icon={<SearchIcon className="h-6 w-6" />}
      />
      <PageContainer>
        {/* Filter Badges - Now Clickable */}
        <div className="mb-6 flex gap-2">
          {filterLink("all", "All")}
          {filterLink("claims", "Claims")}
          {filterLink("leads", "Leads")}
          {filterLink("jobs", "Jobs")}
          {filterLink("clients", "Clients")}
        </div>

        <div className="space-y-6">
          {/* Claims Results */}
          {results.claims.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Claims ({results.claims.length})</CardTitle>
              </CardHeader>
              <CardContent>
                // eslint-disable-next-line react/jsx-no-comment-textnodes
                <div className="space-y-2">
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {results.claims.map((claim: any) => (
                    <Link
                      key={claim.id}
                      href={`/claims/${claim.id}`}
                      className="flex justify-between border-b border-slate-200 pb-2 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <div>
                        <p className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                          {claim.title || claim.claimNumber}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {claim.claimNumber}
                        </p>
                      </div>
                      <Badge>{claim.status}</Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leads Results */}
          {results.leads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Leads ({results.leads.length})</CardTitle>
              </CardHeader>
              <CardContent>
                // eslint-disable-next-line react/jsx-no-comment-textnodes
                <div className="space-y-2">
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {results.leads.map((lead: any) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="flex justify-between border-b border-slate-200 pb-2 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <div>
                        <p className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                          {lead.title}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{lead.source}</p>
                      </div>
                      <Badge variant="outline">{lead.stage}</Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Jobs Results */}
          {results.jobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Jobs ({results.jobs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                // eslint-disable-next-line react/jsx-no-comment-textnodes
                <div className="space-y-2">
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {results.jobs.map((job: any) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex justify-between border-b border-slate-200 pb-2 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <div>
                        <p className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                          {job.jobNumber || job.jobType}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{job.jobType}</p>
                      </div>
                      <Badge>{job.status}</Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clients Results */}
          {results.clients.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Clients ({results.clients.length})</CardTitle>
              </CardHeader>
              <CardContent>
                // eslint-disable-next-line react/jsx-no-comment-textnodes
                <div className="space-y-2">
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {results.clients.map((client: any) => (
                    <Link
                      key={client.id}
                      href={`/portal/clients/${client.id}`}
                      className="flex justify-between border-b border-slate-200 pb-2 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <div>
                        <p className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                          {client.firstName} {client.lastName}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{client.email}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {query && totalResults === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No results found for &quot;{query}&quot;
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  );
}
