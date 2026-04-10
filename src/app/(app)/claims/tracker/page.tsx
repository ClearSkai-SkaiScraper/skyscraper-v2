import { auth } from "@clerk/nextjs/server";
import { ArrowLeftIcon, LayoutGrid, List, Plus, Settings } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import ClaimsPipeline from "@/components/claims/ClaimsPipeline";
import { Button } from "@/components/ui/button";
import { NoClaimsEmpty } from "@/components/ui/EmptyStatePresets";
import { getTenant } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Claims Pipeline Tracker | SkaiScraper",
  description: "Visual pipeline view of all insurance claims",
};

type ClaimStage =
  | "FILED"
  | "ADJUSTER_REVIEW"
  | "APPROVED"
  | "DENIED"
  | "APPEAL"
  | "BUILD"
  | "COMPLETED"
  | "DEPRECIATION";

interface PipelineClaim {
  id: string;
  claimNumber: string;
  status: string;
  estimatedValue: number | null;
  properties: {
    street: string | null;
    contacts: { firstName: string | null; lastName: string | null }[];
  };
}

async function getClaimsForPipeline(orgId: string) {
  let claims: PipelineClaim[] = [];
  try {
    const raw = await prisma.claims.findMany({
      where: { orgId },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        estimatedValue: true,
        properties: {
          select: {
            street: true,
            contacts: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    claims = raw as unknown as PipelineClaim[];
  } catch (err) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2022") {
      logger.warn("[ClaimsTracker] Missing column – pipeline empty");
    } else {
      logger.warn("[ClaimsTracker] Unexpected claims query error", err);
    }
    claims = [];
  }

  return claims.map((claim) => {
    let lifecycleStage: ClaimStage = "FILED";
    const status = claim.status?.toLowerCase();
    if (status === "new" || status === "filed") lifecycleStage = "FILED";
    else if (status === "in_progress" || status === "review") lifecycleStage = "ADJUSTER_REVIEW";
    else if (status === "approved") lifecycleStage = "APPROVED";
    else if (status === "denied") lifecycleStage = "DENIED";
    else if (status === "appeal") lifecycleStage = "APPEAL";
    else if (status === "build") lifecycleStage = "BUILD";
    else if (status === "completed") lifecycleStage = "COMPLETED";

    // Derive insured name from first property contact (contacts is a one-to-many relation)
    const contactsList = claim.properties?.contacts;
    const firstContact =
      Array.isArray(contactsList) && contactsList.length > 0 ? contactsList[0] : null;
    const insured_name = firstContact
      ? `${firstContact.firstName || ""} ${firstContact.lastName || ""}`.trim() || null
      : null;

    return {
      id: claim.id,
      claimNumber: claim.claimNumber,
      lifecycleStage,
      insured_name,
      exposureCents: claim.estimatedValue,
      property: claim.properties,
    };
  });
}

export default async function ClaimsTrackerPage() {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const orgId = await getTenant();

  if (!orgId) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">No Organization Access</h1>
        <p className="mb-6 text-muted-foreground">
          You need to be linked to an organization to view claims.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const claims = await getClaimsForPipeline(orgId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto space-y-6 py-6">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-6">
            <Link
              href="/claims"
              className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Claims
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <nav className="flex items-center gap-4">
              <Link
                href="/claims"
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <List className="h-4 w-4" />
                List View
              </Link>
              <Link
                href="/claims/tracker"
                className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white"
              >
                <LayoutGrid className="h-4 w-4" />
                Pipeline View
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild size="sm">
              <Link href="/claims/new">
                <Plus className="h-4 w-4" />
                New Claim
              </Link>
            </Button>
            <Link
              href="/settings"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="px-2">
          <h1 className="text-3xl font-bold text-white">Claims Pipeline</h1>
          <p className="mt-1 text-slate-400">
            Drag and drop claims between stages to update their status
          </p>
        </div>

        {/* Pipeline Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold text-white">{claims.length}</div>
            <div className="text-xs text-slate-400">Total Claims</div>
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="text-2xl font-bold text-blue-400">
              {claims.filter((c) => c.lifecycleStage === "FILED").length}
            </div>
            <div className="text-xs text-blue-300/70">Filed</div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="text-2xl font-bold text-amber-400">
              {claims.filter((c) => c.lifecycleStage === "ADJUSTER_REVIEW").length}
            </div>
            <div className="text-xs text-amber-300/70">In Review</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="text-2xl font-bold text-emerald-400">
              {claims.filter((c) => c.lifecycleStage === "APPROVED").length}
            </div>
            <div className="text-xs text-emerald-300/70">Approved</div>
          </div>
        </div>

        {/* Pipeline Board */}
        <Suspense
          fallback={
            <div className="flex h-96 items-center justify-center">
              <div className="text-slate-400">Loading pipeline...</div>
            </div>
          }
        >
          <ClaimsPipeline claims={claims as any} />
        </Suspense>

        {claims.length === 0 && <NoClaimsEmpty />}
      </div>
    </div>
  );
}
