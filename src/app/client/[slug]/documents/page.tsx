/* eslint-disable @typescript-eslint/no-unused-vars */
import { FileText, FolderOpen } from "lucide-react";

interface ClientDocumentsPageProps {
  params: { slug: string };
}

export default function ClientDocumentsPage({ params }: ClientDocumentsPageProps) {
  const { slug } = params;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Documents</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Reports, files, photos, and important paperwork related to your home.
        </p>
      </header>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/20">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-200">Documents vs. Shared</h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              The <strong>Shared</strong> tab shows documents your contractor has specifically
              shared with you. This <strong>Documents</strong> section is for all project-related
              files, including internal documents visible to you.
            </p>
            <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              Visit the <strong>Shared</strong> tab to view documents your contractor has shared
              with you.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <FolderOpen className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">No documents yet</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Check the <strong>Shared</strong> tab to see files your contractor has shared with
              you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
