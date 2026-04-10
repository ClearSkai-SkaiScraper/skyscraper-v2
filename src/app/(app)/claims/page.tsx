/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */
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
import { NoClaimsEmpty } from "@/components/ui/EmptyStatePresets";
import { getTenant } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
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

interface ClaimsPageProps {
  searchParams: Promise<ClaimsSearchParams>;
}

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

export default async function ClaimsPage({ searchParams }: ClaimsPageProps) {
  try {
    const organizationId = await getTenant();
    const params = await searchParams;

    if (!organizationId) {
      return (
        <ErrorCard message="Unable to resolve your organization. Please sign out and sign back in, or contact support." />
      );
    }

    const page = Math.max(1, parseInt(params?.page || "1", 10) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let claims: any[] = [];
    let total = 0;
    let queryFailed = false;
    let errorMessage = "";

    try {
      // Use raw SQL to avoid Prisma model validation issues with missing columns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rawClaims: any[];
      let countResult: [{ count: number }];

      // Build search condition if present
      const searchTerm = params.search ? `%${params.search}%` : null;

      if (params.stage && searchTerm) {
        rawClaims = await prisma.$queryRaw<any[]>`
          SELECT 
            c.id, c."orgId", c.title, c."claimNumber", c.status, c."damageType",
            c."estimatedValue", c.insured_name, c."createdAt", c."updatedAt", c."dateOfLoss",
            p.street AS property_street, p.city AS property_city, 
            p.state AS property_state, p."zipCode" AS property_zip
          FROM claims c
          LEFT JOIN properties p ON c."propertyId" = p.id
          WHERE c."orgId" = ${organizationId} 
            AND c.status = ${params.stage.toLowerCase()}
            AND (c."claimNumber" ILIKE ${searchTerm} OR c.title ILIKE ${searchTerm})
          ORDER BY c."createdAt" DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countResult = await prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM claims 
          WHERE "orgId" = ${organizationId} 
            AND status = ${params.stage.toLowerCase()}
            AND ("claimNumber" ILIKE ${searchTerm} OR title ILIKE ${searchTerm})
        `;
      } else if (params.stage) {
        rawClaims = await prisma.$queryRaw<any[]>`
          SELECT 
            c.id, c."orgId", c.title, c."claimNumber", c.status, c."damageType",
            c."estimatedValue", c.insured_name, c."createdAt", c."updatedAt", c."dateOfLoss",
            p.street AS property_street, p.city AS property_city, 
            p.state AS property_state, p."zipCode" AS property_zip
          FROM claims c
          LEFT JOIN properties p ON c."propertyId" = p.id
          WHERE c."orgId" = ${organizationId} AND c.status = ${params.stage.toLowerCase()}
          ORDER BY c."createdAt" DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countResult = await prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM claims WHERE "orgId" = ${organizationId} AND status = ${params.stage.toLowerCase()}
        `;
      } else if (searchTerm) {
        rawClaims = await prisma.$queryRaw<any[]>`
          SELECT 
            c.id, c."orgId", c.title, c."claimNumber", c.status, c."damageType",
            c."estimatedValue", c.insured_name, c."createdAt", c."updatedAt", c."dateOfLoss",
            p.street AS property_street, p.city AS property_city, 
            p.state AS property_state, p."zipCode" AS property_zip
          FROM claims c
          LEFT JOIN properties p ON c."propertyId" = p.id
          WHERE c."orgId" = ${organizationId}
            AND (c."claimNumber" ILIKE ${searchTerm} OR c.title ILIKE ${searchTerm})
          ORDER BY c."createdAt" DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countResult = await prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM claims 
          WHERE "orgId" = ${organizationId}
            AND ("claimNumber" ILIKE ${searchTerm} OR title ILIKE ${searchTerm})
        `;
      } else {
        rawClaims = await prisma.$queryRaw<any[]>`
          SELECT 
            c.id, c."orgId", c.title, c."claimNumber", c.status, c."damageType",
            c."estimatedValue", c.insured_name, c."createdAt", c."updatedAt", c."dateOfLoss",
            p.street AS property_street, p.city AS property_city, 
            p.state AS property_state, p."zipCode" AS property_zip
          FROM claims c
          LEFT JOIN properties p ON c."propertyId" = p.id
          WHERE c."orgId" = ${organizationId}
          ORDER BY c."createdAt" DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countResult = await prisma.$queryRaw<[{ count: number }]>`
          SELECT COUNT(*)::int as count FROM claims WHERE "orgId" = ${organizationId}
        `;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      claims = rawClaims.map((claim: any) => ({
        id: claim.id,
        orgId: claim.orgId,
        title: claim.title,
        claimNumber: claim.claimNumber,
        status: claim.status,
        damageType: claim.damageType,
        estimatedValue: claim.estimatedValue,
        insured_name: claim.insured_name,
        createdAt: claim.createdAt?.toISOString?.() || null,
        updatedAt: claim.updatedAt?.toISOString?.() || null,
        dateOfLoss: claim.dateOfLoss?.toISOString?.() || null,
        properties: {
          street: claim.property_street,
          city: claim.property_city,
          state: claim.property_state,
          zipCode: claim.property_zip,
        },
        activities: [], // Skip activities for now - can add later
      }));
      total = Number(countResult[0]?.count || 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error("[ClaimsPage] Raw SQL query failed", {
        error: error?.message || error,
        organizationId,
        stack: error?.stack,
      });
      errorMessage = error?.message || "Database query failed";
      queryFailed = true;
    }

    if (queryFailed) return <ErrorCard message={`Unable to load claims: ${errorMessage}`} />;
    const totalPages = Math.ceil(total / limit);

    // Calculate stats from ALL claims for this org (not just current page)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allOrgClaims: any[] = [];
    try {
      allOrgClaims = await prisma.$queryRaw<any[]>`
        SELECT status, "estimatedValue" FROM claims WHERE "orgId" = ${organizationId}
      `;
    } catch {
      allOrgClaims = claims; // fallback to current page
    }

    // Safely try to fetch signing stats (column may not exist in DB yet)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let signingData: any[] = [];
    try {
      signingData = await prisma.$queryRaw<any[]>`
        SELECT "signingStatus" FROM claims WHERE "orgId" = ${organizationId}
      `;
    } catch {
      // signingStatus column may not exist — that's ok
    }

    const totalValue = allOrgClaims.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, c: any) => sum + (c.estimatedValue || 0),
      0
    );
    const claimsByStatus = {
      new: allOrgClaims.filter((c: any) => c.status === "new"),
      in_progress: allOrgClaims.filter((c: any) => c.status === "in_progress"),
      pending: allOrgClaims.filter((c: any) => c.status === "pending"),
      approved: allOrgClaims.filter((c: any) => c.status === "approved"),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signedCount = signingData.filter((c: any) => c.signingStatus === "signed").length;
    const pendingSignatureCount = signingData.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              {params.stage && <input type="hidden" name="stage" value={params.stage} />}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="search"
                  placeholder="Search by claim # or title..."
                  className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900"
                  defaultValue={params.search || ""}
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
          <NoClaimsEmpty />
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
                href={`/claims?page=${page - 1}${params.stage ? `&stage=${params.stage}` : ""}${params.search ? `&search=${encodeURIComponent(params.search)}` : ""}`}
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
                href={`/claims?page=${page + 1}${params.stage ? `&stage=${params.stage}` : ""}${params.search ? `&search=${encodeURIComponent(params.search)}` : ""}`}
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
  } catch (outerError: unknown) {
    // CRITICAL: Re-throw Next.js redirect errors — they use thrown errors internally
    if (
      outerError instanceof Error &&
      "digest" in outerError &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      typeof (outerError as any).digest === "string" &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (outerError as any).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw outerError;
    }

    const errMsg = outerError instanceof Error ? outerError.message : String(outerError);
    logger.error("[ClaimsPage] UNHANDLED CRASH", {
      error: errMsg,
      stack: outerError instanceof Error ? outerError.stack : undefined,
    });

    return (
      <ErrorCard message={`Claims failed to load: ${errMsg}. Please try refreshing the page.`} />
    );
  }
}
