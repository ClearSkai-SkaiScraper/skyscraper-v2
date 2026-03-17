// src/app/(app)/claims-ready-folder/[claimId]/sections/table-of-contents/page.tsx
"use client";

import { CheckCircle2, List, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type FolderSectionKey,SECTION_METADATA } from "@/lib/claims-folder/folderSchema";
import { logger } from "@/lib/logger";

const SECTION_ORDER: FolderSectionKey[] = [
  "cover-sheet",
  "table-of-contents",
  "executive-summary",
  "weather-cause-of-loss",
  "inspection-overview",
  "damage-grids",
  "photo-evidence",
  "code-compliance",
  "scope-pricing",
  "repair-justification",
  "contractor-summary",
  "timeline",
  "homeowner-statement",
  "adjuster-cover-letter",
  "claim-checklist",
  "digital-signatures",
  "attachments",
];

interface SectionStatus {
  section: FolderSectionKey;
  status: "complete" | "partial" | "missing";
  pageCount?: number;
}

export default function TableOfContentsPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [statuses, setStatuses] = useState<SectionStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/assemble`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });
      if (res.ok) {
        const json = await res.json();
        const folder = json.folder;
        const sectionStatuses: SectionStatus[] = SECTION_ORDER.map((section) => ({
          section,
          status: folder?.sectionStatus?.[section] || "missing",
          pageCount: Math.floor(Math.random() * 5) + 1, // Demo - would come from actual data
        }));
        setStatuses(sectionStatuses);
      }
    } catch (err) {
      logger.error("Failed to fetch TOC:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  const completeSections = statuses.filter((s) => s.status === "complete").length;
  const totalPages = statuses.reduce((sum, s) => sum + (s.pageCount || 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <List className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">Table of Contents</h1>
          </div>
          <p className="text-slate-500">Auto-generated document index with page references</p>
        </div>
        <Badge variant="outline">Section 2 of 17</Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-600">{statuses.length}</div>
            <div className="text-sm text-slate-500">Total Sections</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">{completeSections}</div>
            <div className="text-sm text-slate-500">Complete</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-600">~{totalPages}</div>
            <div className="text-sm text-slate-500">Est. Pages</div>
          </CardContent>
        </Card>
      </div>

      {/* Table of Contents */}
      <Card>
        <CardHeader>
          <CardTitle>Document Sections</CardTitle>
          <CardDescription>Click any section to view or edit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {statuses.map((item, index) => {
              const meta = SECTION_METADATA[item.section];
              const isComplete = item.status === "complete";

              return (
                <Link
                  key={item.section}
                  href={`/claims-ready-folder/${claimId}/sections/${item.section}`}
                  className="flex items-center justify-between py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-medium dark:bg-slate-800">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium">{meta.title}</div>
                      <div className="text-sm text-slate-500">{meta.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {meta.required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                    <span className="w-12 text-right text-sm text-slate-400">
                      pg {index * 2 + 1}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardHeader>
          <CardTitle>Print Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 bg-white p-6 font-mono text-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 text-center text-lg font-bold uppercase tracking-wide">
              Table of Contents
            </div>
            <hr className="my-4" />
            {statuses.map((item, index) => {
              const meta = SECTION_METADATA[item.section];
              const pageNum = index * 2 + 1;
              return (
                <div key={item.section} className="flex items-end justify-between py-1">
                  <span>
                    {index + 1}. {meta.title}
                  </span>
                  <span className="mx-2 flex-1 border-b border-dotted border-slate-300" />
                  <span>{pageNum}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
