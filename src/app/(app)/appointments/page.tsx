import { Calendar } from "lucide-react";
import { Metadata } from "next";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";

import { AppointmentsClient } from "./AppointmentsClient";

export const metadata: Metadata = {
  title: "Appointments | SkaiScraper",
  description: "Manage your appointments and schedule",
};

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  // Soft gate: do not block page; auto-create org when possible
  const ctx = await getActiveOrgContext({ required: true });

  // Extract userId and orgId safely from the context result
  const userId = ctx.ok ? ctx.userId : "";
  const orgId = ctx.ok ? ctx.orgId : "";

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
