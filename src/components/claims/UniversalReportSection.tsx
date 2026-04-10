"use client";

import { Download, FileText, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { logger } from "@/lib/logger";

interface UniversalReportSectionProps {
  claim: any;
  claimReport?: {
    id: string;
    status: string;
    version: number;
    createdAt: string | Date;
    updatedAt: string | Date;
  } | null;
}

type ReportStatus = "no-report" | "draft" | "finalized" | "submitted";

function getStatusConfig(status: ReportStatus) {
  const configs = {
    "no-report": {
      label: "No Report",
      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      icon: "○",
    },
    draft: {
      label: "Draft",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      icon: "◐",
    },
    finalized: {
      label: "Finalized",
      color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      icon: "●",
    },
    submitted: {
      label: "Submitted",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      icon: "✓",
    },
  };
  return configs[status];
}

export function UniversalReportSection({ claim, claimReport }: UniversalReportSectionProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Check if feature is enabled
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_UNIVERSAL_REPORTS !== "false";

  if (!isEnabled) {
    return (
      <div className="rounded-xl border bg-card p-6 opacity-60">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Lock className="h-5 w-5" />
          <div>
            <h3 className="text-sm font-semibold">Universal Claims Report System</h3>
            <p className="mt-1 text-xs">This feature is currently disabled for this environment.</p>
          </div>
        </div>
      </div>
    );
  }

  const status: ReportStatus = claimReport ? (claimReport.status as ReportStatus) : "no-report";

  const statusConfig = getStatusConfig(status);
  const hasReport = status !== "no-report";
  const isReadonly = status === "submitted";

  const handleDownloadPDF = async () => {
    if (!hasReport) return;

    setIsDownloading(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}/report/pdf`);
      if (!res.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Create blob and download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `universal-report-${claim.claimNumber || claim.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error("PDF download error:", error);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="divide-y rounded-xl border bg-card">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-primary p-2">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Universal Claims Report</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                10-section professional insurance report
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${statusConfig.color}`}
          >
            <span>{statusConfig.icon}</span>
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {/* Open Universal Report Button */}
          <Link
            href={`/claims/${claim.id}/universal-report`}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              hasReport
                ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg"
                : "bg-gradient-blue text-white shadow-lg hover:shadow-xl"
            } `}
          >
            <FileText className="h-4 w-4" />
            {hasReport ? "Open Universal Report" : "Create Universal Report"}
          </Link>

          {/* Download PDF Button */}
          {hasReport && (
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? "Generating..." : "Download PDF"}
            </button>
          )}

          {/* Submit Status Indicator */}
          {isReadonly && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
              <Lock className="h-4 w-4" />
              View Only (Submitted)
            </div>
          )}
        </div>

        {/* Report Metadata */}
        {hasReport && claimReport && (
          <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Version {claimReport.version}</span>
              <span>Last updated: {new Date(claimReport.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      {!hasReport && (
        <div className="bg-blue-50 px-4 py-3 dark:bg-blue-950/30">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>New!</strong> Create a comprehensive 10-section report with cover page,
            executive summary, damage analysis, weather verification, code compliance, and more.
          </p>
        </div>
      )}
    </div>
  );
}
