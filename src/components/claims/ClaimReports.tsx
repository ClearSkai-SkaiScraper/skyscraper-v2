"use client";

import { formatDistanceToNow } from "date-fns";
import { AlertCircle,Calendar, Download, FileText, Loader2, User } from "lucide-react";
import { useEffect, useState } from "react";

interface Report {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  userName?: string;
  attachments?: {
    pdfUrl?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

interface ClaimReportsProps {
  claimId: string;
}

export function ClaimReports({ claimId }: ClaimReportsProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const response = await fetch(`/api/claims/${claimId}/reports`);
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "Failed to fetch reports");
        }

        setReports(data.data.reports || []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchReports();
  }, [claimId]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getReportIcon = (type: string) => {
    return FileText;
  };

  const getReportLabel = (type: string) => {
    const labels: Record<string, string> = {
      damage_builder: "AI Damage Report",
      weather_chains: "Weather Verification",
      weather_report: "Weather Report",
      depreciation: "Depreciation Package",
      inspection: "Inspection Report",
      supplement: "Supplement",
      appeal: "Appeal Document",
    };
    return labels[type] || type.replace(/_/g, " ").toUpperCase();
  };

  const handleDownload = async (report: Report) => {
    const pdfUrl = report.attachments?.pdfUrl;

    if (!pdfUrl) {
      alert("No PDF available for this report");
      return;
    }

    try {
      // Open in new tab for now
      window.open(pdfUrl, "_blank");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      alert("Failed to open report. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-4 text-sm font-medium text-slate-900">No reports yet</h3>
        <p className="mt-2 text-sm text-slate-600">
          Generate reports using AI tools or upload documents
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const Icon = getReportIcon(report.type);

        return (
          <div
            key={report.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>

              <div>
                <h4 className="font-medium text-slate-900">{getReportLabel(report.type)}</h4>
                <div className="mt-1 flex items-center gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {report.userName && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{report.userName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDownload(report)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={!report.attachments?.pdfUrl}
            >
              <Download className="h-4 w-4" />
              View
            </button>
          </div>
        );
      })}
    </div>
  );
}
