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
import {
  brandColor,
  COLOR,
  drawDivider,
  drawPanel,
  FONT_SIZE,
  PAGE,
  SPACING,
  wordWrap,
} from "./pdfTheme";

/**
 * Render Table of Contents page
 */
async function renderTOC(
  page: PDFPage,
  _context: ReportContext,
  sections: Section[],
  fonts: { font: any; fontBold: any },
  colors: {
    brandRgb: { r: number; g: number; b: number };
    accentRgb: { r: number; g: number; b: number };
  }
) {
  const { font, fontBold } = fonts;
  const brand = brandColor(colors.brandRgb);

  // Header bar
  page.drawRectangle({
    x: 0,
    y: PAGE.HEIGHT - SPACING.HEADER_BAR_HEIGHT,
    width: PAGE.WIDTH,
    height: SPACING.HEADER_BAR_HEIGHT,
    color: brand,
  });
  page.drawText("Table of Contents", {
    x: PAGE.MARGIN.LEFT,
    y: PAGE.HEIGHT - 34,
    size: FONT_SIZE.HEADER_BAR,
    font: fontBold,
    color: COLOR.TEXT_WHITE,
  });

  let yPos = PAGE.HEIGHT - SPACING.HEADER_BAR_HEIGHT - 30;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const label = `${i + 1}.  ${section.title}`;
    page.drawText(label, {
      x: PAGE.MARGIN.LEFT + 8,
      y: yPos,
      size: FONT_SIZE.BODY,
      font,
      color: COLOR.TEXT_PRIMARY,
    });
    yPos -= 22;
    if (yPos < PAGE.MARGIN.BOTTOM + 40) break;
  }
}

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

  const renderOpts = { font, fontBold, brandRgb, accentRgb, logoImage };

  // ── 1. Cover page ───────────────────────────────────────────────────
  const coverPage = pdfDoc.addPage([PAGE.WIDTH, PAGE.HEIGHT]);
  if (logoImage) {
    const logoDims = logoImage.scale(Math.min(120 / logoImage.width, 50 / logoImage.height));
    coverPage.drawImage(logoImage, {
      x: PAGE.WIDTH - PAGE.MARGIN.RIGHT - logoDims.width,
      y: PAGE.HEIGHT - 8 - logoDims.height - 10,
      width: logoDims.width,
      height: logoDims.height,
    });
  }
  await renderCoverPage(coverPage, context, { font, fontBold }, { brandRgb, accentRgb });

  // ── 2. Table of contents ────────────────────────────────────────────
  const tocPage = pdfDoc.addPage([PAGE.WIDTH, PAGE.HEIGHT]);
  await renderTOC(tocPage, context, sections, { font, fontBold }, { brandRgb, accentRgb });

  // ── 3. Render each content section ──────────────────────────────────
  for (const section of sections) {
    if (section.key === "cover") continue; // already rendered
    await renderSection(pdfDoc, section, context, renderOpts);
  }

  // Add page numbers
  addPageNumbers(pdfDoc, font, fontBold, brandRgb);

  const pdfBytes = await pdfDoc.save();

  return {
    success: true,
    buffer: Buffer.from(pdfBytes),
  };
}

/**
 * Render a single section into the PDF — professional layout
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
  const brand = brandColor(brandRgb);
  const accent = brandColor(accentRgb);
  const maxTextWidth = PAGE.CONTENT_WIDTH;

  // ── Executive summary has its own renderer ─────────────────────────
  if (section.key === "executive-summary") {
    const page = pdfDoc.addPage([PAGE.WIDTH, PAGE.HEIGHT]);
    await renderExecutiveSummary(page, context, { font, fontBold }, { brandRgb, accentRgb });
    await section.renderFn(context);
    return;
  }

  // ── Generic section setup ──────────────────────────────────────────
  let page: PDFPage = pdfDoc.addPage([PAGE.WIDTH, PAGE.HEIGHT]);
  let yPos = PAGE.HEIGHT;

  /** Draw the section header bar */
  const drawSectionHeader = (p: PDFPage, title: string) => {
    p.drawRectangle({
      x: 0,
      y: PAGE.HEIGHT - SPACING.HEADER_BAR_HEIGHT,
      width: PAGE.WIDTH,
      height: SPACING.HEADER_BAR_HEIGHT,
      color: brand,
    });
    p.drawText(title, {
      x: PAGE.MARGIN.LEFT,
      y: PAGE.HEIGHT - 34,
      size: FONT_SIZE.HEADER_BAR,
      font: fontBold,
      color: COLOR.TEXT_WHITE,
    });
  };

  drawSectionHeader(page, section.title);
  yPos = PAGE.HEIGHT - SPACING.HEADER_BAR_HEIGHT - 24;

  /** Ensure space; create continuation page if needed */
  const ensureSpace = (needed: number): void => {
    if (yPos < SPACING.FOOTER_BAR_HEIGHT + needed + 20) {
      page = pdfDoc.addPage([PAGE.WIDTH, PAGE.HEIGHT]);
      // Continuation header (smaller)
      page.drawRectangle({
        x: 0,
        y: PAGE.HEIGHT - 30,
        width: PAGE.WIDTH,
        height: 30,
        color: brand,
      });
      page.drawText(`${section.title} (continued)`, {
        x: PAGE.MARGIN.LEFT,
        y: PAGE.HEIGHT - 22,
        size: FONT_SIZE.LABEL,
        font: fontBold,
        color: COLOR.TEXT_WHITE,
      });
      yPos = PAGE.HEIGHT - 60;
    }
  };

  /** Draw a text line and advance yPos */
  const drawText = (
    text: string,
    opts?: { bold?: boolean; size?: number; color?: any; indent?: number }
  ) => {
    const fontSize = opts?.size || FONT_SIZE.BODY;
    ensureSpace(fontSize + 6);
    page.drawText(text.substring(0, 120), {
      x: PAGE.MARGIN.LEFT + (opts?.indent || 0),
      y: yPos,
      size: fontSize,
      font: opts?.bold ? fontBold : font,
      color: opts?.color || COLOR.TEXT_PRIMARY,
    });
    yPos -= fontSize + 5;
  };

  /** Draw wrapped paragraph */
  const drawParagraph = (
    text: string,
    opts?: { size?: number; color?: any; indent?: number; bold?: boolean }
  ) => {
    const fontSize = opts?.size || FONT_SIZE.BODY;
    const indent = opts?.indent || 0;
    const lines = wordWrap(text, opts?.bold ? fontBold : font, fontSize, maxTextWidth - indent);
    for (const line of lines) {
      drawText(line, opts);
    }
  };

  // ── Real section content based on key ──────────────────────────────
  switch (section.key) {
    case "weather-verification": {
      drawText("Weather Verification Report", { bold: true, size: FONT_SIZE.SUBTITLE });
      yPos -= 8;
      drawDivider(page, yPos, COLOR.DIVIDER_LIGHT);
      yPos -= 12;

      if (context.weather) {
        const weatherFields: [string, string | undefined][] = [
          ["Date of Loss", context.weather.dateOfLoss],
          ["Hail Size", context.weather.hailSize],
          ["Wind Speed", context.weather.windSpeed],
          ["Source", context.weather.source],
        ];

        // Info panel
        const panelH = weatherFields.filter(([, v]) => v).length * 20 + 12;
        drawPanel(page, PAGE.MARGIN.LEFT, yPos - panelH, maxTextWidth, panelH);

        for (const [label, value] of weatherFields) {
          if (!value) continue;
          page.drawText(`${label}:`, {
            x: PAGE.MARGIN.LEFT + 10,
            y: yPos - 4,
            size: FONT_SIZE.BODY,
            font: fontBold,
            color: COLOR.TEXT_SECONDARY,
          });
          page.drawText(value, {
            x: PAGE.MARGIN.LEFT + 130,
            y: yPos - 4,
            size: FONT_SIZE.BODY,
            font,
            color: COLOR.TEXT_PRIMARY,
          });
          yPos -= 20;
        }
        yPos -= 16;

        if (context.weather.verificationStatement) {
          drawText("Verification Statement", { bold: true, size: FONT_SIZE.BODY_LARGE });
          yPos -= 4;
          drawParagraph(context.weather.verificationStatement);
        }
      } else {
        drawText("Weather data not available for this claim.", { color: COLOR.TEXT_MUTED });
      }
      break;
    }

    case "photo-evidence": {
      drawText("Photo Evidence Documentation", { bold: true, size: FONT_SIZE.SUBTITLE });
      yPos -= 4;

      if (context.photos && context.photos.length > 0) {
        drawText(`Total Photos: ${context.photos.length}`, {
          size: FONT_SIZE.BODY,
          color: COLOR.TEXT_SECONDARY,
        });
        yPos -= 8;
        drawDivider(page, yPos, COLOR.DIVIDER_LIGHT);
        yPos -= 16;

        // 2-column photo grid
        const photosToEmbed = context.photos.slice(0, 12);
        let colIndex = 0;

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
                  const maxW = (PAGE.CONTENT_WIDTH - 16) / 2;
                  const maxH = 160;
                  const imgDims = img.scale(Math.min(maxW / img.width, maxH / img.height));
                  const xOffset = colIndex === 0 ? PAGE.MARGIN.LEFT : PAGE.MARGIN.LEFT + maxW + 16;

                  ensureSpace(imgDims.height + 30);

                  page.drawImage(img, {
                    x: xOffset,
                    y: yPos - imgDims.height,
                    width: imgDims.width,
                    height: imgDims.height,
                  });

                  // Caption below image
                  const caption = (photo.caption || "Untitled").substring(0, 45);
                  page.drawText(caption, {
                    x: xOffset,
                    y: yPos - imgDims.height - 12,
                    size: FONT_SIZE.SMALL,
                    font,
                    color: COLOR.TEXT_SECONDARY,
                  });

                  if (colIndex === 1) {
                    yPos -= imgDims.height + 28;
                    colIndex = 0;
                  } else {
                    colIndex = 1;
                  }
                  continue;
                }
              }
            }
          } catch {
            // Non-fatal — text fallback
          }
          // Text-only fallback
          drawText(`\u{1F4F7} ${photo.caption || "Photo"}`, { size: FONT_SIZE.LABEL });
          drawText(
            `  Category: ${photo.category || "General"} | Location: ${photo.locationTag || "N/A"}`,
            { size: FONT_SIZE.SMALL, color: COLOR.TEXT_MUTED }
          );
          yPos -= 4;
        }

        if (colIndex === 1) yPos -= 180; // Flush last row

        if (context.photos.length > 12) {
          yPos -= 8;
          drawText(`+ ${context.photos.length - 12} additional photos on file`, {
            size: FONT_SIZE.LABEL,
            color: COLOR.TEXT_MUTED,
          });
        }
      } else {
        drawText("No photos uploaded for this claim.", { color: COLOR.TEXT_MUTED });
      }
      break;
    }

    case "scope-matrix": {
      drawText("Scope of Work / Line Items", { bold: true, size: FONT_SIZE.SUBTITLE });
      yPos -= 4;
      drawDivider(page, yPos, COLOR.DIVIDER_LIGHT);
      yPos -= 12;

      if (context.lineItems && context.lineItems.length > 0) {
        // Table header
        const cols = { desc: PAGE.MARGIN.LEFT, qty: 370, unit: 410, price: 470 };

        drawPanel(page, PAGE.MARGIN.LEFT, yPos - 14, maxTextWidth, 18, COLOR.BG_STRIPE);
        page.drawText("Description", {
          x: cols.desc + 4,
          y: yPos - 10,
          size: FONT_SIZE.TABLE_HEADER,
          font: fontBold,
          color: COLOR.TEXT_SECONDARY,
        });
        page.drawText("Qty", {
          x: cols.qty,
          y: yPos - 10,
          size: FONT_SIZE.TABLE_HEADER,
          font: fontBold,
          color: COLOR.TEXT_SECONDARY,
        });
        page.drawText("Unit", {
          x: cols.unit,
          y: yPos - 10,
          size: FONT_SIZE.TABLE_HEADER,
          font: fontBold,
          color: COLOR.TEXT_SECONDARY,
        });
        page.drawText("Price", {
          x: cols.price,
          y: yPos - 10,
          size: FONT_SIZE.TABLE_HEADER,
          font: fontBold,
          color: COLOR.TEXT_SECONDARY,
        });
        yPos -= 20;

        let totalPrice = 0;

        for (let i = 0; i < context.lineItems.length; i++) {
          const item = context.lineItems[i];
          ensureSpace(SPACING.TABLE_ROW_HEIGHT + 4);

          // Zebra stripe
          if (i % 2 === 0) {
            drawPanel(
              page,
              PAGE.MARGIN.LEFT,
              yPos - 12,
              maxTextWidth,
              SPACING.TABLE_ROW_HEIGHT,
              COLOR.BG_LIGHT
            );
          }

          const desc = item.description.substring(0, 50);
          page.drawText(desc, {
            x: cols.desc + 4,
            y: yPos - 8,
            size: FONT_SIZE.TABLE_CELL,
            font,
            color: COLOR.TEXT_PRIMARY,
          });
          page.drawText(String(item.quantity), {
            x: cols.qty,
            y: yPos - 8,
            size: FONT_SIZE.TABLE_CELL,
            font,
            color: COLOR.TEXT_PRIMARY,
          });
          page.drawText(item.unit || "EA", {
            x: cols.unit,
            y: yPos - 8,
            size: FONT_SIZE.TABLE_CELL,
            font,
            color: COLOR.TEXT_PRIMARY,
          });

          const price = item.contractorPrice || 0;
          totalPrice += price;
          page.drawText(price ? `$${price.toLocaleString()}` : "TBD", {
            x: cols.price,
            y: yPos - 8,
            size: FONT_SIZE.TABLE_CELL,
            font,
            color: COLOR.TEXT_PRIMARY,
          });
          yPos -= SPACING.TABLE_ROW_HEIGHT;
        }

        // Total row
        yPos -= 4;
        drawDivider(page, yPos, brand);
        yPos -= 14;
        page.drawText("TOTAL", {
          x: cols.desc + 4,
          y: yPos,
          size: FONT_SIZE.TABLE_HEADER,
          font: fontBold,
          color: COLOR.TEXT_PRIMARY,
        });
        page.drawText(`$${totalPrice.toLocaleString()}`, {
          x: cols.price,
          y: yPos,
          size: FONT_SIZE.TABLE_HEADER,
          font: fontBold,
          color: COLOR.TEXT_PRIMARY,
        });
      } else {
        drawText("No line items available. Scope pending.", { color: COLOR.TEXT_MUTED });
      }
      break;
    }

    case "code-compliance": {
      drawText("Building Code Compliance", { bold: true, size: FONT_SIZE.SUBTITLE });
      yPos -= 4;
      drawDivider(page, yPos, COLOR.DIVIDER_LIGHT);
      yPos -= 12;

      if (context.codes && context.codes.length > 0) {
        for (const code of context.codes) {
          ensureSpace(60);
          drawText(`${code.code} \u2014 ${code.description}`, { bold: true, size: FONT_SIZE.BODY });
          drawText(`Jurisdiction: ${code.jurisdictionType}`, {
            size: FONT_SIZE.SMALL,
            color: COLOR.TEXT_SECONDARY,
            indent: 8,
          });
          drawParagraph(code.requirementText, { size: FONT_SIZE.LABEL, indent: 8 });
          yPos -= 8;
          drawDivider(page, yPos, COLOR.DIVIDER_LIGHT);
          yPos -= 8;
        }
      } else {
        drawText("No code citations on file.", { color: COLOR.TEXT_MUTED });
      }
      break;
    }

    case "supplements": {
      drawText("Supplement Items", { bold: true, size: FONT_SIZE.SUBTITLE });
      yPos -= 4;
      drawDivider(page, yPos, COLOR.DIVIDER_LIGHT);
      yPos -= 12;

      if (context.supplements && context.supplements.length > 0) {
        for (const supp of context.supplements) {
          ensureSpace(50);
          drawText(`${supp.description}  \u2014  $${supp.amount.toLocaleString()}`, {
            bold: true,
            size: FONT_SIZE.BODY,
          });
          drawText(`Reason: ${supp.reasonCode}`, {
            size: FONT_SIZE.SMALL,
            color: COLOR.TEXT_SECONDARY,
            indent: 8,
          });
          if (supp.justification) {
            drawParagraph(supp.justification, { size: FONT_SIZE.LABEL, indent: 8 });
          }
          yPos -= 8;
        }
      } else {
        drawText("No supplements filed for this claim.", { color: COLOR.TEXT_MUTED });
      }
      break;
    }

    case "adjuster-notes": {
      drawText("Adjuster Notes & Rebuttals", { bold: true, size: FONT_SIZE.SUBTITLE });
      yPos -= 4;
      drawDivider(page, yPos, COLOR.DIVIDER_LIGHT);
      yPos -= 12;

      const notes = context.adjusterNotes || "No adjuster notes available.";
      drawParagraph(notes);
      break;
    }

    default: {
      // For sections not yet implemented (test-cuts, pricing-comparison, etc.)
      drawText(section.title, { bold: true, size: FONT_SIZE.SUBTITLE });
      yPos -= 4;
      drawDivider(page, yPos, COLOR.DIVIDER_LIGHT);
      yPos -= 12;
      drawText("This section is available in the full report.", {
        size: FONT_SIZE.BODY,
        color: COLOR.TEXT_MUTED,
      });
      break;
    }
  }

  // Call section's render function for any custom logic
  await section.renderFn(context);
}

/**
 * Add professional page numbers and footer to all pages
 */
function addPageNumbers(
  pdfDoc: PDFDocument,
  font: any,
  fontBold: any,
  brandRgb: { r: number; g: number; b: number }
) {
  const pages = pdfDoc.getPages();
  const brand = brandColor(brandRgb);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  pages.forEach((page, index) => {
    const { width } = page.getSize();

    // Footer bar
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height: SPACING.FOOTER_BAR_HEIGHT,
      color: brand,
    });

    // Page number (right)
    const pageText = `Page ${index + 1} of ${pages.length}`;
    const pageTextWidth = font.widthOfTextAtSize(pageText, FONT_SIZE.PAGE_NUMBER);
    page.drawText(pageText, {
      x: width - PAGE.MARGIN.RIGHT - pageTextWidth,
      y: 9,
      size: FONT_SIZE.PAGE_NUMBER,
      font,
      color: COLOR.TEXT_WHITE,
    });

    // Date (left)
    page.drawText(dateStr, {
      x: PAGE.MARGIN.LEFT,
      y: 9,
      size: FONT_SIZE.PAGE_NUMBER,
      font,
      color: COLOR.TEXT_WHITE,
    });

    // "CONFIDENTIAL" center text (skip cover page)
    if (index > 0) {
      const confText = "CONFIDENTIAL";
      const confWidth = font.widthOfTextAtSize(confText, FONT_SIZE.TINY);
      page.drawText(confText, {
        x: (width - confWidth) / 2,
        y: 10,
        size: FONT_SIZE.TINY,
        font,
        color: rgb(1, 1, 1),
      });
    }
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
