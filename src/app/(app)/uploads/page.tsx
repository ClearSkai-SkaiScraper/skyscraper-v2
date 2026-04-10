// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { FileText, FolderOpen, Image, Upload } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Uploads & Assets | SkaiScraper",
  description: "Manage uploaded documents, photos, and project assets.",
};

export default async function UploadsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="settings"
        title="Uploads & Assets"
        subtitle="Manage all your uploaded documents, photos, and project assets"
        icon={<FolderOpen className="h-5 w-5" />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Image className="h-4 w-4 text-blue-500" /> Photos
          </div>
          <p className="mt-2 text-3xl font-bold">—</p>
          <p className="text-xs text-slate-400">Uploaded images</p>
        </div>
        <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <FileText className="h-4 w-4 text-emerald-500" /> Documents
          </div>
          <p className="mt-2 text-3xl font-bold">—</p>
          <p className="text-xs text-slate-400">PDFs & reports</p>
        </div>
        <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Upload className="h-4 w-4 text-purple-500" /> Total Storage
          </div>
          <p className="mt-2 text-3xl font-bold">—</p>
          <p className="text-xs text-slate-400">Storage used</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200/50 bg-white/80 p-8 text-center backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/80">
        <FolderOpen className="mx-auto mb-3 h-10 w-10 text-slate-400" />
        <h3 className="text-lg font-semibold">Asset Library</h3>
        <p className="mt-1 text-sm text-slate-500">
          Your uploaded photos, documents, and assets will be organized here. Upload files through
          claims, reports, or the file manager.
        </p>
      </div>
    </PageContainer>
  );
}
