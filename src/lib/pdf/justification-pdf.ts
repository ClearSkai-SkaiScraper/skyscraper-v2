/**
 * Justification Report PDF Renderer
 *
 * Generates a professional, carrier-ready Storm Damage Justification PDF
 * using jsPDF (serverless-compatible — works on Vercel).
 */

import { jsPDF } from "jspdf";

import type { JustificationReport } from "@/lib/ai/justification-engine";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RenderOptions {
  report: JustificationReport;
  claim: {
    claimNumber?: string | null;
    homeownerName?: string | null;
    propertyAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    dateOfLoss?: string | null;
    insuranceCarrier?: string | null;
    policyNumber?: string | null;
  };
  orgName?: string;
  primaryColor?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Renderer
// ─────────────────────────────────────────────────────────────────────────────

export function renderJustificationPDF(options: RenderOptions): Buffer {
  const { report, claim, orgName, primaryColor = "#0A1A2F" } = options;

  logger.info("[JUSTIFICATION_PDF] Rendering PDF", {
    findings: report.damageFindings.length,
    collateral: report.collateralEvidence.length,
  });

  const doc = new jsPDF({ format: "letter" });
  const pRgb = hexToRgb(primaryColor);
  const pageWidth = 215.9;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  // ═══════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(pRgb.r, pRgb.g, pRgb.b);
  doc.text("Storm Damage Justification Report", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  if (orgName) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Prepared by ${orgName}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 6;
  }

  // Header rule
  doc.setDrawColor(pRgb.r, pRgb.g, pRgb.b);
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 12;

  // ═══════════════════════════════════════════════════════════════════════
  // PROPERTY INFO BOX
  // ═══════════════════════════════════════════════════════════════════════
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, yPos - 4, contentWidth, 38, 2, 2, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);

  const col1 = margin + 4;
  const col2 = margin + contentWidth / 2;

  const infoRows: [string, string][] = [
    [`Insured: ${claim.homeownerName || "N/A"}`, `Carrier: ${claim.insuranceCarrier || "N/A"}`],
    [`Property: ${claim.propertyAddress || "N/A"}`, `Policy #: ${claim.policyNumber || "N/A"}`],
    [
      `${claim.city || ""}, ${claim.state || ""} ${claim.zip || ""}`.trim(),
      `Claim #: ${claim.claimNumber || "N/A"}`,
    ],
    [
      `Date of Loss: ${claim.dateOfLoss || "N/A"}`,
      `Report Date: ${new Date().toLocaleDateString()}`,
    ],
  ];

  doc.setFont("helvetica", "normal");
  for (const [left, right] of infoRows) {
    doc.text(left, col1, yPos);
    doc.text(right, col2, yPos);
    yPos += 7;
  }
  yPos += 8;

  // ═══════════════════════════════════════════════════════════════════════
  // EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════
  yPos = addSectionHeader(doc, "Executive Summary", yPos, margin, contentWidth, pRgb);
  yPos = addWrappedText(doc, report.executiveSummary, yPos, margin, contentWidth);

  // ═══════════════════════════════════════════════════════════════════════
  // PROPERTY OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════
  yPos = checkPage(doc, yPos, 40);
  yPos = addSectionHeader(doc, "Property Overview", yPos, margin, contentWidth, pRgb);
  yPos = addWrappedText(doc, report.propertyOverview, yPos, margin, contentWidth);

  // ═══════════════════════════════════════════════════════════════════════
  // DAMAGE FINDINGS
  // ═══════════════════════════════════════════════════════════════════════
  yPos = checkPage(doc, yPos, 40);
  yPos = addSectionHeader(doc, "Damage Findings", yPos, margin, contentWidth, pRgb);

  for (const finding of report.damageFindings) {
    yPos = checkPage(doc, yPos, 30);

    // Finding sub-header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    const severity = finding.severity;
    const sevColor = SEVERITY_COLORS[severity] || SEVERITY_COLORS.Medium;
    doc.text(
      `${finding.component} — ${finding.damageType} (${finding.count} detected, ${severity} severity)`,
      margin,
      yPos
    );
    yPos += 5;

    // Severity indicator
    const svRgb = hexToRgb(sevColor);
    doc.setFillColor(svRgb.r, svRgb.g, svRgb.b);
    doc.roundedRect(margin, yPos - 3, 3, 3, 0.5, 0.5, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    yPos = addWrappedText(doc, finding.description, yPos, margin + 6, contentWidth - 6);
    yPos += 2;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // COLLATERAL EVIDENCE
  // ═══════════════════════════════════════════════════════════════════════
  if (report.collateralEvidence.length > 0) {
    yPos = checkPage(doc, yPos, 40);
    yPos = addSectionHeader(doc, "Collateral Evidence", yPos, margin, contentWidth, pRgb);

    for (const item of report.collateralEvidence) {
      yPos = checkPage(doc, yPos, 20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text(`• ${item.item}`, margin + 2, yPos);
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      yPos = addWrappedText(
        doc,
        `${item.finding} — ${item.significance}`,
        yPos,
        margin + 8,
        contentWidth - 8
      );
      yPos += 2;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WEATHER CORRELATION
  // ═══════════════════════════════════════════════════════════════════════
  if (report.weatherCorrelation) {
    yPos = checkPage(doc, yPos, 40);
    yPos = addSectionHeader(doc, "Weather Correlation", yPos, margin, contentWidth, pRgb);
    yPos = addWrappedText(doc, report.weatherCorrelation, yPos, margin, contentWidth);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DIRECTIONAL ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════
  if (report.directionalAnalysis) {
    yPos = checkPage(doc, yPos, 30);
    yPos = addSectionHeader(doc, "Directional Analysis", yPos, margin, contentWidth, pRgb);
    yPos = addWrappedText(doc, report.directionalAnalysis, yPos, margin, contentWidth);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // REPAIRABILITY ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════
  yPos = checkPage(doc, yPos, 40);
  yPos = addSectionHeader(doc, "Repairability Analysis", yPos, margin, contentWidth, pRgb);
  yPos = addWrappedText(doc, report.repairabilityAnalysis, yPos, margin, contentWidth);

  // ═══════════════════════════════════════════════════════════════════════
  // RECOMMENDATION
  // ═══════════════════════════════════════════════════════════════════════
  yPos = checkPage(doc, yPos, 50);
  yPos = addSectionHeader(doc, "Recommendation", yPos, margin, contentWidth, pRgb);

  // Highlighted recommendation box
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(pRgb.r, pRgb.g, pRgb.b);
  doc.setLineWidth(0.5);
  const recLines = doc.splitTextToSize(report.recommendation, contentWidth - 12) as string[];
  const recHeight = recLines.length * 5 + 8;
  doc.roundedRect(margin, yPos - 4, contentWidth, recHeight, 2, 2, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(pRgb.r, pRgb.g, pRgb.b);
  doc.text(recLines, margin + 6, yPos + 2);
  yPos += recHeight + 6;

  // ═══════════════════════════════════════════════════════════════════════
  // CARRIER ARGUMENTS
  // ═══════════════════════════════════════════════════════════════════════
  if (report.carrierArguments.length > 0) {
    yPos = checkPage(doc, yPos, 40);
    yPos = addSectionHeader(doc, "Supporting Arguments", yPos, margin, contentWidth, pRgb);

    for (let i = 0; i < report.carrierArguments.length; i++) {
      yPos = checkPage(doc, yPos, 15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      const argLines = doc.splitTextToSize(
        `${i + 1}. ${report.carrierArguments[i]}`,
        contentWidth - 8
      ) as string[];
      doc.text(argLines, margin + 4, yPos);
      yPos += argLines.length * 4.5 + 3;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONCLUSION
  // ═══════════════════════════════════════════════════════════════════════
  yPos = checkPage(doc, yPos, 40);
  yPos = addSectionHeader(doc, "Conclusion", yPos, margin, contentWidth, pRgb);
  yPos = addWrappedText(doc, report.conclusion, yPos, margin, contentWidth);

  // ═══════════════════════════════════════════════════════════════════════
  // FOOTER (all pages)
  // ═══════════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Storm Damage Justification Report — ${claim.claimNumber || "N/A"} — Page ${i} of ${totalPages}`,
      pageWidth / 2,
      274,
      { align: "center" }
    );
    doc.text(
      `Generated ${new Date().toLocaleDateString()} by ${orgName || "SkaiScraper"} — AI-Assisted Analysis`,
      pageWidth / 2,
      278,
      { align: "center" }
    );
  }

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#EF4444",
  High: "#F97316",
  Medium: "#EAB308",
  Low: "#3B82F6",
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  return {
    r: parseInt(cleaned.substring(0, 2), 16) || 0,
    g: parseInt(cleaned.substring(2, 4), 16) || 0,
    b: parseInt(cleaned.substring(4, 6), 16) || 0,
  };
}

function addSectionHeader(
  doc: jsPDF,
  title: string,
  yPos: number,
  margin: number,
  contentWidth: number,
  pRgb: { r: number; g: number; b: number }
): number {
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(pRgb.r, pRgb.g, pRgb.b);
  doc.text(title, margin, yPos);
  yPos += 2;
  doc.setDrawColor(pRgb.r, pRgb.g, pRgb.b);
  doc.setLineWidth(0.4);
  doc.line(margin, yPos, margin + contentWidth, yPos);
  yPos += 7;
  return yPos;
}

function addWrappedText(
  doc: jsPDF,
  text: string,
  yPos: number,
  xPos: number,
  maxWidth: number
): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  for (const line of lines) {
    yPos = checkPage(doc, yPos, 8);
    doc.text(line, xPos, yPos);
    yPos += 4.5;
  }
  yPos += 4;
  return yPos;
}

function checkPage(doc: jsPDF, yPos: number, needed: number): number {
  if (yPos + needed > 265) {
    doc.addPage();
    return 20;
  }
  return yPos;
}
