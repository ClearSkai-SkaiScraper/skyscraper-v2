import { FileText, Palette } from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";

import BrandingForm from "./BrandingForm";
import { CoverPageBanner } from "./CoverPageBanner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BrandingPage() {
  // Use getOrg with mode: "required" - redirects to /sign-in or /onboarding if no org
  const orgResult = await getOrg({ mode: "required" });

  // If we get here, org is guaranteed (otherwise would have redirected)
  if (!orgResult.ok) {
    throw new Error("Unexpected: getOrg(required) returned not ok without redirecting");
  }

  const orgId = orgResult.orgId;
  const userId = orgResult.userId;

  // Backward-compatible lookup (some older records stored Clerk orgId as orgId)
  const orgIdCandidates = [orgResult.orgId, orgResult.clerkOrgId].filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );

  // Fetch existing branding
  const branding = await prisma.org_branding
    .findFirst({
      where: {
        orgId: { in: orgIdCandidates },
      },
    })
    .catch(() => null);

  return (
    <PageContainer maxWidth="5xl">
      {/* Dismissible banner pointing to Cover Page Builder */}
      <CoverPageBanner />

      <PageHero
        section="settings"
        title="Company Branding"
        description="Set your company name, logo, colors, contact info, and team photo. These details auto-populate every AI report, proposal, contractor packet, and client-facing document across the platform."
        icon={<Palette className="h-6 w-6 text-white" />}
      />

      <div className="mt-8">
        <BrandingForm initial={branding} orgId={orgId} userId={userId} />
      </div>

      {/* Cover Page Builder CTA */}
      <div className="mt-10 rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50 to-blue-50 p-6 dark:border-indigo-800/40 dark:from-indigo-950/40 dark:to-blue-950/30">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-indigo-500/10 p-2.5 dark:bg-indigo-500/20">
              <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Cover Page Builder
              </h3>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                Design a professional cover page for your PDF reports and proposals with live
                preview, custom backgrounds, and your branding applied automatically.
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0 gap-2">
            <Link href="/settings/branding/cover-page">
              <FileText className="h-4 w-4" />
              Customize Cover Page
            </Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
