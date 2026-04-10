/* eslint-disable react/jsx-no-comment-textnodes, no-restricted-syntax, @typescript-eslint/no-explicit-any */
// src/app/(app)/claims/[claimId]/layout.tsx
import { ArrowLeft, DollarSign, FileText, Shield, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { resolveClaim } from "@/lib/claims/resolveClaim";
import { logger } from "@/lib/logger";
import { getOrg, isDemoRoute } from "@/lib/org/getOrg";

// 🔥 CRITICAL FIX: Disable RSC caching - claim data MUST be fresh per-request
// Without this, Next.js may cache the "NOT_FOUND" response and return it even
// when the claim exists, causing "claim not found" errors on valid claims.
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { ClaimHeaderActions } from "./_components/ClaimHeaderActions";
import ClaimTabs from "./_components/ClaimTabs";
import { getClaim } from "./loader";

interface ClaimLayoutProps {
  children: ReactNode;
  params: Promise<{ claimId: string }>;
}

export default async function ClaimLayout({ children, params }: ClaimLayoutProps) {
  const { claimId } = await params;

  logger.debug("[ClaimLayout] Loading claim", { claimId });

  // 🔥 FIX: Canonicalize URL if using claimNumber instead of ID
  try {
    const result = await resolveClaim(claimId);
    if (result.ok && result.canonicalId !== claimId) {
      logger.debug("[ClaimLayout] Redirecting to canonical ID", {
        canonicalId: result.canonicalId,
      });
      // Get the current path segment after [claimId]
      // Since we're in layout, we don't have the full path, so just redirect to overview
      redirect(`/claims/${result.canonicalId}/overview`);
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // CRITICAL: Re-throw NEXT_REDIRECT — Next.js uses thrown errors for redirects
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    logger.error("[ClaimLayout] Canonicalization failed", { error });
    // Continue to normal flow - getClaim will handle the NOT_FOUND
  }

  // Safe data loading - NEVER throws
  let result: Awaited<ReturnType<typeof getClaim>>;
  try {
    result = await getClaim(claimId);
  } catch (error: unknown) {
    // CRITICAL: Re-throw NEXT_REDIRECT — Next.js uses thrown errors for redirects
    if (
      error instanceof Error &&
      "digest" in error &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      String((error as any).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    logger.error("[ClaimLayout] getClaim threw unexpectedly", {
      claimId,
      error: error instanceof Error ? error.message : String(error),
    });
    result = {
      ok: false,
      reason: "DB_ERROR",
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Handle no org case
  if (!result.ok && result.reason === "NO_ORG") {
    // DEMO OVERRIDE: Allow rendering without org for "test" alias
    if (isDemoRoute(claimId)) {
      const now = new Date();
      const claim = {
        id: "test",
        claimNumber: "CLM-DEMO-001",
        status: "active" as const,
        title: "John Smith — Demo Claim",
        description: "Demo claim for workspace preview",
        insured_name: "John Smith",
        homeownerEmail: "john.smith@example.com",
        carrier: "Demo Carrier",
        policyNumber: "POL-DEMO-123",
        adjusterName: "Alex Adjuster",
        adjusterEmail: "alex.adjuster@example.com",
        adjusterPhone: "(555) 010-2000",
        damageType: "STORM",
        dateOfLoss: new Date("2025-12-01"),
        lifecycle_stage: "FILED",
        createdAt: now,
        updatedAt: now,
        orgId: "demo-org",
        propertyId: null,
        priority: null,
        estimatedValue: 0,
        approvedValue: 0,
        deductible: 0,
        coverPhotoUrl: null,
        coverPhotoId: null,
        property: { address: "123 Demo St, Phoenix, AZ 85001" },
      };

      return (
        <div className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          {/* Modern Header — Blue gradient */}
          <header className="sticky top-0 z-20 border-b border-blue-700/30 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-lg">
            <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <Link
                    href="/claims"
                    className="rounded-xl bg-white/15 p-2 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/25"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="max-w-[200px] truncate text-lg font-bold text-white sm:max-w-[320px]">
                        {claim.title || claim.claimNumber}
                      </h1>
                      <Badge className="border-white/30 bg-white/15 text-white backdrop-blur-sm">
                        {claim.lifecycle_stage || claim.status}
                      </Badge>
                      {claim.damageType && (
                        <Badge className="border-white/30 bg-white/15 text-white backdrop-blur-sm">
                          {claim.damageType}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-blue-100">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {claim.insured_name || "Unknown Insured"}
                      </span>
                      {claim.carrier && (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {claim.carrier}
                        </span>
                      )}
                      {claim.claimNumber && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {claim.claimNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job Value Pill */}
                {(() => {
                  const jobValue = (claim as any).estimatedJobValue;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const jobStatus = (claim as any).jobValueStatus;
                  const legacyValue = claim.estimatedValue ?? 0;
                  const displayValue = jobValue ? jobValue / 100 : legacyValue;
                  const label =
                    jobStatus === "approved" && jobValue ? "Approved Value" : "Est. Value";
                  if (displayValue <= 0) return null;
                  return (
                    <div className="hidden items-center gap-2 sm:flex">
                      <div className="rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                          <DollarSign className="h-3.5 w-3.5" />
                          {displayValue.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          })}
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-blue-200">
                          {label}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Tab bar — clean bottom border style */}
            <div className="mx-auto max-w-7xl px-4 md:px-6">
              <ClaimTabs claimId={claimId} />
            </div>
          </header>

          {/* MAIN CONTENT — full width, no sidebars */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      );
    }

    // NOT demo and NO_ORG → redirect to onboarding
    // Claims workspace REQUIRES an org
    logger.debug("[ClaimLayout] NO_ORG for non-demo claim, redirecting to onboarding");
    redirect("/onboarding");
  }

  // Handle claim not found
  if (!result.ok) {
    logger.error("[ClaimLayout] Claim load failed", { reason: result.reason });

    // STALE DEMO URL REDIRECT: If this looks like ANY demo claim URL,
    // redirect to the universal /claims/test route
    if (claimId.startsWith("demo-claim-")) {
      const orgResult = await getOrg({ mode: "optional" });
      if (orgResult.ok) {
        logger.debug("[ClaimLayout] Stale demo URL detected, redirecting", { from: claimId });
        redirect(`/claims/test/overview`);
      }
    }

    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">
              Claim not found
            </h2>
            <p className="mb-4 text-slate-600 dark:text-slate-400">
              This claim may have been deleted or you may not have access to it.
            </p>
          </div>

          <div className="mb-6 rounded-lg bg-slate-100 p-4 text-left dark:bg-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong>Common causes:</strong>
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-slate-500 dark:text-slate-400">
              <li>Claim was created in a different organization</li>
              <li>Organization membership was changed</li>
              <li>Claim was deleted</li>
              <li>Link is from an old session</li>
            </ul>
          </div>

          {/* Debug panel — only in development */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
              <h3 className="mb-1 text-xs font-semibold text-amber-900">Dev Debug:</h3>
              <div className="space-y-0.5 font-mono text-xs text-amber-800">
                <p>ID: {claimId}</p>
                <p>Reason: {result.reason}</p>
                {result.detail && <p>Detail: {result.detail}</p>}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <a
              href="/claims"
              className="rounded-lg bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
            >
              Back to Claims List
            </a>
            <a
              href="/dashboard"
              className="rounded-lg border border-slate-300 px-4 py-2 text-center text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const claim = result.claim;
  logger.debug("[ClaimLayout] Loaded claim", { claimNumber: claim.claimNumber });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Modern Header — Blue gradient */}
      <header className="sticky top-0 z-20 border-b border-blue-700/30 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <Link
                href="/claims"
                className="rounded-xl bg-white/15 p-2 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1
                    className="max-w-[200px] truncate text-lg font-bold text-white sm:max-w-[320px]"
                    title={claim.title || claim.claimNumber || ""}
                  >
                    {claim.title || claim.claimNumber}
                  </h1>
                  <Badge className="border-white/30 bg-white/15 text-white backdrop-blur-sm">
                    {claim.lifecycle_stage || claim.status}
                  </Badge>
                  {claim.damageType && (
                    <Badge className="border-white/30 bg-white/15 text-white backdrop-blur-sm">
                      {claim.damageType}
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-blue-100">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {(claim as any).insured_name || "Unknown Insured"}
                  </span>
                  {claim.carrier && (
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {claim.carrier}
                    </span>
                  )}
                  {claim.claimNumber && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {claim.claimNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons + Job Value */}
            <div className="flex items-center gap-3">
              <ClaimHeaderActions
                claimId={claimId}
                claimTitle={claim.title || claim.claimNumber || "Claim"}
              />
              {(() => {
                const jobValue = (claim as any).estimatedJobValue;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const jobStatus = (claim as any).jobValueStatus;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const legacyValue = (claim as any).estimatedValue;
                const displayValue = jobValue ? jobValue / 100 : (legacyValue ?? 0);
                const label =
                  jobStatus === "approved" && jobValue ? "Approved Value" : "Est. Value";
                if (displayValue <= 0) return null;
                return (
                  <div className="hidden items-center gap-2 sm:flex">
                    <div className="rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                        <DollarSign className="h-3.5 w-3.5" />
                        {displayValue.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-blue-200">
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Tab bar — clean bottom border style */}
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <ClaimTabs claimId={claimId} />
        </div>
      </header>

      {/* MAIN CONTENT — full width, no sidebars */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto min-w-0 max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
