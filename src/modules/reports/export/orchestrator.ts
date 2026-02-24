// ============================================================================
// EXPORT ORCHESTRATOR - Universal Contractor Packet
// ============================================================================
// Composes sections, applies branding, generates PDF/DOCX/ZIP
// ============================================================================

import { PDFDocument, PDFImage, PDFPage, rgb, StandardFonts } from "pdf-lib";

import { getAllAISections } from "@/modules/ai/jobs/persist";
import { logAction } from "@/modules/audit/core/logger";

import { applyBrandingColors } from "../core/BrandingProvider";
import { getSectionsByKeys, validateSectionData } from "../core/SectionRegistry";
import { renderCoverPage } from "../sections/CoverPage";
import { renderExecutiveSummary } from "../sections/ExecutiveSummary";
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
 * Fetch and embed a logo image into the PDF document.
 * Supports PNG, JPG, and common web image formats.
 * Returns null if the logo can't be fetched/embedded (non-fatal).
 */
async function embedLogo(pdfDoc: PDFDocument, logoUrl?: string): Promise<PDFImage | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    // Detect format from content-type or magic bytes
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("png") || buf[0] === 0x89) {
      return await pdfDoc.embedPng(buf);
    }
    // Default to JPEG for jpg/webp/other
    return await pdfDoc.embedJpg(buf);
  } catch {
    console.warn("[Export] Could not embed logo from:", logoUrl);
    return null;
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

  // Embed company logo (non-blocking)
  const logoImage = await embedLogo(pdfDoc, context.branding.logoUrl);

  // Render each section
  for (const section of sections) {
    await renderSection(pdfDoc, section, context, {
      font,
      fontBold,
      brandRgb,
      accentRgb,
      logoImage,
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
  fonts: {
    font: any;
    fontBold: any;
    brandRgb: { r: number; g: number; b: number };
    accentRgb: { r: number; g: number; b: number };
    logoImage: PDFImage | null;
  }
) {
  const { font, fontBold, brandRgb, accentRgb, logoImage } = fonts;

  // ── Use polished renderers for cover and executive-summary ──────────
  if (section.key === "cover") {
    const page = pdfDoc.addPage([612, 792]);
    // Draw logo on cover if available
    if (logoImage) {
      const logoDims = logoImage.scale(Math.min(120 / logoImage.width, 60 / logoImage.height));
      page.drawImage(logoImage, {
        x: 612 - 60 - logoDims.width,
        y: 792 - 30 - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
    }
    await renderCoverPage(page, context, { font, fontBold }, { brandRgb, accentRgb });
    await section.renderFn(context);
    return;
  }

  if (section.key === "executive-summary") {
    const page = pdfDoc.addPage([612, 792]);
    await renderExecutiveSummary(page, context, { font, fontBold }, { brandRgb, accentRgb });
    await section.renderFn(context);
    return;
  }

  // ── Generic section rendering with overflow handling ─────────────────
  let page: PDFPage = pdfDoc.addPage([612, 792]);
  const width = 612;
  const height = 792;

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
  const margin = 40;

  const drawLine = (
    text: string,
    opts?: { bold?: boolean; size?: number; color?: { r: number; g: number; b: number } }
  ) => {
    const lineSize = opts?.size || 11;
    if (yPos < 60) {
      // Overflow: add a new page and continue drawing there
      page = pdfDoc.addPage([612, 792]);
      yPos = 792 - 50;
      // Draw a continuation header
      page.drawRectangle({
        x: 0,
        y: 792 - 30,
        width,
        height: 30,
        color: rgb(brandRgb.r, brandRgb.g, brandRgb.b),
      });
      page.drawText(`${section.title} (continued)`, {
        x: 40,
        y: 792 - 22,
        size: 10,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      yPos = 792 - 60;
    }
    page.drawText(text.substring(0, 90), {
      x: margin,
      y: yPos,
      size: lineSize,
      font: opts?.bold ? fontBold : font,
      color: opts?.color ? rgb(opts.color.r, opts.color.g, opts.color.b) : rgb(0.1, 0.1, 0.1),
    });
    yPos -= lineSize + 5;
  };

  switch (section.key) {
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
        // Embed actual photo images (up to 12 per report for size)
        const photosToEmbed = context.photos.slice(0, 12);
        for (const photo of photosToEmbed) {
          try {
            if (photo.url) {
              const imgRes = await fetch(photo.url, { signal: AbortSignal.timeout(6000) });
              if (imgRes.ok) {
                const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
                const ct = imgRes.headers.get("content-type") || "";
                let img: PDFImage | null = null;
                if (ct.includes("png") || imgBuf[0] === 0x89) {
                  img = await pdfDoc.embedPng(imgBuf);
                } else {
                  img = await pdfDoc.embedJpg(imgBuf);
                }
                if (img) {
                  // Check if we need a new page for the image
                  if (yPos < 220) {
                    page = pdfDoc.addPage([612, 792]);
                    yPos = 792 - 50;
                  }
                  const imgDims = img.scale(Math.min(250 / img.width, 180 / img.height));
                  page.drawImage(img, {
                    x: margin,
                    y: yPos - imgDims.height,
                    width: imgDims.width,
                    height: imgDims.height,
                  });
                  yPos -= imgDims.height + 5;
                }
              }
            }
          } catch {
            // Non-fatal — continue with text fallback
          }
          drawLine(`📷 ${photo.caption}`, { size: 10 });
          drawLine(
            `  Category: ${photo.category || "General"} | Location: ${photo.locationTag || "N/A"}`,
            { size: 9, color: { r: 0.4, g: 0.4, b: 0.4 } }
          );
          drawLine("");
        }
        if (context.photos.length > 12) {
          drawLine(`  ... and ${context.photos.length - 12} additional photos on file`, {
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
    const { width, height: _height } = page.getSize();
    const pageNum = `Page ${index + 1} of ${pages.length}  |  ${new Date().toLocaleDateString()}`;

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
