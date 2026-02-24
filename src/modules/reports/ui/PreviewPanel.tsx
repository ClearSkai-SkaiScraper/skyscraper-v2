"use client";

// ============================================================================
// PREVIEW PANEL - Phase 3
// ============================================================================
// Live PDF preview with iframe or blob URL

import { Download, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { SectionKey } from "../types";

interface PreviewPanelProps {
  reportId: string;
  sections: SectionKey[];
  showAIMarkers: boolean;
  onToggleMarkers: () => void;
}

export default function PreviewPanel({
  reportId,
  sections,
  showAIMarkers,
  onToggleMarkers,
}: PreviewPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-regenerate preview when sections change
    if (sections.length > 0) {
      void generatePreview();
    }
  }, [sections, showAIMarkers]);

  const generatePreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/reports/${reportId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "pdf",
          sections,
          showAIMarkers,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Preview failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Revoke old URL if exists
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (previewUrl) {
      const a = document.createElement("a");
      a.href = previewUrl;
      a.download = `contractor-packet-${reportId}.pdf`;
      a.click();
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <h3 className="font-semibold text-gray-900">Live Preview</h3>

        <div className="flex items-center gap-2">
          {/* AI Markers Toggle */}
          <button
            onClick={onToggleMarkers}
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium ${
              showAIMarkers ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
            }`}
            title={showAIMarkers ? "Hide AI markers" : "Show AI markers"}
          >
            {showAIMarkers ? (
              <>
                <Eye className="h-4 w-4" />
                <span>AI Markers</span>
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                <span>Hide Markers</span>
              </>
            )}
          </button>

          {/* Download */}
          {previewUrl && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-75">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm text-gray-600">Generating preview...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="px-4 text-center">
              <p className="mb-2 font-medium text-red-600">Preview Error</p>
              <p className="text-sm text-gray-600">{error}</p>
              <button
                onClick={generatePreview}
                className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && !previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="px-4 text-center">
              <p className="mb-2 text-gray-600">No preview available</p>
              <p className="text-sm text-gray-500">Select sections to generate preview</p>
            </div>
          </div>
        )}

        {previewUrl && !loading && !error && (
          <iframe src={previewUrl} className="h-full w-full border-0" title="PDF Preview" />
        )}
      </div>
    </div>
  );
}
