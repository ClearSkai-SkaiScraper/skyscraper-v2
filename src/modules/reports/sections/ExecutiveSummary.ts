// ============================================================================
// EXECUTIVE SUMMARY RENDERER — Professional executive overview
// ============================================================================

import { PDFFont, PDFPage } from "pdf-lib";

import {
  brandColor,
  COLOR,
  drawDivider,
  drawPanel,
  FONT_SIZE,
  PAGE,
  SPACING,
  wordWrap,
} from "../export/pdfTheme";
import type { ReportContext } from "../types";

export async function renderExecutiveSummary(
  page: PDFPage,
  context: ReportContext,
  fonts: { font: PDFFont; fontBold: PDFFont },
  colors: { brandRgb: any; accentRgb: any }
) {
  const { width, height } = page.getSize();
  const { font, fontBold } = fonts;
  const { brandRgb, accentRgb } = colors;
  const { metadata } = context;

  const brand = brandColor(brandRgb);
  const accent = brandColor(accentRgb);

  // ── Section header bar ─────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: height - SPACING.HEADER_BAR_HEIGHT,
    width,
    height: SPACING.HEADER_BAR_HEIGHT,
    color: brand,
  });

  page.drawText("EXECUTIVE SUMMARY", {
    x: PAGE.MARGIN.LEFT,
    y: height - 34,
    size: FONT_SIZE.HEADER_BAR,
    font: fontBold,
    color: COLOR.TEXT_WHITE,
  });

  // ── Summary paragraph ──────────────────────────────────────────────
  const summary =
    context.executiveSummary ||
    `This report documents storm damage to the property located at ${metadata.propertyAddress}. ` +
      `A qualifying weather event occurred on ${metadata.dateOfLoss || "the reported date"}, ` +
      `resulting in damage requiring professional restoration. ` +
      `All proposed work will be performed in full compliance with IRC/IBC building codes, ` +
      `local jurisdiction requirements, and manufacturer installation specifications.`;

  let y = height - SPACING.HEADER_BAR_HEIGHT - 30;
  const maxWidth = PAGE.CONTENT_WIDTH;

  const lines = wordWrap(summary, font, FONT_SIZE.BODY_LARGE, maxWidth);
  for (const line of lines) {
    page.drawText(line, {
      x: PAGE.MARGIN.LEFT,
      y,
      size: FONT_SIZE.BODY_LARGE,
      font,
      color: COLOR.TEXT_PRIMARY,
    });
    y -= 18;
  }

  // ── Divider ────────────────────────────────────────────────────────
  y -= SPACING.DIVIDER_PADDING;
  drawDivider(page, y);
  y -= SPACING.SECTION_GAP;

  // ── Key Decision Points (paneled) ──────────────────────────────────
  page.drawText("KEY DECISION POINTS", {
    x: PAGE.MARGIN.LEFT,
    y,
    size: FONT_SIZE.SUBTITLE,
    font: fontBold,
    color: COLOR.TEXT_PRIMARY,
  });

  y -= 20;

  const bullets = [
    "Qualifying weather event confirmed via NOAA / Stormersite verification data",
    "On-site damage assessment performed by licensed, insured contractor",
    "All proposed work meets or exceeds applicable building codes (IRC / IBC)",
    "Manufacturer warranty compliance and installation specs ensured",
    "Full photographic documentation and scope of work attached",
  ];

  // Panel background
  const panelHeight = bullets.length * 22 + 16;
  drawPanel(page, PAGE.MARGIN.LEFT, y - panelHeight + 10, PAGE.CONTENT_WIDTH, panelHeight);

  bullets.forEach((bullet) => {
    page.drawText("\u25B8", {
      x: PAGE.MARGIN.LEFT + 12,
      y,
      size: FONT_SIZE.BODY,
      font: fontBold,
      color: accent,
    });

    page.drawText(bullet, {
      x: PAGE.MARGIN.LEFT + 28,
      y,
      size: FONT_SIZE.BODY,
      font,
      color: COLOR.TEXT_PRIMARY,
    });
    y -= 22;
  });

  // ── Quick Stats Row ────────────────────────────────────────────────
  y -= SPACING.SECTION_GAP;
  drawDivider(page, y);
  y -= 20;

  page.drawText("CLAIM SNAPSHOT", {
    x: PAGE.MARGIN.LEFT,
    y,
    size: FONT_SIZE.SUBTITLE,
    font: fontBold,
    color: COLOR.TEXT_PRIMARY,
  });
  y -= 22;

  const stats: [string, string][] = [
    ["Property", metadata.propertyAddress?.split(",")[0] || "\u2014"],
    ["Carrier", metadata.carrierName || "\u2014"],
    ["Claim #", metadata.claimNumber || "\u2014"],
    ["Date of Loss", metadata.dateOfLoss || "\u2014"],
  ];

  // Draw stats in a 2x2 grid
  const colWidth = PAGE.CONTENT_WIDTH / 2;
  stats.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = PAGE.MARGIN.LEFT + col * colWidth;
    const sy = y - row * 36;

    page.drawText(label.toUpperCase(), {
      x: sx,
      y: sy,
      size: FONT_SIZE.TINY,
      font: fontBold,
      color: COLOR.TEXT_MUTED,
    });
    page.drawText(value, {
      x: sx,
      y: sy - 13,
      size: FONT_SIZE.BODY,
      font: fontBold,
      color: COLOR.TEXT_PRIMARY,
    });
  });
}
