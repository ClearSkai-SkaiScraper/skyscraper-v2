// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { Upload } from "lucide-react";
import { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";

import { LeadsImportClient } from "./LeadsImportClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import Leads | SkaiScraper",
  description: "Import leads in bulk from CSV files or CRM integrations.",
};

export default async function LeadsImportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-4xl p-6">
      <PageHero
        section="jobs"
        title="Import Leads"
        subtitle="Upload a CSV to bulk-import leads into your pipeline"
        icon={<Upload className="h-6 w-6" />}
      />
      <LeadsImportClient />
    </div>
  );
}
