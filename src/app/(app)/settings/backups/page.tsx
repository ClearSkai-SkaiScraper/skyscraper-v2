/* eslint-disable @typescript-eslint/await-thenable */
// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { Database, HardDrive, Info } from "lucide-react";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { BackupsClient } from "./BackupsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BackupsExportPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ctx = await safeOrgContext();
  if (!ctx.orgId || ctx.status !== "ok") redirect("/settings");

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="settings"
        title="Backups & Data Export"
        subtitle="Export your organization data or review past backup activity"
        icon={<Database className="h-5 w-5" />}
      />

      <div className="grid gap-6">
        {/* ─── Info Banner ─── */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Data Ownership:</strong> Your data belongs to you. Export claims, reports, and
            organization information at any time in CSV or JSON format. Exports include all records
            associated with your organization.
          </div>
        </div>

        {/* ─── Export Data ─── */}
        <PageSectionCard
          title="Export Data"
          subtitle="Download your claims, reports, and organization data"
        >
          <BackupsClient />
        </PageSectionCard>

        {/* ─── Storage Overview ─── */}
        <PageSectionCard
          title="Storage Overview"
          subtitle="Current data usage for your organization"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                <HardDrive className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-[color:var(--text)]">—</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Total Claims</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-[color:var(--text)]">—</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Total Reports</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-slate-50 p-4 dark:bg-slate-800/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/40">
                <HardDrive className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-[color:var(--text)]">—</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">File Storage Used</div>
              </div>
            </div>
          </div>
        </PageSectionCard>
      </div>
    </PageContainer>
  );
}
