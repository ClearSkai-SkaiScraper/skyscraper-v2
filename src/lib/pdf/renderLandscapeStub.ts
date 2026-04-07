import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import type { BuildResult } from "./ExportOrchestrator";

export async function renderLandscapePDFStub(build: BuildResult) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([792, 612]); // 11x8.5 landscape points
  const _font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: rgb(0.04, 0.1, 0.18) });
  // page.drawText("SkaiScraper Demo Company", { x: 32, y: height-40, size: 16, color: rgb(1,1,1), font });
  page.drawText("Landscape Export (stub) — sections: " + build.sections.join(", "), {
    x: 32,
    y: height - 90,
    size: 12,
  });
  return await pdf.save();
}
