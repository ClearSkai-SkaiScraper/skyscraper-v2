"use client";

import { DocumentOrganizer } from "@/components/documents/DocumentOrganizer";
import { cn } from "@/lib/utils";
import { FolderOpen, List } from "lucide-react";
import { type ReactNode, useState } from "react";

interface UnifiedReportItem {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  url: string | null;
  source: string;
  claimId?: string | null;
  claimNumber?: string | null;
  address?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface ReportViewToggleProps {
  reports: UnifiedReportItem[];
  /** The table view (rendered by server) — passed as children */
  children: ReactNode;
}

/**
 * Client wrapper that adds a view toggle between table view (server-rendered)
 * and the DocumentOrganizer folder view.
 */
export function ReportViewToggle({ reports, children }: ReportViewToggleProps) {
  const [view, setView] = useState<"table" | "folders">("table");

  // Map UnifiedReport[] → Document[] for DocumentOrganizer
  const documents = reports.map((r) => ({
    id: r.id,
    filename: r.title || "Untitled Report",
    file_type: r.type,
    type: r.type,
    category: mapCategory(r.type),
    source: r.source === "ai_reports" || r.source === "ai" ? "ai" : r.source,
    note: r.title,
    title: r.title,
    mimeType: guessMimeType(r.type),
    publicUrl: r.url ?? undefined,
    createdAt: r.createdAt,
    visibleToClient: false,
    ai_tags: r.source === "ai_reports" ? ["ai-generated"] : [],
  }));

  return (
    <div className="space-y-4">
      {/* View Toggle Pills */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">View:</span>
        <div className="flex items-center gap-1 rounded-lg border bg-white p-0.5 dark:bg-slate-800">
          <button
            onClick={() => setView("table")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "table"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            )}
          >
            <List className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            onClick={() => setView("folders")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === "folders"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            )}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Folders
          </button>
        </div>
      </div>

      {/* Render active view */}
      {view === "table" ? (
        children
      ) : (
        <DocumentOrganizer
          documents={documents}
          onDocumentClick={(doc) => {
            if (doc.publicUrl) {
              window.open(doc.publicUrl, "_blank", "noopener,noreferrer");
            }
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mapCategory(type: string): string {
  switch (type) {
    case "DAMAGE_REPORT":
      return "damage_report";
    case "WEATHER_REPORT":
      return "weather";
    case "SUPPLEMENT":
      return "supplement";
    case "RETAIL_PROPOSAL":
    case "MATERIALS_ESTIMATE":
    case "AI_CLAIM_SCOPE":
      return "estimate";
    case "CONTRACTOR_PACKET":
    case "BID_PACKAGE":
      return "contract";
    case "REBUTTAL":
    case "BAD_FAITH":
      return "justification";
    case "CLAIMS_PACKET":
      return "document";
    default:
      return "other";
  }
}

function guessMimeType(type: string): string {
  if (type === "VIDEO_REPORT") return "video/mp4";
  return "application/pdf";
}
