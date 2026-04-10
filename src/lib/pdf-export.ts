// ============================================================================
// #177: PDF Export Utility — Centralized claim PDF generation
// ============================================================================
// Provides a single entry point for generating claim PDFs.
// Wraps existing hooks/API patterns into a reusable server + client utility.
// ============================================================================

import "jspdf-autotable";

import jsPDF from "jspdf";

// Extend jsPDF with autoTable plugin type
declare module "jspdf" {
  interface jsPDF {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoTable: (options: any) => jsPDF;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClaimLineItem {
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
  xactimateCode?: string;
  category?: string;
}

export interface ClaimPDFData {
  claimNumber: string;
  title: string;
  insuredName: string;
  propertyAddress: string;
  dateOfLoss: string;
  carrier?: string;
  policyNumber?: string;
  adjusterName?: string;
  inspectionDate?: string;
  preparedBy?: string;
  damageType?: string;
  summary?: string;
  lineItems?: ClaimLineItem[];
  totalValue?: number;
  photos?: { url: string; caption?: string }[];
  orgName?: string;
}

// ---------------------------------------------------------------------------
// Server-side PDF generation (uses jsPDF + autoTable)
// ---------------------------------------------------------------------------

/**
 * Generate a claim PDF document as a Blob.
 * Works in both Node.js and browser environments via jsPDF.
 */
export function generateClaimPDF(data: ClaimPDFData): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // ── Header ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CLAIM SUMMARY REPORT", pageWidth / 2, y, { align: "center" });
  y += 28;

  if (data.orgName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(data.orgName, pageWidth / 2, y, { align: "center" });
    y += 18;
  }

  doc.setDrawColor(59, 130, 246); // blue-500
  doc.setLineWidth(2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  // ── Claim Info Grid ──
  const fields: [string, string | undefined][] = [
    ["Claim #", data.claimNumber],
    ["Title", data.title],
    ["Insured Name", data.insuredName],
    ["Property Address", data.propertyAddress],
    ["Date of Loss", data.dateOfLoss],
    ["Carrier", data.carrier],
    ["Policy #", data.policyNumber],
    ["Adjuster", data.adjusterName],
    ["Inspection Date", data.inspectionDate],
    ["Prepared By", data.preparedBy],
    ["Damage Type", data.damageType],
  ];

  doc.setFontSize(10);
  for (const [label, value] of fields) {
    if (!value) continue;
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 120, y);
    y += 16;
    if (y > 750) {
      doc.addPage();
      y = margin;
    }
  }

  y += 10;

  // ── Summary ──
  if (data.summary) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", margin, y);
    y += 16;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.summary, pageWidth - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 12;
  }

  // ── Line Items Table ──
  if (data.lineItems && data.lineItems.length > 0) {
    if (y > 600) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Scope of Loss", margin, y);
    y += 8;

    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["#", "Description", "Qty", "Unit", "Unit Price", "Total"]],
      body: data.lineItems.map((item, i) => [
        i + 1,
        item.xactimateCode ? `[${item.xactimateCode}] ${item.description}` : item.description,
        item.qty,
        item.unit,
        `$${item.unitPrice.toFixed(2)}`,
        `$${item.total.toFixed(2)}`,
      ]),
      foot: [
        [
          "",
          "TOTAL",
          "",
          "",
          "",
          `$${(data.totalValue ?? data.lineItems.reduce((s, i) => s + i.total, 0)).toFixed(2)}`,
        ],
      ],
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
      },
      styles: { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated ${new Date().toLocaleDateString()} — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" }
    );
    doc.setTextColor(0);
  }

  return doc.output("blob");
}

// ---------------------------------------------------------------------------
// Client-side helper: call the existing /api/export/pdf route
// ---------------------------------------------------------------------------

/**
 * Download a claim PDF via the server API route.
 * Use this from client components where server-only PDF generation isn't needed.
 */
export async function downloadClaimPDF(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  claimData: Record<string, any>,
  filename?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "claims",
        data: claimData,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "PDF export failed" }));
      throw new Error(err.error || "PDF export failed");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `claim-${claimData.claimNumber || Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generate a PDF Blob directly in the browser (no API call).
 * Useful for offline or instant generation.
 */
export function generateClaimPDFBlob(data: ClaimPDFData): Blob {
  return generateClaimPDF(data);
}
