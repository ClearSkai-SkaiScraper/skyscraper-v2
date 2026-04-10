"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { CheckCircle, Download, FileText, Image, Package, XCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

import type { ExportProject } from "./actions";
import { generateBulkCarrierExport, generateCarrierExport } from "./actions";

export default function CarrierExportClient({ projects }: { projects: ExportProject[] }) {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<string | null>(null);
  const [bulkExporting, setBulkExporting] = useState(false);

  const toggleProject = (projectId: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleExport = async (projectId: string) => {
    setExporting(projectId);
    try {
      const result = await generateCarrierExport(projectId);
      if (result.success && result.downloadUrl) {
        // In production, this would trigger the download
        window.open(result.downloadUrl, "_blank");
      } else {
        alert(result.message || "Export failed");
      }
    } catch (error) {
      logger.error("Export error:", error);
      alert("Failed to generate export");
    } finally {
      setExporting(null);
    }
  };

  const handleBulkExport = async () => {
    if (selectedProjects.size === 0) {
      alert("Please select at least one project");
      return;
    }

    setBulkExporting(true);
    try {
      const result = await generateBulkCarrierExport(Array.from(selectedProjects));
      if (result.success) {
        alert(`✅ ${result.message}`);
        // In production, would trigger download
        if (result.downloadUrl) {
          window.open(result.downloadUrl, "_blank");
        }
      } else {
        alert(result.message || "Bulk export failed");
      }
    } catch (error) {
      logger.error("Bulk export error:", error);
      alert("Failed to generate bulk export");
    } finally {
      setBulkExporting(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Package className="h-4 w-4" />
            Total Projects
          </div>
          <div className="mt-1 text-2xl font-bold text-[color:var(--text)]">{projects.length}</div>
        </div>

        <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Image className="h-4 w-4" />
            Total Photos
          </div>
          <div className="mt-1 text-2xl font-bold text-[color:var(--text)]">
            {projects.reduce((sum, p) => sum + p.photoCount, 0)}
          </div>
        </div>

        <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <FileText className="h-4 w-4" />
            Total Documents
          </div>
          <div className="mt-1 text-2xl font-bold text-[color:var(--text)]">
            {projects.reduce((sum, p) => sum + p.documentCount, 0)}
          </div>
        </div>

        <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <CheckCircle className="h-4 w-4" />
            Selected
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{selectedProjects.size}</div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProjects.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">
            {selectedProjects.size} project{selectedProjects.size > 1 ? "s" : ""} selected
          </p>
          <Button
            onClick={handleBulkExport}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700"
          >
            <Download className="h-4 w-4" />
            Bulk Export
          </Button>
        </div>
      )}

      {/* Projects List */}
      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedProjects.has(project.id)}
                onChange={() => toggleProject(project.id)}
                className="mt-1 h-4 w-4 rounded border-[color:var(--border)] text-blue-600 focus:ring-blue-500"
                aria-label={`Select project ${project.title}`}
              />

              {/* Project Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--text)]">
                      {project.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      {project.propertyAddress}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      project.status === "APPROVED"
                        ? "bg-green-100 text-green-800"
                        : project.status === "PRODUCTION"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-[var(--surface-1)] text-[color:var(--text)]"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>

                {/* Stats */}
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <FileText className="h-4 w-4" />
                    <span>{project.documentCount} documents</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Image className="h-4 w-4" />
                    <span>{project.photoCount} photos</span>
                  </div>
                  {project.value && (
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className="font-medium">{formatCurrency(project.value)}</span>
                    </div>
                  )}
                </div>

                {/* Indicators */}
                <div className="mt-3 flex gap-2">
                  {project.hasWeatherReport ? (
                    <span className="flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                      <CheckCircle className="h-3 w-3" />
                      Weather Report
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-[var(--surface-1)] px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <XCircle className="h-3 w-3" />
                      No Weather Report
                    </span>
                  )}
                  {project.hasDOL ? (
                    <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                      <CheckCircle className="h-3 w-3" />
                      DOL
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-[var(--surface-1)] px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <XCircle className="h-3 w-3" />
                      No DOL
                    </span>
                  )}
                </div>
              </div>

              {/* Export Button */}
              <button
                onClick={() => handleExport(project.id)}
                disabled={exporting === project.id}
                className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-[color:var(--text)] transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
              >
                {exporting === project.id ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--border)] border-t-blue-600" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
