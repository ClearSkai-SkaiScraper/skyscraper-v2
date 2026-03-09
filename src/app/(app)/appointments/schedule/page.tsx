/**
 * JOB SCHEDULING PAGE
 * Enterprise-grade job scheduling for Claims & Retail Workspaces
 * Supports: Inspections, Installs, Repairs, Mitigation, Follow-ups
 */

import { CalendarDays } from "lucide-react";
import { Metadata } from "next";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { JobScheduleClient } from "./_components/JobScheduleClient";

export const metadata: Metadata = {
  title: "Job Scheduling | SkaiScraper",
  description: "Schedule and manage jobs, inspections, and site visits",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    type?: string;
    title?: string;
    address?: string;
    date?: string;
    notes?: string;
    orderId?: string;
    openDialog?: string;
  };
}

export default async function JobSchedulePage({ searchParams }: PageProps) {
  const ctx = await safeOrgContext();

  const userId = ctx.ok ? (ctx.userId ?? "") : "";
  const orgId = ctx.ok ? (ctx.orgId ?? "") : "";

  // Pre-fill data from query params (e.g., from Orders page)
  const prefillData = searchParams.type
    ? {
        type: searchParams.type,
        title: searchParams.title || "",
        address: searchParams.address || "",
        date: searchParams.date || "",
        notes: searchParams.notes || "",
        orderId: searchParams.orderId || "",
        openDialog: searchParams.openDialog === "true",
      }
    : undefined;

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="jobs"
        title="Job Scheduling"
        subtitle="Schedule inspections, installs, repairs, and follow-ups across all workspaces"
        icon={<CalendarDays className="h-6 w-6" />}
      />
      <JobScheduleClient orgId={orgId} userId={userId} prefillData={prefillData} />
    </PageContainer>
  );
}
