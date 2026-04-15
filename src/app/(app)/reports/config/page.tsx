import { Loader2 } from "lucide-react";
import NextDynamic from "next/dynamic";

import { PageHero } from "@/components/layout/PageHero";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getOrg } from "@/lib/org/getOrg";

// CRITICAL: Force client-side rendering to prevent hydration crashes
const ReportBuilderPanel = NextDynamic(
  () =>
    import("@/components/reports/ReportBuilderPanel").then((mod) => ({
      default: mod.ReportBuilderPanel,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        <span className="ml-3 text-slate-700 dark:text-slate-300">Loading Report Builder...</span>
      </div>
    ),
  }
);

export default async function ReportConfigPage() {
  const ctx = await getOrg({ mode: "required" });
  // If we get here, org exists (mode: "required" redirects if no org)
  if (!ctx.ok) throw new Error("Unreachable: mode required should redirect");
  const orgId = ctx.orgId;

  // This version expects you to pick a claimId manually (or you
  // can upgrade this page to include a claim selector dropdown).
  // For now, it's more a "playground" page; the claim builder
  // route at /claims/[claimId]/reports is what you'll use day-to-day per claim.
  const sampleClaim = await prisma.claims.findFirst({
    where: { orgId },
    select: {
      id: true,
      claimNumber: true,
      properties: {
        select: { street: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!sampleClaim) {
    return (
      <div className="p-4">
        <PageHero section="reports" title="Report Generator" subtitle="No claims found" />
        <div className="mt-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">⚠️ No claims found</p>
          <p className="mt-1 text-xs text-amber-700">
            You don&apos;t have any claims yet. Create a claim first, then use the claim-level
            report generator at <code>/claims/[claimId]/reports</code>.
          </p>
        </div>
      </div>
    );
  }

  const propertyAddress = sampleClaim?.properties?.street || "Address not set";

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHero
        section="reports"
        title="Report Generator"
        subtitle={`Using claim ${sampleClaim?.claimNumber || sampleClaim?.id || "N/A"} at ${propertyAddress}`}
      >
        <a
          href="/reports/history"
          className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
        >
          Report History
        </a>
      </PageHero>
      <p className="text-xs text-amber-600">
        💡 Tip: For claim-specific report generation, use the &quot;Reports&quot; tab on each claim
        page
      </p>

      {/* ReportBuilderPanel will render client-side only */}
      <ReportBuilderPanel
        orgId={orgId}
        claimId={sampleClaim?.id || ""}
        defaultType="INSURANCE_CLAIM"
      />
    </div>
  );
}
