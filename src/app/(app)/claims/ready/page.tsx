// ============================================================================
// #176: Claims Ready Folder
// ============================================================================
// Server component showing claims that are ready for submission/review.
// Filters claims with status "approved" or lifecycle_stage COMPLETED/APPROVED.
// ============================================================================

import { CheckCircle, Download, ExternalLink, FolderCheck, MapPin, Package } from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NoClaimsEmpty } from "@/components/ui/EmptyStatePresets";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClaimsReadyPage() {
  const orgCtx = await safeOrgContext();

  if (orgCtx.status === "unauthenticated") {
    return (
      <PageContainer maxWidth="7xl">
        <PageSectionCard title="Sign In Required">
          <p className="text-sm text-slate-500">Please sign in to view ready claims.</p>
          <Button asChild className="mt-4">
            <Link href="/sign-in?redirect_url=/claims/ready">Sign In</Link>
          </Button>
        </PageSectionCard>
      </PageContainer>
    );
  }

  if (!orgCtx.orgId) {
    return (
      <PageContainer maxWidth="7xl">
        <PageSectionCard title="Organization Required">
          <p className="text-sm text-slate-500">
            An active organization is required to view claims.
          </p>
          <Button asChild className="mt-4">
            <Link href="/onboarding/start">Get Started</Link>
          </Button>
        </PageSectionCard>
      </PageContainer>
    );
  }

  const organizationId = orgCtx.orgId;

  // Fetch claims that are "ready" — approved status or lifecycle COMPLETED/APPROVED
  let readyClaims: any[] = [];
  let fetchError: string | null = null;

  try {
    const claims = await prisma.claims.findMany({
      where: {
        orgId: organizationId,
        OR: [
          { status: "approved" },
          { status: "complete" },
          { status: "ready" },
          { lifecycle_stage: "COMPLETED" },
          { lifecycle_stage: "APPROVED" },
        ],
      },
      include: {
        properties: true,
        activities: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    readyClaims = claims.map((claim: any) => ({
      ...claim,
      createdAt: claim.createdAt?.toISOString() || null,
      updatedAt: claim.updatedAt?.toISOString() || null,
      dateOfLoss: claim.dateOfLoss?.toISOString() || null,
    }));
  } catch (err) {
    logger.error("[ClaimsReadyPage] Query failed:", err?.message);
    fetchError = err?.message || "Failed to load ready claims";
  }

  if (fetchError) {
    return (
      <PageContainer maxWidth="7xl">
        <PageHero
          section="jobs"
          title="Ready for Submission"
          subtitle="Claims ready to be submitted to carriers"
          icon={<FolderCheck className="h-5 w-5" />}
        />
        <PageSectionCard title="Error">
          <p className="text-sm text-red-600">{fetchError}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/claims">← Back to Claims</Link>
          </Button>
        </PageSectionCard>
      </PageContainer>
    );
  }

  const totalValue = readyClaims.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="jobs"
        title="Ready for Submission"
        subtitle={`${readyClaims.length} claim${readyClaims.length !== 1 ? "s" : ""} ready — $${(totalValue / 100).toLocaleString()} total value`}
        icon={<FolderCheck className="h-5 w-5" />}
      >
        <div className="flex gap-2">
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/claims">← All Claims</Link>
          </Button>
        </div>
      </PageHero>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <PageSectionCard>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/50">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{readyClaims.length}</p>
              <p className="text-xs text-slate-500">Ready Claims</p>
            </div>
          </div>
        </PageSectionCard>
        <PageSectionCard>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/50">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">${(totalValue / 100).toLocaleString()}</p>
              <p className="text-xs text-slate-500">Total Value</p>
            </div>
          </div>
        </PageSectionCard>
        <PageSectionCard>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/50">
              <Download className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {readyClaims.filter((c) => c.lifecycle_stage === "COMPLETED").length}
              </p>
              <p className="text-xs text-slate-500">Fully Completed</p>
            </div>
          </div>
        </PageSectionCard>
      </div>

      {/* Claims List */}
      {readyClaims.length === 0 ? (
        <PageSectionCard>
          <NoClaimsEmpty
            title="No claims ready yet"
            description="Claims will appear here once they're approved or marked as complete."
            ctaLabel="View All Claims"
            ctaHref="/claims"
          />
        </PageSectionCard>
      ) : (
        <PageSectionCard
          title="Ready Claims"
          subtitle="These claims are ready for carrier submission or download"
        >
          <div className="space-y-3">
            {readyClaims.map((claim) => {
              const isCompleted = claim.lifecycle_stage === "COMPLETED";
              const statusLabel = isCompleted
                ? "Completed"
                : claim.status === "approved"
                  ? "Approved"
                  : "Ready";
              const statusColor = isCompleted
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";

              return (
                <div
                  key={claim.id}
                  className="flex items-center gap-4 rounded-lg border border-[color:var(--border)] p-4 transition-all hover:shadow-md"
                >
                  <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-3">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{claim.title || "Untitled Claim"}</h3>
                    <p className="text-sm text-slate-500">
                      {claim.claimNumber && <span>#{claim.claimNumber}</span>}
                      {claim.properties?.city && (
                        <span className="ml-2 inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {claim.properties.city}, {claim.properties.state}
                        </span>
                      )}
                      {claim.dateOfLoss && (
                        <span className="ml-2">
                          DOL: {new Date(claim.dateOfLoss).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {claim.estimatedValue > 0 && (
                      <span className="text-sm font-semibold">
                        ${(claim.estimatedValue / 100).toLocaleString()}
                      </span>
                    )}
                    <Badge variant="outline" className={statusColor}>
                      {statusLabel}
                    </Badge>
                    <div className="flex gap-1">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/claims/${claim.id}`}>
                          <ExternalLink className="mr-1 h-3 w-3" />
                          View
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="default">
                        <Link href={`/api/export/complete-packet?claimId=${claim.id}`}>
                          <Download className="mr-1 h-3 w-3" />
                          Package
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </PageSectionCard>
      )}
    </PageContainer>
  );
}
