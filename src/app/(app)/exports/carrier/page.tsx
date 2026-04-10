// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { FileText, Package, Shield, Upload } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";

import { getExportableProjects } from "./actions";
import CarrierExportClient from "./CarrierExportClient";

export const dynamic = "force-dynamic";

export default async function CarrierExportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const projects = await getExportableProjects();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <PageHero
        title="Carrier Export Builder"
        subtitle="Package your project files, photos, reports, and documentation in a carrier-ready format for insurance submission"
        icon={<Package className="h-8 w-8" />}
        section="jobs"
      />

      {/* How It Works */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              1. Select a Project
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Choose a project with documents, photos, and reports ready for packaging
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
            <Shield className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              2. Review &amp; Customize
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Select which sections to include — scope, photos, weather reports, estimates
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/80 p-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
            <Upload className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              3. Export Package
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Generate a professional, carrier-compliant export ready for submission
            </p>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white/60 p-12 text-center dark:border-slate-600 dark:bg-slate-900/40">
          <Package className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
            No projects available for export
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Create projects with documents and photos to generate carrier export packages
          </p>
        </div>
      ) : (
        <CarrierExportClient projects={projects} />
      )}
    </div>
  );
}
