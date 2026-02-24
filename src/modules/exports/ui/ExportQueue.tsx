"use client";

// ============================================================================
// EXPORT QUEUE - Phase 3
// ============================================================================
// View and manage export jobs with retry/download

import { CheckCircle, Clock, Download, Loader2, RefreshCw, XCircle } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ExportJob {
  id: string;
  reportId: string;
  format: string;
  status: "queued" | "running" | "complete" | "failed";
  fileUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ExportQueue() {
  const {
    data: jobs,
    error,
    mutate,
  } = useSWR<ExportJob[]>("/api/exports/queue", fetcher, {
    refreshInterval: 3000, // Poll every 3s
  });

  const handleRetry = async (jobId: string) => {
    try {
      await fetch(`/api/exports/${jobId}/retry`, {
        method: "POST",
      });
      void mutate();
    } catch (error) {
      console.error("[Export Retry]", error);
    }
  };

  const handleDownload = (fileUrl: string, jobId: string) => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = `export-${jobId}.pdf`;
    a.click();
  };

  const _getStatusIcon = (status: string) => {
    switch (status) {
      case "queued":
        return <Clock className="h-5 w-5 text-gray-400" />;
      case "running":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case "complete":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const _getStatusLabel = (status: string) => {
    switch (status) {
      case "queued":
        return "Queued";
      case "running":
        return "Processing...";
      case "complete":
        return "Ready";
      case "failed":
        return "Failed";
      default:
        return status;
    }
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="mb-2 font-medium text-red-600">Failed to load queue</p>
          <button
            onClick={() => mutate()}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!jobs) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const activeJobs = jobs.filter((j) => j.status === "queued" || j.status === "running");
  const completedJobs = jobs.filter((j) => j.status === "complete");
  const failedJobs = jobs.filter((j) => j.status === "failed");

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Export Queue</h2>
        <div className="mt-2 flex gap-4 text-sm">
          <span className="text-gray-600">
            Active: <strong>{activeJobs.length}</strong>
          </span>
          <span className="text-gray-600">
            Complete: <strong>{completedJobs.length}</strong>
          </span>
          <span className="text-gray-600">
            Failed: <strong>{failedJobs.length}</strong>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Download className="mb-3 h-12 w-12 text-gray-400" />
            <p className="font-medium text-gray-600">No exports yet</p>
            <p className="mt-1 text-sm text-gray-500">Export a report to see it here</p>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="space-y-4">
            {/* Active Jobs */}
            {activeJobs.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Active</h3>
                <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                  {activeJobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      onRetry={handleRetry}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Jobs */}
            {completedJobs.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Completed</h3>
                <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                  {completedJobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      onRetry={handleRetry}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Failed Jobs */}
            {failedJobs.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Failed</h3>
                <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                  {failedJobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      onRetry={handleRetry}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface JobRowProps {
  job: ExportJob;
  onRetry: (jobId: string) => void;
  onDownload: (fileUrl: string, jobId: string) => void;
}

function JobRow({ job, onRetry, onDownload }: JobRowProps) {
  const timeAgo = getTimeAgo(new Date(job.createdAt));

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="flex-shrink-0">
        {job.status === "queued" && <Clock className="h-5 w-5 text-gray-400" />}
        {job.status === "running" && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
        {job.status === "complete" && <CheckCircle className="h-5 w-5 text-green-600" />}
        {job.status === "failed" && <XCircle className="h-5 w-5 text-red-600" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">
          Report {job.reportId.substring(0, 8)}...
        </p>
        <p className="text-xs text-gray-500">
          {job.format.toUpperCase()} · {timeAgo}
        </p>
        {job.error && <p className="mt-1 text-xs text-red-600">{job.error}</p>}
      </div>

      <div className="flex items-center gap-2">
        {job.status === "complete" && job.fileUrl && (
          <button
            onClick={() => onDownload(job.fileUrl!, job.id)}
            className="flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        )}

        {job.status === "failed" && (
          <button
            onClick={() => onRetry(job.id)}
            className="flex items-center gap-2 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        )}

        {job.status === "running" && (
          <span className="text-xs font-medium text-gray-500">Processing...</span>
        )}

        {job.status === "queued" && (
          <span className="text-xs font-medium text-gray-500">Queued</span>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
