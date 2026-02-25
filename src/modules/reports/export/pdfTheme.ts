// ============================================================================
// PDF THEME — Centralized design tokens for professional report output
// ============================================================================

import { rgb, type Color } from "pdf-lib";

/** Page layout constants */
export const PAGE = {
  WIDTH: 612,
  HEIGHT: 792,
  MARGIN: {
    LEFT: 50,
    RIGHT: 50,
    TOP: 60,
    BOTTOM: 50,
  },
  get CONTENT_WIDTH() {
    return this.WIDTH - this.MARGIN.LEFT - this.MARGIN.RIGHT;
  },
} as const;

/** Font sizes */
export const FONT_SIZE = {
  TITLE: 24,
  SECTION_TITLE: 18,
  SUBTITLE: 14,
  BODY: 11,
  BODY_LARGE: 12,
  SMALL: 9,
  TINY: 8,
  LABEL: 10,
  TABLE_HEADER: 10,
  TABLE_CELL: 9,
  PAGE_NUMBER: 9,
  HEADER_BAR: 16,
} as const;

/** Spacing / line height multipliers */
export const SPACING = {
  LINE_HEIGHT: 1.5,
  PARAGRAPH_GAP: 12,
  SECTION_GAP: 24,
  HEADER_BAR_HEIGHT: 50,
  FOOTER_BAR_HEIGHT: 28,
  COVER_HEADER_HEIGHT: 100,
  TABLE_ROW_HEIGHT: 18,
  PHOTO_GAP: 12,
  DIVIDER_PADDING: 8,
  METADATA_ROW: 22,
} as const;

/** Named colors */
export const COLOR = {
  // Text hierarchy
  TEXT_PRIMARY: rgb(0.12, 0.12, 0.12), // near-black
  TEXT_SECONDARY: rgb(0.35, 0.35, 0.35), // dark gray
  TEXT_MUTED: rgb(0.5, 0.5, 0.5), // medium gray
  TEXT_LIGHT: rgb(0.65, 0.65, 0.65), // light gray
  TEXT_WHITE: rgb(1, 1, 1),

  // Surfaces
  BG_WHITE: rgb(1, 1, 1),
  BG_LIGHT: rgb(0.97, 0.97, 0.97), // very light gray panel
  BG_STRIPE: rgb(0.95, 0.96, 0.97), // alternating table row

  // Rules
  DIVIDER: rgb(0.85, 0.85, 0.85),
  DIVIDER_LIGHT: rgb(0.92, 0.92, 0.92),

  // Status
  SUCCESS: rgb(0.13, 0.55, 0.13),
  WARNING: rgb(0.8, 0.55, 0.0),
  DANGER: rgb(0.75, 0.15, 0.15),
} as const;

/** Photo grid layout */
export const PHOTO_GRID = {
  COLS: 2,
  MAX_WIDTH: 240,
  MAX_HEIGHT: 170,
  GAP: 16,
  CAPTION_HEIGHT: 14,
} as const;

/**
 * Generate brand-tinted colors from RGB branding values
 */
export function brandColor(brandRgb: { r: number; g: number; b: number }): Color {
  return rgb(brandRgb.r, brandRgb.g, brandRgb.b);
}

/**
 * Word-wrap text based on actual font width measurement (not character count)
 */
export function wordWrap(
  text: string,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Draw a thin horizontal rule (divider line)
 */
export function drawDivider(
  page: any,
  y: number,
  color: Color = COLOR.DIVIDER,
  xStart = PAGE.MARGIN.LEFT,
  xEnd = PAGE.WIDTH - PAGE.MARGIN.RIGHT
) {
  page.drawLine({
    start: { x: xStart, y },
    end: { x: xEnd, y },
    thickness: 0.5,
    color,
  });
}

/**
 * Draw a rounded rectangle panel background
 */
export function drawPanel(
  page: any,
  x: number,
  y: number,
  width: number,
  height: number,
  color: Color = COLOR.BG_LIGHT
) {
  page.drawRectangle({ x, y, width, height, color });
}
