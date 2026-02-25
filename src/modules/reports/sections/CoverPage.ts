// ============================================================================
// COVER PAGE RENDERER — Professional contractor packet cover
// ============================================================================

import { PDFFont, PDFPage, rgb } from "pdf-lib";

import { brandColor, COLOR, drawDivider, FONT_SIZE, PAGE, SPACING } from "../export/pdfTheme";
import type { ReportContext } from "../types";

export async function renderCoverPage(
  page: PDFPage,
  context: ReportContext,
  fonts: { font: PDFFont; fontBold: PDFFont },
  colors: { brandRgb: any; accentRgb: any }
) {
  const { width, height } = page.getSize();
  const { font, fontBold } = fonts;
  const { brandRgb, accentRgb } = colors;
  const { branding, metadata } = context;

  const brand = brandColor(brandRgb);
  const accent = brandColor(accentRgb);

  // ── Top accent stripe ──────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: height - 8,
    width,
    height: 8,
    color: accent,
  });

  // ── Header band ────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: height - SPACING.COVER_HEADER_HEIGHT - 8,
    width,
    height: SPACING.COVER_HEADER_HEIGHT,
    color: brand,
  });

  // Company name (large, white, uppercase)
  page.drawText(branding.companyName.toUpperCase(), {
    x: PAGE.MARGIN.LEFT,
    y: height - 55,
    size: 26,
    font: fontBold,
    color: COLOR.TEXT_WHITE,
  });

  // Contact info line
  const contactLine = [branding.licenseNumber, branding.phone, branding.email]
    .filter(Boolean)
    .join("   •   ");

  if (contactLine) {
    page.drawText(contactLine, {
      x: PAGE.MARGIN.LEFT,
      y: height - 80,
      size: FONT_SIZE.LABEL,
      font,
      color: rgb(0.85, 0.88, 0.92),
    });
  }

  // Website (right-aligned)
  if (branding.website) {
    const siteWidth = font.widthOfTextAtSize(branding.website, FONT_SIZE.LABEL);
    page.drawText(branding.website, {
      x: width - PAGE.MARGIN.RIGHT - siteWidth,
      y: height - 80,
      size: FONT_SIZE.LABEL,
      font,
      color: rgb(0.85, 0.88, 0.92),
    });
  }

  // ── Report title area ──────────────────────────────────────────────
  let y = height - 160;

  page.drawText("CONTRACTOR PACKET", {
    x: PAGE.MARGIN.LEFT,
    y,
    size: FONT_SIZE.TITLE,
    font: fontBold,
    color: COLOR.TEXT_PRIMARY,
  });

  y -= 6;
  page.drawText("Property Damage Assessment & Scope of Work", {
    x: PAGE.MARGIN.LEFT,
    y,
    size: FONT_SIZE.BODY_LARGE,
    font,
    color: COLOR.TEXT_SECONDARY,
  });

  // ── Divider ─────────────────────────────────────────────────────────
  y -= 16;
  drawDivider(page, y, brand);
  y -= 20;

  // ── Metadata grid ──────────────────────────────────────────────────
  const metaRows: [string, string][] = [
    ["Property Address", metadata.propertyAddress],
    ["Client Name", metadata.clientName],
    ["Claim Number", metadata.claimNumber || "N/A"],
    ["Policy Number", metadata.policyNumber || "N/A"],
    ["Date of Loss", metadata.dateOfLoss || "N/A"],
    ["Inspection Date", metadata.inspectionDate || "N/A"],
    ["Insurance Carrier", metadata.carrierName || "N/A"],
    ["Field Adjuster", metadata.adjusterName || "N/A"],
  ];

  const labelX = PAGE.MARGIN.LEFT + 10;
  const valueX = PAGE.MARGIN.LEFT + 160;

  // Light background panel
  const panelHeight = metaRows.length * SPACING.METADATA_ROW + 16;
  page.drawRectangle({
    x: PAGE.MARGIN.LEFT,
    y: y - panelHeight + 6,
    width: PAGE.CONTENT_WIDTH,
    height: panelHeight,
    color: COLOR.BG_LIGHT,
  });

  metaRows.forEach(([label, value], i) => {
    const rowY = y - i * SPACING.METADATA_ROW - 4;

    // Alternating subtle stripe
    if (i % 2 === 1) {
      page.drawRectangle({
        x: PAGE.MARGIN.LEFT,
        y: rowY - 6,
        width: PAGE.CONTENT_WIDTH,
        height: SPACING.METADATA_ROW,
        color: COLOR.BG_STRIPE,
      });
    }

    page.drawText(label, {
      x: labelX,
      y: rowY,
      size: FONT_SIZE.BODY,
      font: fontBold,
      color: COLOR.TEXT_SECONDARY,
    });
    page.drawText(value, {
      x: valueX,
      y: rowY,
      size: FONT_SIZE.BODY,
      font,
      color: COLOR.TEXT_PRIMARY,
    });
  });

  y -= panelHeight + 24;

  // ── Divider ─────────────────────────────────────────────────────────
  drawDivider(page, y, COLOR.DIVIDER_LIGHT);
  y -= 20;

  // ── Prepared by block ──────────────────────────────────────────────
  page.drawText("Prepared by", {
    x: PAGE.MARGIN.LEFT,
    y,
    size: FONT_SIZE.SMALL,
    font,
    color: COLOR.TEXT_MUTED,
  });

  y -= 16;
  page.drawText(branding.companyName, {
    x: PAGE.MARGIN.LEFT,
    y,
    size: FONT_SIZE.SUBTITLE,
    font: fontBold,
    color: COLOR.TEXT_PRIMARY,
  });

  y -= 16;
  page.drawText(`Inspector: ${metadata.preparedBy}`, {
    x: PAGE.MARGIN.LEFT,
    y,
    size: FONT_SIZE.BODY,
    font,
    color: COLOR.TEXT_SECONDARY,
  });

  y -= 14;
  page.drawText(`Submitted: ${metadata.submittedDate}`, {
    x: PAGE.MARGIN.LEFT,
    y,
    size: FONT_SIZE.BODY,
    font,
    color: COLOR.TEXT_SECONDARY,
  });

  // ── Bottom accent bar ──────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: 6,
    color: accent,
  });

  // Disclaimer
  const disclaimer = "Submitted on behalf of homeowner / insured for insurance claim purposes.";
  const disclaimerWidth = font.widthOfTextAtSize(disclaimer, FONT_SIZE.TINY);
  page.drawText(disclaimer, {
    x: (width - disclaimerWidth) / 2,
    y: 14,
    size: FONT_SIZE.TINY,
    font,
    color: COLOR.TEXT_LIGHT,
  });
}
