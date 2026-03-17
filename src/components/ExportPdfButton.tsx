// ============================================================================
// Export PDF Button Component
// ============================================================================
// Reusable button for exporting Retail or Claims wizards to PDF
// ============================================================================

"use client";

import { Download, FileText,Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePdfExport } from "@/hooks/usePdfExport";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

export type ExportPdfButtonProps = {
  mode: "retail" | "claims";
  packetId?: string;
  reportId?: string;
  data: Record<string, any>;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
};

export function ExportPdfButton({
  mode,
  packetId,
  reportId,
  data,
  variant = "default",
  size = "default",
  className,
  children,
  disabled,
  onSuccess,
  onError,
}: ExportPdfButtonProps) {
  const { exportPdf, exporting } = usePdfExport();

  const handleExport = async () => {
    const result = await exportPdf({
      mode,
      packetId,
      reportId,
      data,
    });

    if (result.success && onSuccess) {
      onSuccess();
    } else if (result.error && onError) {
      onError(result.error);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || exporting}
      variant={variant}
      size={size}
      className={cn(className)}
    >
      {exporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {children || "Export to PDF"}
        </>
      )}
    </Button>
  );
}

/**
 * Compact icon-only export button
 */
export function ExportPdfIconButton({
  mode,
  packetId,
  reportId,
  data,
  className,
  disabled,
  onSuccess,
  onError,
}: Omit<ExportPdfButtonProps, "variant" | "size" | "children">) {
  const { exportPdf, exporting } = usePdfExport();

  const handleExport = async () => {
    const result = await exportPdf({
      mode,
      packetId,
      reportId,
      data,
    });

    if (result.success && onSuccess) {
      onSuccess();
    } else if (result.error && onError) {
      onError(result.error);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || exporting}
      variant="outline"
      size="icon"
      className={cn(className)}
      title={exporting ? "Exporting..." : "Export to PDF"}
    >
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
    </Button>
  );
}

/**
 * Export button with capability indicator
 */
export function ExportPdfButtonWithCapabilities({
  mode,
  packetId,
  reportId,
  data,
  variant = "default",
  size = "default",
  className,
  disabled,
  onSuccess,
  onError,
}: ExportPdfButtonProps) {
  const { exportPdf, exporting, checkCapabilities } = usePdfExport();

  const handleExport = async () => {
    // Optional: Check capabilities before export
    const capabilities = await checkCapabilities();
    if (capabilities) {
      logger.debug(`[PDF_EXPORT] Using strategy: ${capabilities.strategy}`);
    }

    const result = await exportPdf({
      mode,
      packetId,
      reportId,
      data,
    });

    if (result.success && onSuccess) {
      onSuccess();
    } else if (result.error && onError) {
      onError(result.error);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || exporting}
      variant={variant}
      size={size}
      className={cn(className)}
    >
      {exporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </>
      )}
    </Button>
  );
}
