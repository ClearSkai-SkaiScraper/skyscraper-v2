// app/(dashboard)/reports/claims/page.tsx

import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import { ClaimSelector } from "@/components/reports/ClaimSelector";
import { ReportBuilderPanel } from "@/components/reports/ReportBuilderPanel";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Deprecated owner lookup replaced with safeOrgContext gating

export default async function AiClaimsReportPage({
  searchParams,
}: {
  searchParams: { claimId?: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgCtx = await safeOrgContext();

  // Auto-onboarding handled by safeOrgContext
  if (orgCtx.status === "unauthenticated") {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-xl font-semibold">AI Claims Report</h1>
        <p className="text-sm text-muted-foreground">Sign in required.</p>
      </div>
    );
  }

  // If still no org after auto-onboard (rare), show error
  if (!orgCtx.orgId) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-xl font-semibold">AI Claims Report</h1>
        <p className="text-sm text-muted-foreground">Setting up workspace...</p>
      </div>
    );
  }

  const orgId = orgCtx.orgId;

  // Load all claims for selector
  const rawClaims = await prisma.claims.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      claimNumber: true,
      dateOfLoss: true,
      properties: {
        select: {
          street: true,
          city: true,
          state: true,
        },
      },
    },
  });

  // Map to include propertyAddress
  const allClaims = rawClaims.map((c) => ({
    id: c.id,
    claimNumber: c.claimNumber,
    dateOfLoss: c.dateOfLoss,
    propertyAddress: c.properties
      ? [c.properties.street, c.properties.city, c.properties.state].filter(Boolean).join(", ")
      : null,
  }));

  // Use selected claims or default to most recent
  const selectedClaimId = searchParams.claimId || allClaims[0]?.id;
  const claims = allClaims.find((c) => c.id === selectedClaimId) || allClaims[0];

  if (!claims) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-xl font-semibold">AI Claims Report</h1>
        <p className="text-sm text-muted-foreground">
          You don't have any claims yet. Create a claims first, then return here to generate a
          report.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHero
        title="AI Claims Report"
        subtitle={`Claim ${claims.claimNumber || claims.id} • ${claims.propertyAddress} • ${claims.dateOfLoss ? new Date(claims.dateOfLoss).toLocaleDateString() : "No DOL set"}`}
      >
        <div className="flex items-center gap-3">
          <ClaimSelector claims={allClaims} selectedClaimId={claims.id} />
          <Link
            href="/reports/history"
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
          >
            Report History
          </Link>
        </div>
      </PageHero>

      <ReportBuilderPanel orgId={orgId} claimId={claims.id} defaultType="INSURANCE_CLAIM" />
    </div>
  );
}
