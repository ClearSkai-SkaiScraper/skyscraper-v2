// ============================================================================
// COVER PAGE RENDERER
// ============================================================================

import { PDFFont, PDFPage, rgb } from "pdf-lib";

import type { ReportContext } from "../types";

export async function renderCoverPage(
  page: PDFPage,
  context: ReportContext,
  fonts: { font: PDFFont; fontBold: PDFFont },
  colors: { brandRgb: any; accentRgb: any }
) {
  const { width, height } = page.getSize();
  const { font, fontBold } = fonts;
  const { brandRgb } = colors;
  const { branding, metadata } = context;

  // Header bar
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 120,
    color: rgb(brandRgb.r, brandRgb.g, brandRgb.b),
  });

  // Company name
  page.drawText(branding.companyName.toUpperCase(), {
    x: 60,
    y: height - 60,
    size: 28,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  // License / Contact
  const contactLine = [branding.licenseNumber, branding.phone, branding.email]
    .filter(Boolean)
    .join("  |  ");

  page.drawText(contactLine, {
    x: 60,
    y: height - 90,
    size: 10,
    font,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Report title
  page.drawText("CONTRACTOR PACKET", {
    x: 60,
    y: height - 180,
    size: 24,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Metadata grid
  let yPos = height - 240;
  const metaData = [
    ["Property Address:", metadata.propertyAddress],
    ["Client Name:", metadata.clientName],
    ["Claim Number:", metadata.claimNumber || "N/A"],
    ["Policy Number:", metadata.policyNumber || "N/A"],
    ["Date of Loss:", metadata.dateOfLoss || "N/A"],
    ["Inspection Date:", metadata.inspectionDate || "N/A"],
    ["Adjuster:", metadata.adjusterName || "N/A"],
    ["Carrier:", metadata.carrierName || "N/A"],
  ];

  metaData.forEach(([label, value]) => {
    page.drawText(label, {
      x: 60,
      y: yPos,
      size: 11,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(value, {
      x: 220,
      y: yPos,
      size: 11,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    yPos -= 24;
  });

  // Footer
  page.drawText(`Prepared by: ${metadata.preparedBy}`, {
    x: 60,
    y: 80,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText(`Submitted on behalf of homeowner / insured`, {
    x: 60,
    y: 60,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText(`Date: ${metadata.submittedDate}`, {
    x: 60,
    y: 40,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
}
