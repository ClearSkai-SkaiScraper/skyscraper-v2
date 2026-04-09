// ============================================================================
// PDF Export Hook - Client Side
// ============================================================================
// Usage:
// const { exportPdf, exporting, error } = usePdfExport();
// await exportPdf({ mode: "retail", packetId, data });
// ============================================================================

import { useState } from "react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

export type ExportPdfOptions = {
  mode: "retail" | "claims";
  packetId?: string;
  reportId?: string;
  data: Record<string, any>;
};

export type ExportPdfResult = {
  success: boolean;
  error?: string;
  blob?: Blob;
};

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportPdf = async (options: ExportPdfOptions): Promise<ExportPdfResult> => {
    setExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: options.mode,
          packetId: options.packetId,
          reportId: options.reportId,
          data: options.data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "PDF export failed");
      }

      // Get PDF blob
      const blob = await response.blob();

      // Trigger download
      const url = URL.createObjectURL(blob);
      const filename = `${options.mode}-${options.packetId || options.reportId || Date.now()}.pdf`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanup
      URL.revokeObjectURL(url);

      toast.success("PDF exported successfully", {
        description: `${filename} has been downloaded.`,
      });

      return {
        success: true,
        blob,
      };
    } catch (err: any) {
      const errorMessage = err.message || "Failed to export PDF";
      setError(errorMessage);

      toast.error("Export failed", {
        description: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setExporting(false);
    }
  };

  const checkCapabilities = async () => {
    try {
      const response = await fetch("/api/export/pdf");
      if (!response.ok) {
        throw new Error("Failed to check capabilities");
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      logger.error("[PDF_EXPORT] Capability check failed:", err);
      return null;
    }
  };

  return {
    exportPdf,
    exporting,
    error,
    checkCapabilities,
  };
}
