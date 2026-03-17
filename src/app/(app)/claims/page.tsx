import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import RecordActions from "@/components/RecordActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Claims | SkaiScraper",
  description: "Manage insurance claims — track stages, supplements, and payouts.",
};

type ClaimsSearchParams = {
  stage?: string;
  search?: string;
  page?: string;
};

const CLAIM_STATUSES = [
  { id: "new", label: "New", icon: Plus, color: "bg-blue-500" },
  { id: "in_progress", label: "In Progress", icon: Clock, color: "bg-amber-500" },
  { id: "pending", label: "Pending", icon: Clock, color: "bg-purple-500" },
  { id: "approved", label: "Approved", icon: CheckCircle, color: "bg-green-500" },
];

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="mx-auto max-w-2xl rounded-xl border border-red-500/40 bg-red-50 p-6 dark:bg-red-950">
        <h2 className="mb-2 flex items-center gap-2 text-xl font-semibold text-red-700 dark:text-red-200">
          <AlertTriangle className="h-5 w-5" /> Claims Unavailable
        </h2>
        <p className="text-sm text-red-600 dark:text-red-300">{message}</p>
        <div className="mt-4 flex gap-3">
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
          <Link href="/claims">
            <Button>Retry</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
function EmptyState() {
  return (
    <Card className="p-12 text-center">
      <FileText className="mx-auto h-12 w-12 text-slate-300" />
      <h3 className="mt-4 text-lg font-semibold">No claims yet</h3>
      <p className="mt-2 text-sm text-slate-500">
        Create your first claim to start tracking insurance jobs
      </p>
      <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
        <Link href="/claims/new">
          <Plus className="mr-2 h-4 w-4" />
          New Claim
        </Link>
      </Button>
    </Card>
  );
}

export default async function ClaimsPage({ searchParams }: { searchParams: ClaimsSearchParams }) {
  // Use getOrg with mode: "required" - redirects to /sign-in or /onboarding if no org
  let orgResult;
  try {
    orgResult = await getOrg({ mode: "required" });
  } catch (error: unknown) {
    // CRITICAL: Re-throw NEXT_REDIRECT — Next.js uses thrown errors for redirects
    if (
      error instanceof Error &&
      "digest" in error &&
      String((error as any).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    logger.error("[ClaimsPage] getOrg failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return (
      <ErrorCard message="Session loading error — please refresh the page or sign in again." />
    );
  }

  // If we get here, org is guaranteed (otherwise would have redirected)
  if (!orgResult.ok) {
    // Resilient: show user-friendly error instead of throwing
    logger.error("[ClaimsPage] getOrg returned not-ok without redirecting", {
      reason: orgResult.reason,
    });
    return (
      <ErrorCard message="Unable to resolve your organization. Please sign out and sign back in, or contact support." />
    );
  }

  const userId = orgResult.userId;
  const organizationId = orgResult.orgId;

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const where: any = { orgId: organizationId };
  if (searchParams.stage) where.status = searchParams.stage.toLowerCase();
  if (searchParams.search) {
    where.OR = [
      { claimNumber: { contains: searchParams.search, mode: "insensitive" } },
      { title: { contains: searchParams.search, mode: "insensitive" } },
    ];
  }
  let claims: any[] = [];
  let total = 0;
  let queryFailed = false;
  let errorMessage = "";

  try {
    const [fetchedClaims, fetchedTotal] = await Promise.all([
      prisma.claims.findMany({
        where,
        include: { properties: true, activities: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.claims.count({ where }),
    ]);
    claims = fetchedClaims.map((claim: any) => ({
      ...claim,
      createdAt: claim.createdAt?.toISOString() || null,
      updatedAt: claim.updatedAt?.toISOString() || null,
      dateOfLoss: claim.dateOfLoss?.toISOString() || null,
      activities:
        claim.activities?.map((a: any) => ({
          ...a,
          createdAt: a.createdAt?.toISOString() || null,
        })) || [],
    }));
    total = fetchedTotal;
  } catch (error) {
    logger.error("[ClaimsPage] Prisma query failed", {
      error: error?.message || error,
      organizationId,
      userId,
      stack: error?.stack,
    });
    errorMessage = error?.message || "Database query failed";
    queryFailed = true;
  }

  if (queryFailed) return <ErrorCard message={`Unable to load claims: ${errorMessage}`} />;
  const totalPages = Math.ceil(total / limit);

  // Calculate stats from ALL claims for this org (not just current page)
  let allOrgClaims: any[] = [];
  try {
    allOrgClaims = await prisma.claims.findMany({
      where: { orgId: organizationId },
      select: { status: true, estimatedValue: true, signingStatus: true },
    });
  } catch {
    allOrgClaims = claims; // fallback to current page
  }
  const totalValue = allOrgClaims.reduce((sum: number, c: any) => sum + (c.estimatedValue || 0), 0);
  const claimsByStatus = {
    new: allOrgClaims.filter((c: any) => c.status === "new"),
    in_progress: allOrgClaims.filter((c: any) => c.status === "in_progress"),
    pending: allOrgClaims.filter((c: any) => c.status === "pending"),
    approved: allOrgClaims.filter((c: any) => c.status === "approved"),
  };
  const signedCount = allOrgClaims.filter((c: any) => c.signingStatus === "signed").length;
  const pendingSignatureCount = allOrgClaims.filter(
    (c: any) => !c.signingStatus || c.signingStatus === "pending"
  ).length;

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="jobs"
        title="Claims Workspace"
        subtitle="Manage and track all insurance claims"
        icon={<ClipboardList className="h-5 w-5" />}
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
        <Button asChild className="bg-white text-teal-700 hover:bg-teal-50">
          <Link href="/claims/new">
            <Plus className="mr-2 h-4 w-4" />
            New Claim
          </Link>
        </Button>
      </PageHero>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-6">
        {/* Total Value */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-900/30 dark:to-indigo-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-200">
              <DollarSign className="h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              ${(totalValue / 100).toLocaleString()}
            </p>
            <p className="text-xs text-blue-600">{total} claims</p>
          </CardContent>
        </Card>

        {/* Signing Status Card */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-800 dark:from-emerald-900/30 dark:to-teal-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Signed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {signedCount}
            </p>
            <p className="text-xs text-emerald-600">{pendingSignatureCount} pending</p>
          </CardContent>
        </Card>

        {/* Status Cards */}
        {CLAIM_STATUSES.map((status) => {
          const statusClaims = claimsByStatus[status.id as keyof typeof claimsByStatus] || [];
          const statusValue = statusClaims.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
          const Icon = status.icon;

          return (
            <Card key={status.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <div className={`rounded-full ${status.color} p-1.5`}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  {status.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{statusClaims.length}</p>
                <p className="text-xs text-slate-500">${(statusValue / 100).toLocaleString()}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search & Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <form action="/claims" className="flex gap-4">
            {searchParams.stage && <input type="hidden" name="stage" value={searchParams.stage} />}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="search"
                placeholder="Search by claim # or title..."
                className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900"
                defaultValue={searchParams.search || ""}
              />
            </div>
            <Button type="submit" variant="outline">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {claims.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Claims</h2>
          <div className="grid gap-3">
            {claims.map((claim: any) => {
              const statusColor =
                claim.status === "new"
                  ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  : claim.status === "in_progress"
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    : claim.status === "pending"
                      ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                      : claim.status === "approved"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";

              return (
                <Link key={claim.id} href={`/claims/${claim.id}`}>
                  <Card className="group overflow-hidden border-slate-200/60 transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:hover:border-blue-700">
                    <CardContent className="flex items-center gap-4 p-4">
                      {/* Status dot + info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {claim.title || "Untitled Claim"}
                          </h3>
                          <Badge variant="outline" className={statusColor}>
                            {(claim.status || "new").replace("_", " ")}
                          </Badge>
                          {/* Signing status badge */}
                          {claim.signingStatus === "signed" ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                            >
                              ✅ Signed
                            </Badge>
                          ) : claim.signingStatus === "declined" ? (
                            <Badge
                              variant="outline"
                              className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400"
                            >
                              ❌ Declined
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            >
                              ⏳ Pending
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {claim.claimNumber && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {claim.claimNumber}
                            </span>
                          )}
                          {claim.insured_name && (
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {claim.insured_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {claim.properties?.street || claim.properties?.city
                              ? [
                                  claim.properties.street,
                                  claim.properties.city,
                                  claim.properties.state,
                                  claim.properties.zipCode,
                                ]
                                  .filter(Boolean)
                                  .join(", ")
                              : "No address"}
                          </span>
                          {claim.createdAt && (
                            <span>
                              {new Date(claim.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Value + actions */}
                      <div className="flex shrink-0 items-center gap-3">
                        {claim.estimatedValue > 0 && (
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            ${(claim.estimatedValue / 100).toLocaleString()}
                          </span>
                        )}
                        <RecordActions
                          deleteEndpoint={`/api/claims/${claim.id}`}
                          itemLabel={claim.title || claim.claimNumber || "Claim"}
                          entityType="Claim"
                          isSoftDelete={true}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/claims?page=${page - 1}${searchParams.stage ? `&stage=${searchParams.stage}` : ""}${searchParams.search ? `&search=${encodeURIComponent(searchParams.search)}` : ""}`}
            >
              <Button variant="outline" size="sm">
                ← Previous
              </Button>
            </Link>
          )}
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages} · {total} claims
          </span>
          {page < totalPages && (
            <Link
              href={`/claims?page=${page + 1}${searchParams.stage ? `&stage=${searchParams.stage}` : ""}${searchParams.search ? `&search=${encodeURIComponent(searchParams.search)}` : ""}`}
            >
              <Button variant="outline" size="sm">
                Next →
              </Button>
            </Link>
          )}
        </div>
      )}
    </PageContainer>
  );
}
