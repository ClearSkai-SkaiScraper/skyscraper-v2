/**
 * Insurance Claim Report Builder
 * Location: /reports/claims/new
 *
 * 11-step wizard for generating professional insurance claim PDF reports.
 * Differs from Claims Workspace (/claims) which manages active claim records.
 *
 * This is a REPORT GENERATOR, not a claims management tool.
 */

import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import ClaimsWizard from "@/features/claims/wizard/ClaimsWizard";
import { getTenant } from "@/lib/auth/tenant";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ClaimsWizardPage({
  searchParams,
}: {
  searchParams: { reportId?: string; templateId?: string };
}) {
  const orgId = await getTenant();
  if (!orgId) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <h1 className="mb-4 text-2xl font-bold text-amber-900">🚀 Initialize Workspace</h1>
          <p className="mb-6 text-amber-800">
            No organization detected. Complete onboarding to start the Claims Builder.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild>
              <Link href="/onboarding/start">Start Onboarding</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Provide resumeReportId via query param if present
  const resumeReportId = searchParams.reportId;

  return (
    <PageContainer maxWidth="6xl">
      <PageHero
        section="reports"
        title="AI Claims Report Builder"
        subtitle="Generate professional insurance claim reports with AI-powered assistance"
        icon={<FileText className="h-6 w-6" />}
      >
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/reports/hub">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/reports/history">Report History</Link>
          </Button>
        </div>
      </PageHero>

      <div className="-mt-4">
        <ClaimsWizard resumeReportId={resumeReportId} />
      </div>
    </PageContainer>
  );
}
