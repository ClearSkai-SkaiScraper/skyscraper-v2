import { currentUser } from "@clerk/nextjs/server";
import { Inbox, Upload } from "lucide-react";
import { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import EmptyState from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import Leads | SkaiScraper",
  description: "Import leads in bulk from CSV files or CRM integrations.",
};

export default async function LeadsImportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-3xl p-6">
      <PageHero
        section="jobs"
        title="Import Leads"
        subtitle="Bulk CSV/CRM ingestion for rapid lead onboarding"
        icon={<Upload className="h-6 w-6" />}
      />
      <EmptyState
        title="Import Leads"
        description="Bulk CSV/CRM ingestion coming soon. This route is live and protected; final workflow will include mapping, validation, and duplicate merge suggestions."
        icon={<Inbox className="h-10 w-10 text-blue-600" />}
      />
      <div className="rounded-lg border border-border bg-card p-4">
        <ul className="ml-6 list-disc space-y-1 text-sm text-muted-foreground">
          <li>CSV column auto-mapping</li>
          <li>Duplicate detection & merge suggestions</li>
          <li>Source attribution tracking</li>
          <li>Post-import validation summary</li>
        </ul>
      </div>
    </div>
  );
}
