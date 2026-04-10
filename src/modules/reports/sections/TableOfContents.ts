// ============================================================================
// TABLE OF CONTENTS RENDERER
// ============================================================================

import { PDFFont, PDFPage, rgb } from "pdf-lib";

import type { ReportContext, Section } from "../types";

export async function renderTOC(
  page: PDFPage,
  context: ReportContext,
  sections: Section[],
  fonts: { font: PDFFont; fontBold: PDFFont },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colors: { brandRgb: any; accentRgb: any }
) {
  const { width, height } = page.getSize();
  const { font, fontBold } = fonts;
  const { brandRgb } = colors;

  // Title
  page.drawText("TABLE OF CONTENTS", {
    x: 60,
    y: height - 80,
    size: 22,
    font: fontBold,
    color: rgb(brandRgb.r, brandRgb.g, brandRgb.b),
  });

  // TOC entries
  let yPos = height - 140;
  sections.forEach((section, index) => {
    const pageNum = index + 1; // Simplified for now

    // Section title
    page.drawText(`${index + 1}.  ${section.title}`, {
      x: 80,
      y: yPos,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Page number
    page.drawText(`${pageNum}`, {
      x: width - 100,
      y: yPos,
      size: 12,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Dotted line
    page.drawLine({
      start: { x: 80 + section.title.length * 6 + 20, y: yPos + 3 },
      end: { x: width - 120, y: yPos + 3 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
      dashArray: [2, 2],
    });

    yPos -= 28;
  });
}
