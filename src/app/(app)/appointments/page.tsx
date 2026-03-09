import { Calendar } from "lucide-react";
import { Metadata } from "next";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { AppointmentsClient } from "./AppointmentsClient";

export const metadata: Metadata = {
  title: "Appointments | SkaiScraper",
  description: "Manage your appointments and schedule",
};

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  // Soft gate: do not block page; gracefully handle missing org
  let userId = "";
  let orgId = "";
  try {
    const ctx = await safeOrgContext();
    userId = ctx.ok ? (ctx.userId ?? "") : "";
    orgId = ctx.ok ? (ctx.orgId ?? "") : "";
  } catch (error: unknown) {
    // Re-throw redirect errors (Next.js uses these for navigation)
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    // Swallow org-resolution failures — page renders with empty state
  }

  return (
    <PageContainer>
      <PageHero
        section="jobs"
        title="Appointments & Scheduling"
        subtitle="Schedule inspections, follow-ups, and final walkthroughs — all in one place"
        icon={<Calendar className="h-6 w-6" />}
      />
      <AppointmentsClient currentUserId={userId} orgId={orgId} />
    </PageContainer>
  );
}
