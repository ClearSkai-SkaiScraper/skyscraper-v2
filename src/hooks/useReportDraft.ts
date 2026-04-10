/**
 * Report Draft State Management
 * Centralizes report data with citations and export capabilities
 */

import { useCallback, useState } from "react";

import type { Citation } from "@/lib/citations";
import { logger } from "@/lib/logger";
import { exportPdfFromHtml, useOffscreen } from "@/lib/pdfExportClient";
import { renderPdfHtml } from "@/lib/pdfTemplates";

export type ReportMode = "inspection" | "insurance" | "retail";

export interface ReportDraftState {
  address: string;
  notes: string;
  summary: string;
  summaryHtml: string;
  photos: Array<{ url: string; caption?: string }>;
  citations: Citation[];
}

export function useReportDraft(initial?: Partial<ReportDraftState>) {
  const [address, setAddress] = useState(initial?.address || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [summary, setSummary] = useState(initial?.summary || "");
  const [summaryHtml, setSummaryHtml] = useState(initial?.summaryHtml || "");
  const [photos, setPhotos] = useState(initial?.photos || []);
  const [citations, setCitations] = useState<Citation[]>(initial?.citations || []);
  const [busy, setBusy] = useState(false);
  const mountRef = useOffscreen();

  const appendFinding = useCallback((text: string) => {
    if (!text) return;
    setSummary((s) => (s ? s + "\n\n" : "") + text.trim());
    setSummaryHtml("");
  }, []);

  const setFindings = useCallback((text: string) => {
    setSummary(text || "");
    setSummaryHtml("");
  }, []);

  const setFindingsHtml = useCallback((html: string) => {
    setSummaryHtml(html || "");
  }, []);

  const addCitation = useCallback((c: Citation) => {
    setCitations((list) => (list.some((x) => x.id === c.id) ? list : [...list, c]));
  }, []);

  const clearCitations = useCallback(() => {
    setCitations([]);
  }, []);

  const exportPdf = useCallback(
    async (mode: ReportMode = "inspection") => {
      setBusy(true);
      try {
        const html = renderPdfHtml(mode, {
          brand: { logoUrl: (window as any).__BRAND_LOGO__ || "" },
          heading:
            mode === "retail"
              ? "Retail Proposal"
              : mode === "insurance"
                ? "Insurance Report"
                : "Inspection Report",
          property: { address },
          photos,
          ai_summary: summary || notes,
          ai_summary_html: summaryHtml,
          citations,
          mode,
        });

        if (mountRef.current) {
          mountRef.current.innerHTML = html;
        }

        await exportPdfFromHtml(mountRef.current!, `clearskai-${mode}-report.pdf`);
        return true;
      } catch (error) {
        logger.error("Export PDF error:", error);
        return false;
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [address, photos, summary, notes, citations, mountRef]
  );

  return {
    address,
    setAddress,
    notes,
    setNotes,
    summary,
    setSummary,
    summaryHtml,
    setSummaryHtml,
    setFindingsHtml,
    photos,
    setPhotos,
    citations,
    addCitation,
    clearCitations,
    appendFinding,
    setFindings,
    exportPdf,
    busy,
    mountRef,
  } as const;
}
