// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { Hammer, History, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { TradesToolJobPicker } from "@/components/trades/TradesToolJobPicker";
import { Button } from "@/components/ui/button";
import { PATHS } from "@/lib/paths";

import DamageBuilderClient from "./client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Damage & Inspection Builder • SkaiScraper" };

export default async function Page({
  searchParams,
}: {
  searchParams: { leadId?: string; jobId?: string };
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const leadId = searchParams?.leadId ?? "";
  const jobId = searchParams?.jobId ?? "";

  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="Damage & Inspection Builder"
        subtitle="Upload inspection photos, then AI analyzes damage with building codes & compliance for the job address"
        icon={<Hammer className="h-5 w-5" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={PATHS.AI_DAMAGE_HISTORY}>
              <History className="mr-1 h-4 w-4" /> History
            </Link>
          </Button>
          <Button variant="default" size="sm" asChild>
            <Link href={PATHS.REPORT_NEW}>New Report</Link>
          </Button>
        </div>
      </PageHero>

      {/* Workflow info banner */}
      <PageSectionCard>
        <div className="flex items-start gap-4 rounded-lg border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-4 dark:border-sky-800 dark:from-sky-950/30 dark:to-blue-950/30">
          <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-600 dark:text-sky-400" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[color:var(--text)]">How It Works</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong>Step 1:</strong> Upload your inspection photos from the field.{" "}
              <strong>Step 2:</strong> AI detects damage types, severity, and locations.{" "}
              <strong>Step 3:</strong> Get building code compliance, material specs, and
              manufacturer references automatically matched to the job&apos;s property address.{" "}
              <strong>Step 4:</strong> Export a professional damage report.
            </p>
          </div>
        </div>
      </PageSectionCard>

      <TradesToolJobPicker label="Select job context:" />
      <DamageBuilderClient leadId={leadId} jobId={jobId} />
    </PageContainer>
  );
}
