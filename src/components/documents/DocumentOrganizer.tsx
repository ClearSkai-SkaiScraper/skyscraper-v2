"use client";

import {
  Camera,
  ClipboardCheck,
  FileBarChart,
  FileCheck,
  FileText,
  FolderOpen,
  Grid3X3,
  List,
  Receipt,
  Shield,
  Sparkles,
  Umbrella,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  filename?: string;
  /** Maps to `type` from ClaimDocument or `file_type` from file_assets */
  file_type?: string | null;
  /** Also accept `type` field name */
  type?: string;
  category?: string;
  source?: string | null;
  /** Supports both `note` and `title` */
  note?: string | null;
  title?: string | null;
  mimeType: string;
  sizeBytes?: number;
  fileSize?: number | null;
  publicUrl?: string;
  createdAt: string;
  createdByName?: string;
  visibleToClient?: boolean;
  ai_tags?: string[];
}

interface DocumentOrganizerProps {
  documents: Document[];
  onDocumentClick?: (doc: Document) => void;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Folder Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface FolderDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  /** Returns true if a document belongs in this folder */
  matcher: (doc: Document) => boolean;
}

/** Get the file type from either file_type or type field */
function getDocType(d: Document): string {
  return d.file_type || d.type || "";
}
/** Get display name from note, title, or filename */
function getDocName(d: Document): string {
  return d.note || d.title || d.filename || "";
}
/** Get file size from sizeBytes or fileSize */
function getDocSize(d: Document): number | null {
  return d.sizeBytes ?? d.fileSize ?? null;
}

const FOLDERS: FolderDef[] = [
  {
    key: "damage-reports",
    label: "Damage Reports",
    icon: <FileBarChart className="h-5 w-5" />,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/40",
    borderColor: "border-red-200 dark:border-red-800",
    matcher: (d) =>
      getDocType(d) === "DAMAGE_REPORT" ||
      d.category === "damage_report" ||
      d.ai_tags?.includes("damage-report") ||
      /damage.?report/i.test(getDocName(d)),
  },
  {
    key: "justification",
    label: "Justification Reports",
    icon: <Shield className="h-5 w-5" />,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-950/40",
    borderColor: "border-violet-200 dark:border-violet-800",
    matcher: (d) =>
      getDocType(d) === "JUSTIFICATION" ||
      d.ai_tags?.includes("justification") ||
      /justification/i.test(getDocName(d)),
  },
  {
    key: "weather",
    label: "Weather Reports",
    icon: <Umbrella className="h-5 w-5" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    borderColor: "border-blue-200 dark:border-blue-800",
    matcher: (d) =>
      getDocType(d) === "WEATHER" ||
      d.category === "weather" ||
      d.ai_tags?.includes("weather") ||
      /weather/i.test(getDocName(d)),
  },
  {
    key: "supplements",
    label: "Supplements",
    icon: <ClipboardCheck className="h-5 w-5" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
    borderColor: "border-amber-200 dark:border-amber-800",
    matcher: (d) =>
      getDocType(d) === "SUPPLEMENT" ||
      d.category === "supplement" ||
      d.ai_tags?.includes("supplement") ||
      /supplement/i.test(getDocName(d)),
  },
  {
    key: "estimates",
    label: "Estimates & Scopes",
    icon: <Receipt className="h-5 w-5" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    matcher: (d) => {
      const ft = getDocType(d);
      return (
        ft === "ESTIMATE" ||
        ft === "SCOPE" ||
        d.category === "estimate" ||
        d.ai_tags?.includes("estimate") ||
        /estimate|scope|xactimate/i.test(getDocName(d))
      );
    },
  },
  {
    key: "contracts",
    label: "Contracts & Agreements",
    icon: <FileCheck className="h-5 w-5" />,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
    borderColor: "border-indigo-200 dark:border-indigo-800",
    matcher: (d) =>
      getDocType(d) === "CONTRACT" ||
      d.category === "contract" ||
      d.ai_tags?.includes("contract") ||
      /contract|agreement|authorization/i.test(getDocName(d)),
  },
  {
    key: "photos",
    label: "Photo Evidence",
    icon: <Camera className="h-5 w-5" />,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-50 dark:bg-pink-950/40",
    borderColor: "border-pink-200 dark:border-pink-800",
    matcher: (d) =>
      d.category === "photo" || getDocType(d) === "PHOTO" || d.mimeType.startsWith("image/"),
  },
  {
    key: "invoices",
    label: "Invoices & Billing",
    icon: <Receipt className="h-5 w-5" />,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/40",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    matcher: (d) => {
      const ft = getDocType(d);
      return (
        ft === "INVOICE" ||
        ft === "DEPRECIATION" ||
        d.category === "invoice" ||
        d.ai_tags?.includes("invoice") ||
        /invoice|depreciation|billing/i.test(getDocName(d))
      );
    },
  },
  {
    key: "ai-generated",
    label: "AI-Generated",
    icon: <Sparkles className="h-5 w-5" />,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/40",
    borderColor: "border-purple-200 dark:border-purple-800",
    matcher: (d) =>
      d.source === "ai" &&
      !["DAMAGE_REPORT", "JUSTIFICATION", "WEATHER", "SUPPLEMENT"].includes(getDocType(d)),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DocumentOrganizer({
  documents,
  onDocumentClick,
  className,
}: DocumentOrganizerProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Organize documents into folders
  const organizedFolders = useMemo(() => {
    const result: Array<{ folder: FolderDef; docs: Document[] }> = [];
    const assigned = new Set<string>();

    for (const folder of FOLDERS) {
      const folderDocs = documents.filter((d) => {
        if (assigned.has(d.id)) return false;
        return folder.matcher(d);
      });
      // Mark assigned docs so they don't appear in multiple folders
      folderDocs.forEach((d) => assigned.add(d.id));
      result.push({ folder, docs: folderDocs });
    }

    // "Other" folder for unassigned
    const otherDocs = documents.filter((d) => !assigned.has(d.id));
    if (otherDocs.length > 0) {
      result.push({
        folder: {
          key: "other",
          label: "Other Documents",
          icon: <FolderOpen className="h-5 w-5" />,
          color: "text-gray-600 dark:text-gray-400",
          bgColor: "bg-gray-50 dark:bg-gray-800/40",
          borderColor: "border-gray-200 dark:border-gray-700",
          matcher: () => true,
        },
        docs: otherDocs,
      });
    }

    return result;
  }, [documents]);

  // Filter to non-empty folders OR show all in grid
  const visibleFolders = organizedFolders.filter((f) => f.docs.length > 0);
  const activeFolder = selectedFolder
    ? organizedFolders.find((f) => f.folder.key === selectedFolder)
    : null;

  const totalDocs = documents.length;
  const aiGeneratedCount = documents.filter((d) => d.source === "ai").length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
            Document Organizer
          </h3>
          <Badge variant="secondary" className="text-xs">
            {totalDocs} total
          </Badge>
          {aiGeneratedCount > 0 && (
            <Badge className="gap-1 bg-purple-100 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              <Sparkles className="h-3 w-3" />
              {aiGeneratedCount} AI-generated
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-white p-0.5 dark:bg-slate-800">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "grid"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              viewMode === "list"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Folder Drill-in */}
      {activeFolder ? (
        <div className="space-y-3">
          <button
            onClick={() => setSelectedFolder(null)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            ← Back to all folders
          </button>
          <Card className={cn("border", activeFolder.folder.borderColor)}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className={activeFolder.folder.color}>{activeFolder.folder.icon}</span>
                <CardTitle className="text-lg">{activeFolder.folder.label}</CardTitle>
                <Badge variant="secondary">{activeFolder.docs.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeFolder.docs.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} onClick={onDocumentClick} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Folder Grid / List */
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              : "space-y-2"
          )}
        >
          {visibleFolders.map(({ folder, docs }) => (
            <button
              key={folder.key}
              onClick={() => setSelectedFolder(folder.key)}
              className={cn(
                "group w-full rounded-xl border p-4 text-left transition-all hover:shadow-md",
                folder.borderColor,
                folder.bgColor
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "rounded-lg bg-white/80 p-2 shadow-sm dark:bg-slate-800/80",
                    folder.color
                  )}
                >
                  {folder.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {folder.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {docs.length} {docs.length === 1 ? "file" : "files"}
                  </p>
                </div>
              </div>
              {viewMode === "list" && docs.length > 0 && (
                <div className="mt-2 space-y-1 pl-12">
                  {docs.slice(0, 3).map((d) => (
                    <p key={d.id} className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {getDocName(d) || "Untitled"}
                    </p>
                  ))}
                  {docs.length > 3 && (
                    <p className="text-xs font-medium text-blue-500">+{docs.length - 3} more</p>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {totalDocs === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            No documents yet
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Generate reports or upload documents to organize them here
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function DocumentRow({ doc, onClick }: { doc: Document; onClick?: (doc: Document) => void }) {
  const size = getDocSize(doc);
  const sizeStr = size
    ? size > 1048576
      ? `${(size / 1048576).toFixed(1)} MB`
      : `${(size / 1024).toFixed(1)} KB`
    : "";

  return (
    <div
      onClick={() => onClick?.(doc)}
      className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700"
    >
      <FileText className="h-4 w-4 flex-shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {getDocName(doc) || "Untitled"}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {sizeStr && <span>{sizeStr}</span>}
          <span>•</span>
          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
          {doc.source === "ai" && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-purple-500">
                <Sparkles className="h-3 w-3" /> AI
              </span>
            </>
          )}
        </div>
      </div>
      {doc.visibleToClient && (
        <Badge variant="outline" className="text-xs text-green-600">
          Shared
        </Badge>
      )}
    </div>
  );
}
