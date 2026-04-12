// src/app/(app)/claims-ready-folder/[claimId]/sections/layout.tsx
"use client";

import { ChevronLeft, ChevronRight, Download, FileText, Home } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { type FolderSectionKey, SECTION_METADATA } from "@/lib/claims-folder/folderSchema";
import { cn } from "@/lib/utils";

// Define section order for navigation
const SECTION_ORDER: FolderSectionKey[] = [
  "cover-sheet",
  "table-of-contents",
  "executive-summary",
  "weather-cause-of-loss",
  "inspection-overview",
  "damage-grids",
  "photo-evidence",
  "test-cuts",
  "code-compliance",
  "scope-pricing",
  "supplements-variances",
  "repair-justification",
  "contractor-summary",
  "timeline",
  "homeowner-statement",
  "adjuster-cover-letter",
  "claim-checklist",
  "digital-signatures",
  "attachments",
];

export default function SectionsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  // Extract current section from pathname
  const currentSection = pathname?.split("/").pop() as FolderSectionKey | undefined;
  const currentIndex = currentSection ? SECTION_ORDER.indexOf(currentSection) : -1;
  const prevSection = currentIndex > 0 ? SECTION_ORDER[currentIndex - 1] : null;
  const nextSection =
    currentIndex < SECTION_ORDER.length - 1 ? SECTION_ORDER[currentIndex + 1] : null;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-64 overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <Link href={`/claims-ready-folder/${claimId}`}>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Home className="h-4 w-4" />
              Back to Overview
            </Button>
          </Link>
        </div>

        <nav className="space-y-1 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sections ({SECTION_ORDER.length})
          </p>
          {SECTION_ORDER.map((section, index) => {
            const meta = SECTION_METADATA[section];
            const isActive = currentSection === section;

            return (
              <Link
                key={section}
                href={`/claims-ready-folder/${claimId}/sections/${section}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-200 text-xs font-medium dark:bg-slate-700">
                  {index + 1}
                </span>
                <span className="truncate">{meta.title}</span>
                {meta.required && <span className="ml-auto text-amber-500">•</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="min-h-screen p-4 md:p-8">{children}</div>

        {/* Bottom Navigation */}
        <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
            {prevSection ? (
              <Link href={`/claims-ready-folder/${claimId}/sections/${prevSection}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  {SECTION_METADATA[prevSection].title}
                </Button>
              </Link>
            ) : (
              <div />
            )}

            <Link href={`/claims-ready-folder/${claimId}`}>
              <Button variant="ghost" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                View All Sections
              </Button>
            </Link>

            {nextSection ? (
              <Link href={`/claims-ready-folder/${claimId}/sections/${nextSection}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  {SECTION_METADATA[nextSection].title}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href={`/claims-ready-folder/${claimId}`}>
                <Button size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Package
                </Button>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
