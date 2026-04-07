"use client";

/**
 * /claims/[claimId]/reports - Reports tab for specific claim
 * Lists all Report records tied to this claim
 */

import { Download, Eye, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Report {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
  pdfUrl?: string;
}

export default function ClaimReportsPage({ params }: { params: { claimId: string } }) {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchReports();
  }, [params.claimId]);

  async function fetchReports() {
    try {
      const res = await fetch(`/api/claims/${params.claimId}/reports`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch reports");

      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }

  async function deleteReport(reportId: string) {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete report");

      // Refresh list
      void fetchReports();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Failed to delete report"}`);
    }
  }

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      adjuster_packet: "Adjuster Packet",
      inspection_report: "Inspection Report",
      homeowner_report: "Homeowner Summary",
      internal_summary: "Internal Notes",
    };
    return labels[type] || type;
  };

  const getReportTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      adjuster_packet: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      inspection_report: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      homeowner_report: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      internal_summary: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            AI-generated inspection reports, adjuster packets, and summaries
          </p>
        </div>
        <button
          onClick={() => router.push(`/reports/builder?claimId=${params.claimId}`)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          New Report
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <FileText className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            No reports yet
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Create your first report using the AI Report Builder
          </p>
          <button
            onClick={() => router.push(`/reports/builder?claimId=${params.claimId}`)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Create Report
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Created By
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${getReportTypeBadgeColor(
                        report.type
                      )}`}
                    >
                      {getReportTypeLabel(report.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {report.title}
                    </div>
                    {report.subtitle && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {report.subtitle}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(report.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {report.createdBy.name || report.createdBy.email}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/reports/${report.id}`)}
                        className="rounded p-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                        title="View report"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {report.pdfUrl && (
                        <button
                          onClick={() => window.open(report.pdfUrl, "_blank")}
                          className="rounded p-2 text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-600 dark:text-gray-400 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteReport(report.id)}
                        className="rounded p-2 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Delete report"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
