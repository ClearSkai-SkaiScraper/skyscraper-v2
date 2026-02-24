"use client";

// ============================================================================
// ENHANCED BUILDER - Phase 3 Integration
// ============================================================================
// Combines DragBuilder, PreviewPanel, AI controls, templates, autosave

import { Download, Eye, Sparkles } from "lucide-react";
import { useState } from "react";

import { approveFields, runAI } from "@/modules/ai/core/hooks";
import { useAutosave } from "@/modules/state/core/useAutosave";
import { ResumeModal, useReportDraft } from "@/modules/state/core/useReportDraft";

import type { ExportFormat, SectionKey } from "../types";
import DragBuilder from "./DragBuilder";
import PreviewPanel from "./PreviewPanel";
import RightPanel from "./RightPanel";
import TemplatesMenu from "./TemplatesMenu";

const DEFAULT_SECTIONS: SectionKey[] = [
  "cover",
  "toc",
  "executive-summary",
  "weather-verification",
  "photo-evidence",
  "scope-matrix",
  "code-compliance",
  "signature-page",
];

export default function EnhancedBuilder() {
  const reportId = "demo-report-001";

  const [selectedSections, setSelectedSections] = useState<SectionKey[]>(DEFAULT_SECTIONS);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [showPreview, setShowPreview] = useState(false);
  const [showAIMarkers, setShowAIMarkers] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft management
  const { showResumeModal, draft, resumeDraft, startFresh, dismissModal } = useReportDraft({
    reportId,
    onResume: (draftData) => {
      if (draftData.selectedSections) {
        setSelectedSections(draftData.selectedSections as SectionKey[]);
      }
    },
  });

  // Autosave
  const { saveDraft: _saveDraft } = useAutosave({
    reportId,
    data: {
      selectedSections,
      exportFormat,
      showAIMarkers,
    },
    enabled: true,
    interval: 5000,
  });

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const res = await fetch(`/api/reports/${reportId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: exportFormat,
          sections: selectedSections,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contractor-packet-${Date.now()}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleRunAI = async (sectionKey: SectionKey) => {
    try {
      await runAI({
        reportId,
        engine: "damageBuilder", // Map section to engine
        sectionKey: sectionKey as any, // Cast for now - TODO: proper mapping
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApproveSection = async (sectionKey: SectionKey) => {
    try {
      await approveFields({
        reportId,
        sectionKey: sectionKey as any, // Cast for now - TODO: proper mapping
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Universal Contractor Packet</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Build, preview, and export professional reports
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Template Selector */}
                <button
                  onClick={() => setShowTemplates(true)}
                  className="flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Templates</span>
                </button>

                {/* Preview Toggle */}
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-2 rounded px-4 py-2 font-medium ${
                    showPreview
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  <span>{showPreview ? "Hide" : "Show"} Preview</span>
                </button>

                {/* Export */}
                <button
                  onClick={handleExport}
                  disabled={exporting || selectedSections.length === 0}
                  className="flex items-center gap-2 rounded bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>{exporting ? "Exporting..." : "Export"}</span>
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mt-3 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Builder */}
            <div className="flex-1 overflow-auto p-6">
              <DragBuilder
                selectedSections={selectedSections}
                onSectionsChange={setSelectedSections}
              />
            </div>

            {/* Right: Preview (conditional) */}
            {showPreview && (
              <div className="w-1/2 border-l border-gray-200">
                <PreviewPanel
                  reportId={reportId}
                  sections={selectedSections}
                  showAIMarkers={showAIMarkers}
                  onToggleMarkers={() => setShowAIMarkers(!showAIMarkers)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <RightPanel
          selectedSections={selectedSections}
          onToggleSection={(key) => {
            if (selectedSections.includes(key)) {
              setSelectedSections(selectedSections.filter((k) => k !== key));
            } else {
              setSelectedSections([...selectedSections, key]);
            }
          }}
          onRunAI={handleRunAI}
          onApproveSection={handleApproveSection}
          exportFormat={exportFormat}
          onFormatChange={setExportFormat}
        />
      </div>

      {/* Modals */}
      {showTemplates && (
        <TemplatesMenu
          onSelectTemplate={(sections) => setSelectedSections(sections)}
          onClose={() => setShowTemplates(false)}
          currentSections={selectedSections}
        />
      )}

      <ResumeModal
        show={showResumeModal}
        draft={draft}
        onResume={resumeDraft}
        onStartFresh={startFresh}
        onDismiss={dismissModal}
      />
    </>
  );
}
