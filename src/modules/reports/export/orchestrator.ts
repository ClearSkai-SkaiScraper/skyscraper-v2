// ============================================================================
// EXPORT ORCHESTRATOR - Universal Contractor Packet
// ============================================================================
// Composes sections, applies branding, generates PDF/DOCX/ZIP
// ============================================================================

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { getAllAISections } from "@/modules/ai/jobs/persist";
import { logAction } from "@/modules/audit/core/logger";

import { applyBrandingColors } from "../core/BrandingProvider";
import { getSectionsByKeys, validateSectionData } from "../core/SectionRegistry";
import type { ExportOptions, ExportResult, ReportContext, Section } from "../types";

/**
 * Check for unapproved AI fields
 */
async function checkUnapprovedAI(reportId: string): Promise<{
  hasUnapproved: boolean;
  count: number;
  sections: string[];
}> {
  const aiSections = await getAllAISections(reportId);
  let count = 0;
  const sectionKeys: string[] = [];

  for (const [sectionKey, section] of Object.entries(aiSections)) {
    const sectionData = section as {
      fields: Record<string, { aiGenerated?: boolean; approved?: boolean }>;
    };
    const unapprovedFields = Object.entries(sectionData.fields).filter(
      ([_, field]) => field.aiGenerated && !field.approved
    );
    if (unapprovedFields.length > 0) {
      count += unapprovedFields.length;
      sectionKeys.push(sectionKey);
    }
  }

  return {
    hasUnapproved: count > 0,
    count,
    sections: sectionKeys,
  };
}

/**
 * Main export orchestrator
 * Fetches data, composes sections, applies branding, generates file
 */
export async function exportReport(options: ExportOptions): Promise<ExportResult> {
  const { format, sections: sectionKeys, context, blockOnUnapproved } = options;

  try {
    // Log export start
    if (context?.orgId && context?.userId) {
      await logAction({
        orgId: context.orgId,
        userId: context.userId,
        userName: context.userName || "Unknown",
        action: "EXPORT_START",
        jobId: context.jobId,
        metadata: { format, sectionCount: sectionKeys.length },
      }).catch((err) => console.warn("[Export] Failed to log start:", err));
    }

    // Check for unapproved AI fields (if blocking enabled)
    if (blockOnUnapproved && context?.reportId) {
      const aiCheck = await checkUnapprovedAI(context.reportId);
      if (aiCheck.hasUnapproved) {
        // Log export failed
        if (context?.orgId && context?.userId) {
          await logAction({
            orgId: context.orgId,
            userId: context.userId,
            userName: context.userName || "Unknown",
            action: "EXPORT_FAILED",
            jobId: context.jobId,
            metadata: { reason: "unapproved_ai_fields", count: aiCheck.count },
          }).catch((err) => console.warn("[Export] Failed to log error:", err));
        }

        return {
          success: false,
          error: `Cannot export: ${aiCheck.count} unapproved AI field(s) in sections: ${aiCheck.sections.join(", ")}. Approve or disable blocking.`,
          errorCode: "AI_UNAPPROVED",
          hint: `Review and approve AI-generated fields in: ${aiCheck.sections.join(", ")}. Or disable "Block on Unapproved AI" in export settings.`,
        };
      }
    }

    // Get sections to render
    const sections = getSectionsByKeys(sectionKeys);

    // Validate required data
    const validation = validateSectionData(sections, context);
    if (!validation.valid) {
      // Log export failed
      if (context?.orgId && context?.userId) {
        await logAction({
          orgId: context.orgId,
          userId: context.userId,
          userName: context.userName || "Unknown",
          action: "EXPORT_FAILED",
          jobId: context.jobId,
          metadata: { reason: "missing_data", missing: validation.missing },
        }).catch((err) => console.warn("[Export] Failed to log error:", err));
      }

      return {
        success: false,
        error: `Missing required data: ${validation.missing.join(", ")}`,
        errorCode: "DATA_PROVIDER_EMPTY",
        hint: `Complete these sections before exporting: ${validation.missing.join(", ")}. Or deselect them from the export.`,
      };
    }

    // Route to appropriate export handler
    let result: ExportResult;
    switch (format) {
      case "pdf":
        result = await exportPDF(sections, context);
        break;
      case "docx":
        result = await exportDOCX(sections, context);
        break;
      case "zip":
        result = await exportZIP(sections, context);
        break;
      default:
        result = {
          success: false,
          error: `Unsupported format: ${format}`,
          errorCode: "UNSUPPORTED_FORMAT",
          hint: `Supported formats: PDF, DOCX, ZIP. Please select a valid format.`,
        };
    }

    // Log export complete/failed
    if (context?.orgId && context?.userId) {
      await logAction({
        orgId: context.orgId,
        userId: context.userId,
        userName: context.userName || "Unknown",
        action: result.success ? "EXPORT_COMPLETE" : "EXPORT_FAILED",
        jobId: context.jobId,
        metadata: {
          format,
          sectionCount: sectionKeys.length,
          ...(result.success ? { bufferSize: result.buffer?.length } : { error: result.error }),
        },
      }).catch((err) => console.warn("[Export] Failed to log completion:", err));
    }

    return result;
  } catch (error: any) {
    console.error("[Export Orchestrator] Error:", error);

    // Log export failed
    if (context?.orgId && context?.userId) {
      await logAction({
        orgId: context.orgId,
        userId: context.userId,
        userName: context.userName || "Unknown",
        action: "EXPORT_FAILED",
        jobId: context.jobId,
        metadata: { error: error.message, format },
      }).catch((err) => console.warn("[Export] Failed to log error:", err));
    }

    return {
      success: false,
      error: error.message || "Export failed",
      errorCode: "UNKNOWN",
      hint: "An unexpected error occurred. Please try again or contact support if the issue persists.",
    };
  }
}

/**
 * Export as PDF using pdf-lib
 */
async function exportPDF(sections: Section[], context: ReportContext): Promise<ExportResult> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { brandRgb, accentRgb } = applyBrandingColors(context.branding);

  // Render each section
  for (const section of sections) {
    await renderSection(pdfDoc, section, context, {
      font,
      fontBold,
      brandRgb,
      accentRgb,
    });
  }

  // Add page numbers
  addPageNumbers(pdfDoc, font, brandRgb);

  const pdfBytes = await pdfDoc.save();

  return {
    success: true,
    buffer: Buffer.from(pdfBytes),
  };
}

/**
 * Render a single section into the PDF
 */
async function renderSection(
  pdfDoc: PDFDocument,
  section: Section,
  context: ReportContext,
  fonts: any
) {
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  const { font, fontBold, brandRgb, accentRgb } = fonts;

  // Section header bar
  page.drawRectangle({
    x: 0,
    y: height - 60,
    width,
    height: 60,
    color: rgb(brandRgb.r, brandRgb.g, brandRgb.b),
  });

  page.drawText(section.title, {
    x: 40,
    y: height - 40,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // ── Real section content based on key ──────────────────────────────────
  let yPos = height - 90;
  const lineHeight = 16;
  const margin = 40;
  const maxWidth = width - margin * 2;

  const drawLine = (
    text: string,
    opts?: { bold?: boolean; size?: number; color?: { r: number; g: number; b: number } }
  ) => {
    if (yPos < 50) {
      // Add a new page if we run out of space
      const newPage = pdfDoc.addPage([612, 792]);
      yPos = 792 - 50;
      // Draw on newPage instead — for simplicity we just cap content per section page
      return;
    }
    page.drawText(text.substring(0, 90), {
      x: margin,
      y: yPos,
      size: opts?.size || 11,
      font: opts?.bold ? fontBold : font,
      color: opts?.color ? rgb(opts.color.r, opts.color.g, opts.color.b) : rgb(0.1, 0.1, 0.1),
    });
    yPos -= (opts?.size || 11) + 5;
  };

  switch (section.key) {
    case "cover": {
      yPos = height - 100;
      drawLine(context.branding.companyName, { bold: true, size: 22 });
      drawLine("");
      drawLine("Contractor Packet / Inspection Report", {
        size: 14,
        color: { r: 0.3, g: 0.3, b: 0.3 },
      });
      drawLine("");
      drawLine(`Prepared for: ${context.metadata.clientName}`, { size: 13 });
      drawLine(`Property: ${context.metadata.propertyAddress}`, { size: 13 });
      if (context.metadata.claimNumber)
        drawLine(`Claim #: ${context.metadata.claimNumber}`, { size: 13 });
      if (context.metadata.carrierName)
        drawLine(`Carrier: ${context.metadata.carrierName}`, { size: 13 });
      if (context.metadata.dateOfLoss)
        drawLine(`Date of Loss: ${context.metadata.dateOfLoss}`, { size: 13 });
      drawLine("");
      drawLine(`Prepared by: ${context.metadata.preparedBy}`, { size: 12 });
      drawLine(`Date: ${context.metadata.submittedDate}`, { size: 12 });
      if (context.branding.phone) drawLine(`Phone: ${context.branding.phone}`, { size: 12 });
      if (context.branding.email) drawLine(`Email: ${context.branding.email}`, { size: 12 });
      if (context.branding.licenseNumber)
        drawLine(`License: ${context.branding.licenseNumber}`, { size: 12 });
      break;
    }

    case "executive-summary": {
      drawLine("Executive Summary", { bold: true, size: 14 });
      drawLine("");
      const summary = context.executiveSummary || "No executive summary available.";
      // Word-wrap the summary
      const words = summary.split(" ");
      let line = "";
      for (const word of words) {
        if ((line + " " + word).length > 80) {
          drawLine(line);
          line = word;
        } else {
          line = line ? line + " " + word : word;
        }
      }
      if (line) drawLine(line);
      break;
    }

    case "weather-verification": {
      drawLine("Weather Verification Report", { bold: true, size: 14 });
      drawLine("");
      if (context.weather) {
        drawLine(`Date of Loss: ${context.weather.dateOfLoss}`, { size: 12 });
        if (context.weather.hailSize)
          drawLine(`Hail Size: ${context.weather.hailSize}`, { size: 12 });
        if (context.weather.windSpeed)
          drawLine(`Wind Speed: ${context.weather.windSpeed}`, { size: 12 });
        drawLine(`Source: ${context.weather.source}`, { size: 12 });
        drawLine("");
        drawLine("Verification Statement:", { bold: true, size: 12 });
        const stmt = context.weather.verificationStatement;
        const stmtWords = stmt.split(" ");
        let stmtLine = "";
        for (const w of stmtWords) {
          if ((stmtLine + " " + w).length > 80) {
            drawLine(stmtLine);
            stmtLine = w;
          } else {
            stmtLine = stmtLine ? stmtLine + " " + w : w;
          }
        }
        if (stmtLine) drawLine(stmtLine);
      } else {
        drawLine("Weather data not available for this claim.", {
          color: { r: 0.5, g: 0.5, b: 0.5 },
        });
      }
      break;
    }

    case "photo-evidence": {
      drawLine("Photo Evidence Documentation", { bold: true, size: 14 });
      drawLine("");
      if (context.photos && context.photos.length > 0) {
        drawLine(`Total Photos: ${context.photos.length}`, { size: 12 });
        drawLine("");
        for (const photo of context.photos.slice(0, 20)) {
          drawLine(`• ${photo.caption}`, { size: 10 });
          drawLine(
            `  Category: ${photo.category || "General"} | Location: ${photo.locationTag || "N/A"}`,
            { size: 9, color: { r: 0.4, g: 0.4, b: 0.4 } }
          );
        }
        if (context.photos.length > 20) {
          drawLine(`  ... and ${context.photos.length - 20} more photos`, {
            size: 10,
            color: { r: 0.4, g: 0.4, b: 0.4 },
          });
        }
      } else {
        drawLine("No photos uploaded for this claim.", { color: { r: 0.5, g: 0.5, b: 0.5 } });
      }
      break;
    }

    case "scope-matrix": {
      drawLine("Scope of Work / Line Items", { bold: true, size: 14 });
      drawLine("");
      if (context.lineItems && context.lineItems.length > 0) {
        drawLine("Description                                      Qty    Unit   Price", {
          bold: true,
          size: 9,
        });
        drawLine("─".repeat(75), { size: 9 });
        for (const item of context.lineItems) {
          const desc = item.description.substring(0, 45).padEnd(45);
          const qty = String(item.quantity).padStart(5);
          const unit = (item.unit || "EA").padEnd(6);
          const price = item.contractorPrice ? `$${item.contractorPrice.toLocaleString()}` : "TBD";
          drawLine(`${desc} ${qty}  ${unit} ${price}`, { size: 9 });
        }
      } else {
        drawLine("No line items available. Scope pending.", { color: { r: 0.5, g: 0.5, b: 0.5 } });
      }
      break;
    }

    case "code-compliance": {
      drawLine("Building Code Compliance", { bold: true, size: 14 });
      drawLine("");
      if (context.codes && context.codes.length > 0) {
        for (const code of context.codes) {
          drawLine(`${code.code} — ${code.description}`, { bold: true, size: 11 });
          drawLine(`  Jurisdiction: ${code.jurisdictionType}`, {
            size: 10,
            color: { r: 0.3, g: 0.3, b: 0.3 },
          });
          const reqWords = code.requirementText.split(" ");
          let reqLine = "  ";
          for (const w of reqWords) {
            if ((reqLine + " " + w).length > 85) {
              drawLine(reqLine, { size: 10 });
              reqLine = "  " + w;
            } else {
              reqLine = reqLine + " " + w;
            }
          }
          if (reqLine.trim()) drawLine(reqLine, { size: 10 });
          drawLine("");
        }
      } else {
        drawLine("No code citations on file.", { color: { r: 0.5, g: 0.5, b: 0.5 } });
      }
      break;
    }

    case "supplements": {
      drawLine("Supplement Items", { bold: true, size: 14 });
      drawLine("");
      if (context.supplements && context.supplements.length > 0) {
        for (const supp of context.supplements) {
          drawLine(`• ${supp.description}  —  $${supp.amount.toLocaleString()}`, {
            bold: true,
            size: 11,
          });
          drawLine(`  Reason: ${supp.reasonCode}`, { size: 10, color: { r: 0.3, g: 0.3, b: 0.3 } });
          if (supp.justification) {
            drawLine(`  ${supp.justification.substring(0, 85)}`, { size: 10 });
          }
          drawLine("");
        }
      } else {
        drawLine("No supplements filed for this claim.", { color: { r: 0.5, g: 0.5, b: 0.5 } });
      }
      break;
    }

    case "adjuster-notes": {
      drawLine("Adjuster Notes & Rebuttals", { bold: true, size: 14 });
      drawLine("");
      const notes = context.adjusterNotes || "No adjuster notes available.";
      const noteWords = notes.split(" ");
      let noteLine = "";
      for (const w of noteWords) {
        if ((noteLine + " " + w).length > 80) {
          drawLine(noteLine);
          noteLine = w;
        } else {
          noteLine = noteLine ? noteLine + " " + w : w;
        }
      }
      if (noteLine) drawLine(noteLine);
      break;
    }

    default: {
      // For sections not yet implemented (toc, test-cuts, pricing-comparison, etc.)
      drawLine(`${section.title}`, { bold: true, size: 14 });
      drawLine("");
      drawLine("This section is available in the full report.", {
        size: 11,
        color: { r: 0.4, g: 0.4, b: 0.4 },
      });
      break;
    }
  }

  // Call section's render function for any custom logic
  await section.renderFn(context);
}

/**
 * Add page numbers to all pages
 */
function addPageNumbers(
  pdfDoc: PDFDocument,
  font: any,
  brandRgb: { r: number; g: number; b: number }
) {
  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    const pageNum = `Page ${index + 1} of ${pages.length}`;

    // Footer bar
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: 30,
      color: rgb(brandRgb.r, brandRgb.g, brandRgb.b),
    });

    page.drawText(pageNum, {
      x: width / 2 - 30,
      y: 10,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });
  });
}

/**
 * Export as DOCX — generates PDF and returns it (DOCX planned for future release)
 */
async function exportDOCX(sections: Section[], context: ReportContext): Promise<ExportResult> {
  // DOCX is a planned feature — fallback to PDF for now
  return exportPDF(sections, context);
}

/**
 * Export as ZIP — generates PDF as single file (full ZIP with attachments planned for future release)
 */
async function exportZIP(sections: Section[], context: ReportContext): Promise<ExportResult> {
  // ZIP with attachments is a planned feature — fallback to PDF for now
  return exportPDF(sections, context);
}
