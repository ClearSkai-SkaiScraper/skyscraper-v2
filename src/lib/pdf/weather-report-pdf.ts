/**
 * Premium Weather Report PDF Renderer — v2
 *
 * Renders from WeatherPdfViewModel ONLY. All business logic is in the view model.
 * This file does ONE thing: turn a ViewModel into a polished PDF.
 *
 * Layout:
 * 1. Branded Header (company logo, name, contact)
 * 2. Claim Snapshot Grid
 * 3. Executive Summary
 * 4. CLAIM WINDOW CONDITIONS (Day Before / DOL / Day After) — clearly labeled
 * 5. STORM EVENT EVIDENCE (significant events, separated from timeline)
 * 6. Event Anchor Note (if anchor differs from DOL)
 * 7. Evidence Summary Cards
 * 8. Radar Imagery (REAL embedded images, not text placeholders)
 * 9. Carrier Talking Points
 * 10. Sources + Footer
 *
 * @module lib/pdf/weather-report-pdf
 */

import { jsPDF } from "jspdf";

import { BRAND_PRIMARY, BRAND_PRIMARY_RGB } from "@/lib/constants/branding";
import { logger } from "@/lib/logger";
import { type CoverPageData, drawCoverPage, fetchPropertyMapBase64 } from "@/lib/pdf/coverPage";
import type { WeatherPdfViewModel } from "@/lib/weather/weatherPdfViewModel";

// Re-export for route compat
export { buildWeatherPdfViewModel } from "@/lib/weather/weatherPdfViewModel";
export type { WeatherPdfViewModel };

// ─────────────────────────────────────────────────────────────────────────────
// Color Palette
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  primary: { r: BRAND_PRIMARY_RGB[0], g: BRAND_PRIMARY_RGB[1], b: BRAND_PRIMARY_RGB[2] },
  secondary: { r: 59, g: 130, b: 246 },
  danger: { r: 220, g: 38, b: 38 },
  success: { r: 5, g: 150, b: 105 },
  warning: { r: 245, g: 158, b: 11 },
  dark: { r: 15, g: 23, b: 42 },
  text: { r: 30, g: 41, b: 59 },
  muted: { r: 100, g: 116, b: 139 },
  light: { r: 248, g: 250, b: 252 },
  lightBlue: { r: 239, g: 246, b: 255 },
  border: { r: 226, g: 232, b: 240 },
  white: { r: 255, g: 255, b: 255 },
};

interface RGB {
  r: number;
  g: number;
  b: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Renderer
// ─────────────────────────────────────────────────────────────────────────────

export async function renderWeatherReportPDF(viewModel: WeatherPdfViewModel): Promise<Buffer> {
  logger.info("[WEATHER_PDF] Rendering v2 PDF", {
    reportId: viewModel.reportId,
    anchorDate: viewModel.anchorDate,
    hasStormEvidence: viewModel.hasStormEvidence,
    hasRadarImages: viewModel.hasRadarImagery,
    stormConfidence: viewModel.evidence?.stormConfidence,
  });

  // Defensive: ensure all required nested objects exist
  if (!viewModel.branding) viewModel.branding = {} as WeatherPdfViewModel["branding"];
  if (!viewModel.claim) viewModel.claim = {} as WeatherPdfViewModel["claim"];
  if (!viewModel.location) viewModel.location = {} as WeatherPdfViewModel["location"];
  if (!viewModel.peril)
    viewModel.peril = {
      type: "Unknown",
      confidence: "unknown",
      displayText: "Unknown",
      evidenceSummary: "",
    };
  if (!viewModel.evidence)
    viewModel.evidence = {
      hasHail: false,
      hasWind: false,
      hasRain: false,
      hasRadar: false,
      stormConfidence: "none",
    };
  if (!viewModel.weatherWindow) viewModel.weatherWindow = [];
  if (!viewModel.stormEvidence) viewModel.stormEvidence = [];
  if (!viewModel.radarFrames) viewModel.radarFrames = [];
  if (!viewModel.dataSources) viewModel.dataSources = [];

  const doc = new jsPDF({ format: "letter" });
  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  const brandColor = hexToRgb(viewModel.branding.primaryColor || BRAND_PRIMARY) || COLORS.primary;

  let yPos = margin;

  // Each section wrapped in try/catch so a single section failure doesn't kill the entire PDF
  const safeRender = (name: string, fn: () => number): number => {
    try {
      return fn();
    } catch (err) {
      logger.error(`[WEATHER_PDF] Section "${name}" failed:`, err);
      return yPos; // skip section, continue
    }
  };

  // 0. COVER PAGE (full first page)
  try {
    // Use existing propertyMapBase64 from view model, or fetch if we have address
    let propertyMapBase64 = viewModel.propertyMapBase64;
    if (!propertyMapBase64 && viewModel.claim.propertyAddress) {
      propertyMapBase64 = await fetchPropertyMapBase64(viewModel.claim.propertyAddress);
    }

    const coverData: CoverPageData = {
      reportTitle: "Weather & Loss Justification Report",
      reportSubtitle: "Certified Storm Damage Assessment",
      reportCategory: "insurance",
      companyName: viewModel.branding.companyName,
      companyLicense: viewModel.branding.license || undefined,
      companyPhone: viewModel.branding.phone || undefined,
      companyEmail: viewModel.branding.email || undefined,
      companyWebsite: viewModel.branding.website || undefined,
      logoUrl: viewModel.branding.logoUrl || undefined,
      headshotUrl: viewModel.branding.headshotUrl,
      employeeName: viewModel.branding.employeeName,
      employeeTitle: viewModel.branding.employeeTitle,
      employeePhone: viewModel.branding.employeePhone || viewModel.branding.phone || undefined,
      brandColor: viewModel.branding.primaryColor || BRAND_PRIMARY,
      accentColor: viewModel.branding.accentColor || "#FFC838",
      propertyAddress: viewModel.claim.propertyAddress,
      propertyMapBase64,
      insuredName: viewModel.claim.insuredName,
      carrierName: viewModel.claim.carrier,
      claimNumber: viewModel.claim.claimNumber,
      policyNumber: viewModel.claim.policyNumber,
      dateOfLoss: viewModel.claim.dateOfLoss,
    };

    await drawCoverPage(doc, coverData);
    doc.addPage();
    yPos = margin;
    logger.info("[WEATHER_PDF] Cover page rendered successfully");
  } catch (coverErr) {
    logger.error("[WEATHER_PDF] Cover page failed (continuing without):", coverErr);
    // Continue without cover page — the report content still renders fine
  }

  // 1. BRANDED HEADER
  yPos = safeRender("header", () =>
    renderBrandedHeader(doc, viewModel, margin, contentWidth, pageWidth, brandColor, yPos)
  );

  // 2. CLAIM SNAPSHOT
  yPos = safeRender("claimSnapshot", () =>
    renderClaimSnapshot(doc, viewModel, margin, contentWidth, brandColor, yPos)
  );

  // 2.5. PROPERTY LOCATION MAP (if available)
  if (viewModel.propertyMapBase64) {
    yPos = checkPageBreak(doc, yPos, 70, pageHeight, margin);
    yPos = safeRender("propertyMap", () => {
      yPos += 4;
      // Section heading
      doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
      doc.rect(margin, yPos, 3, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
      doc.text("PROPERTY LOCATION", margin + 6, yPos + 5.5);
      yPos += 12;

      // Embed map image
      try {
        const imgWidth = contentWidth * 0.7;
        const imgHeight = imgWidth * (400 / 600); // Maintain 600x400 aspect ratio
        const imgX = margin + (contentWidth - imgWidth) / 2; // Center

        doc.addImage(viewModel.propertyMapBase64!, "PNG", imgX, yPos, imgWidth, imgHeight);

        // Map border
        doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
        doc.setLineWidth(0.3);
        doc.rect(imgX, yPos, imgWidth, imgHeight, "S");

        yPos += imgHeight + 2;

        // Caption
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
        doc.text(`📍 ${viewModel.claim.propertyAddress}`, margin + contentWidth / 2, yPos, {
          align: "center",
        });
        yPos += 8;
      } catch (imgErr) {
        logger.warn("[WEATHER_PDF] Property map image embed failed:", imgErr);
        yPos += 4;
      }

      return yPos;
    });
  }

  // 3. EXECUTIVE SUMMARY
  yPos = checkPageBreak(doc, yPos, 40, pageHeight, margin);
  yPos = safeRender("executiveSummary", () =>
    renderExecutiveSummary(doc, viewModel, margin, contentWidth, brandColor, yPos)
  );

  // 4. CLAIM WINDOW CONDITIONS (day before / DOL / day after)
  if (viewModel.weatherWindow.length > 0) {
    yPos = checkPageBreak(doc, yPos, 50, pageHeight, margin);
    yPos = safeRender("claimWindow", () =>
      renderClaimWindowConditions(doc, viewModel, margin, contentWidth, brandColor, yPos)
    );
  }

  // 5. STORM EVENT EVIDENCE (separate section!)
  if (viewModel.stormEvidence.length > 0) {
    yPos = checkPageBreak(doc, yPos, 40, pageHeight, margin);
    yPos = safeRender("stormEvidence", () =>
      renderStormEventEvidence(doc, viewModel, margin, contentWidth, brandColor, yPos, pageHeight)
    );
  } else if (!viewModel.hasStormEvidence) {
    // No storm: clean message
    yPos = checkPageBreak(doc, yPos, 25, pageHeight, margin);
    yPos = safeRender("noStorm", () =>
      renderNoStormMessage(doc, viewModel, margin, contentWidth, brandColor, yPos)
    );
  }

  // 6. EVENT ANCHOR NOTE (if evidence is on a different date than DOL)
  if (viewModel.eventAnchorNote) {
    yPos = checkPageBreak(doc, yPos, 20, pageHeight, margin);
    yPos = safeRender("anchorNote", () =>
      renderEventAnchorNote(doc, viewModel, margin, contentWidth, yPos)
    );
  }

  // 7. EVIDENCE SUMMARY CARDS
  if (viewModel.hasStormEvidence) {
    yPos = checkPageBreak(doc, yPos, 35, pageHeight, margin);
    yPos = safeRender("evidenceSummary", () =>
      renderEvidenceSummary(doc, viewModel, margin, contentWidth, brandColor, yPos)
    );
  }

  // 8. RADAR IMAGERY (real images OR clean omission)
  if (viewModel.hasRadarImagery) {
    yPos = checkPageBreak(doc, yPos, 60, pageHeight, margin);
    yPos = safeRender("radarImagery", () =>
      renderRadarImagery(doc, viewModel, margin, contentWidth, brandColor, yPos, pageHeight)
    );
  }
  // If no radar images: don't render the section at all. No empty placeholders.

  // 9. CARRIER TALKING POINTS
  if (viewModel.carrierTalkingPoints) {
    // Carrier talking points now handle their own page-break logic internally
    yPos = checkPageBreak(doc, yPos, 30, pageHeight, margin);
    yPos = safeRender("talkingPoints", () =>
      renderCarrierTalkingPoints(doc, viewModel, margin, contentWidth, yPos)
    );
  }

  // 10. SOURCES + FOOTER
  safeRender("footer", () => {
    renderFooter(doc, viewModel, margin, contentWidth, pageWidth, pageHeight, brandColor);
    return yPos;
  });

  const arrayBuffer = doc.output("arraybuffer");
  logger.info("[WEATHER_PDF] PDF generated", {
    bytes: arrayBuffer.byteLength,
    pages: doc.getNumberOfPages(),
  });
  return Buffer.from(arrayBuffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Renderers
// ─────────────────────────────────────────────────────────────────────────────

function renderBrandedHeader(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  pageWidth: number,
  brandColor: RGB,
  yPos: number
): number {
  // Top brand bar
  doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
  doc.rect(0, 0, pageWidth, 4, "F");

  yPos = 12;

  // Company name
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(brandColor.r, brandColor.g, brandColor.b);
  doc.text(vm.branding.companyName, margin, yPos);

  // Badge
  doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
  doc.roundedRect(pageWidth - margin - 50, yPos - 6, 50, 10, 2, 2, "F");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("WEATHER REPORT", pageWidth - margin - 48, yPos - 1);

  yPos += 5;

  // Contact line
  const contactParts = [vm.branding.phone, vm.branding.email, vm.branding.website].filter(Boolean);
  if (contactParts.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text(contactParts.join("  |  "), margin, yPos);
    yPos += 4;
  }

  // Address
  if (vm.branding.address) {
    doc.setFontSize(7);
    doc.text(vm.branding.address, margin, yPos);
    yPos += 3;
  }

  // License
  if (vm.branding.license) {
    doc.setFontSize(7);
    doc.text(`License: ${vm.branding.license}`, margin, yPos);
    yPos += 3;
  }

  // Divider
  yPos += 2;
  doc.setDrawColor(brandColor.r, brandColor.g, brandColor.b);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  return yPos + 8;
}

function renderClaimSnapshot(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  brandColor: RGB,
  yPos: number
): number {
  yPos = renderSectionHeader(doc, "CLAIM SNAPSHOT", margin, contentWidth, brandColor, yPos);

  const gridHeight = 38;
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(margin, yPos, contentWidth, gridHeight, 3, 3, "F");
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, contentWidth, gridHeight, 3, 3, "S");

  // Brand accent
  doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
  doc.rect(margin, yPos, 3, gridHeight, "F");

  const col1 = margin + 8;
  const col2 = margin + contentWidth * 0.35;
  const col3 = margin + contentWidth * 0.67;

  // Row 1
  const row1Y = yPos + 7;
  renderInfoField(doc, "INSURED / CLIENT", vm.claim.insuredName, col1, row1Y);
  renderInfoField(doc, "CLAIM NUMBER", vm.claim.claimNumber, col2, row1Y);
  renderInfoField(doc, "CARRIER", vm.claim.carrier, col3, row1Y);

  // Row 2
  const row2Y = yPos + 18;
  renderInfoField(doc, "POLICY NUMBER", vm.claim.policyNumber, col1, row2Y);
  renderInfoField(doc, "DATE OF LOSS", vm.claim.dateOfLoss, col2, row2Y);
  renderInfoField(doc, "ADJUSTER", vm.claim.adjusterName, col3, row2Y);

  // Row 3
  const row3Y = yPos + 29;
  renderInfoField(
    doc,
    "PROPERTY ADDRESS",
    vm.claim.propertyAddress,
    col1,
    row3Y,
    contentWidth * 0.6
  );

  // Peril badge
  const perilBadgeX = col3;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text("PRIMARY PERIL", perilBadgeX, row3Y);

  const perilColor = getPerilColor(vm.peril.type);
  doc.setFillColor(perilColor.r, perilColor.g, perilColor.b);
  doc.roundedRect(perilBadgeX, row3Y + 1, 40, 7, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(vm.peril.displayText.toUpperCase(), perilBadgeX + 20, row3Y + 6, { align: "center" });

  return yPos + gridHeight + 10;
}

function renderExecutiveSummary(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  brandColor: RGB,
  yPos: number
): number {
  yPos = renderSectionHeader(doc, "EXECUTIVE SUMMARY", margin, contentWidth, brandColor, yPos);

  const summary = sanitizeText(vm.executiveSummary);
  const lines = doc.splitTextToSize(summary, contentWidth - 16) as string[];
  const boxHeight = Math.max(20, lines.length * 4.5 + 12);

  doc.setFillColor(COLORS.lightBlue.r, COLORS.lightBlue.g, COLORS.lightBlue.b);
  doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, "F");
  doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
  doc.rect(margin, yPos, 3, boxHeight, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);

  let textY = yPos + 8;
  for (const line of lines) {
    doc.text(line, margin + 10, textY);
    textY += 4.5;
  }

  return yPos + boxHeight + 8;
}

function renderClaimWindowConditions(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  brandColor: RGB,
  yPos: number
): number {
  // Clearly labeled as CLAIM WINDOW, not generic "weather timeline"
  yPos = renderSectionHeader(
    doc,
    "CLAIM WINDOW CONDITIONS — Day Before / Date of Loss / Day After",
    margin,
    contentWidth,
    brandColor,
    yPos
  );

  // Table header
  const colWidths = [45, 30, 25, 22, 30, contentWidth - 152];
  const headers = ["Date", "Temp (H/L)", "Precip", "Prob", "Wind", "Conditions"];

  doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
  doc.rect(margin, yPos, contentWidth, 8, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);

  let xOffset = margin + 3;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], xOffset, yPos + 5.5);
    xOffset += colWidths[i];
  }
  yPos += 8;

  // Table rows — exactly 3 rows for claim window
  for (const day of vm.weatherWindow) {
    const rowHeight = 8;

    if (day.isAnchorDay) {
      doc.setFillColor(254, 243, 199); // Amber highlight for DOL
    } else {
      doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    }
    doc.rect(margin, yPos, contentWidth, rowHeight, "F");

    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.2);
    doc.line(margin, yPos + rowHeight, margin + contentWidth, yPos + rowHeight);

    doc.setFontSize(8);
    doc.setFont("helvetica", day.isAnchorDay ? "bold" : "normal");
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);

    xOffset = margin + 3;

    // Date + Label
    doc.text(`${formatShortDate(day.date)} (${day.label})`, xOffset, yPos + 5.5);
    xOffset += colWidths[0];

    // Temp
    const tempStr =
      day.tempHigh != null
        ? `${day.tempHigh.toFixed(0)}F / ${(day.tempLow ?? 0).toFixed(0)}F`
        : "--";
    doc.text(tempStr, xOffset, yPos + 5.5);
    xOffset += colWidths[1];

    // Precip
    const precipStr = `${(day.precip ?? 0).toFixed(2)}"`;
    if ((day.precip || 0) > 0.1) {
      doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    }
    doc.text(precipStr, xOffset, yPos + 5.5);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    xOffset += colWidths[2];

    // Prob
    doc.text(`${(day.precipProb ?? 0).toFixed(0)}%`, xOffset, yPos + 5.5);
    xOffset += colWidths[3];

    // Wind
    const windStr = day.windGust
      ? `${(day.windSpeed ?? 0).toFixed(0)} (${day.windGust.toFixed(0)}) mph`
      : `${(day.windSpeed ?? 0).toFixed(0)} mph`;
    if ((day.windGust || 0) > 40) {
      doc.setTextColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
    }
    doc.text(windStr, xOffset, yPos + 5.5);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    xOffset += colWidths[4];

    // Conditions
    doc.text(sanitizeText(day.conditions || "--").substring(0, 30), xOffset, yPos + 5.5);
    yPos += rowHeight;
  }

  return yPos + 8;
}

function renderStormEventEvidence(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  brandColor: RGB,
  yPos: number,
  pageHeight: number
): number {
  // Clearly labeled as STORM EVENT EVIDENCE — separate from claim window
  yPos = renderSectionHeader(doc, "STORM EVENT EVIDENCE", margin, contentWidth, brandColor, yPos);

  // Separate in-window vs nearby events
  const inWindow = vm.stormEvidence.filter((e) => e.isInClaimWindow);
  const nearby = vm.stormEvidence.filter((e) => e.isNearbyEvent);

  // In-window events first
  if (inWindow.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor.r, brandColor.g, brandColor.b);
    doc.text("Events Within Claim Window", margin, yPos);
    yPos += 5;

    for (const event of inWindow.slice(0, 4)) {
      yPos = checkPageBreak(doc, yPos, 18, pageHeight, margin);
      yPos = renderEventCard(doc, event, margin, contentWidth, yPos);
    }
  }

  // Nearby events
  if (nearby.length > 0) {
    yPos += 2;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
    doc.text("Relevant Nearby Events (Within Search Window)", margin, yPos);
    yPos += 5;

    for (const event of nearby.slice(0, 3)) {
      yPos = checkPageBreak(doc, yPos, 18, pageHeight, margin);
      yPos = renderEventCard(doc, event, margin, contentWidth, yPos);
    }
  }

  return yPos + 4;
}

function renderEventCard(
  doc: jsPDF,
  event: {
    date: string;
    time?: string;
    type: string;
    severity?: string;
    intensity?: string;
    hailSize?: string;
    windSpeed?: string;
    notes?: string;
    distanceMiles?: number;
    source: string;
  },
  margin: number,
  contentWidth: number,
  yPos: number
): number {
  const cardHeight = 15;
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(margin, yPos, contentWidth, cardHeight, 2, 2, "F");

  const eventColor = getEventColor(event.type);
  doc.setFillColor(eventColor.r, eventColor.g, eventColor.b);
  doc.rect(margin, yPos, 3, cardHeight, "F");

  // Date/time
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
  const eventDateTime = event.time ? `${event.date} at ${event.time}` : event.date;
  doc.text(eventDateTime || "Unknown Date", margin + 8, yPos + 6);

  // Type badge
  doc.setFillColor(eventColor.r, eventColor.g, eventColor.b);
  doc.roundedRect(margin + 70, yPos + 2, 25, 6, 1, 1, "F");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text((event.type || "Event").toUpperCase(), margin + 82.5, yPos + 6, { align: "center" });

  // Details
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);

  const detailParts: string[] = [];
  if (event.severity || event.intensity)
    detailParts.push(`Severity: ${event.severity || event.intensity}`);
  if (event.hailSize) detailParts.push(`Hail: ${event.hailSize}`);
  if (event.windSpeed) detailParts.push(`Wind: ${event.windSpeed}`);
  if (event.distanceMiles != null) detailParts.push(`${event.distanceMiles.toFixed(1)} mi away`);
  if (event.notes) detailParts.push(sanitizeText(event.notes).substring(0, 40));

  if (detailParts.length > 0) {
    doc.text(detailParts.join("  |  "), margin + 8, yPos + 12);
  }

  return yPos + cardHeight + 4;
}

function renderNoStormMessage(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  brandColor: RGB,
  yPos: number
): number {
  yPos = renderSectionHeader(doc, "STORM EVENT EVIDENCE", margin, contentWidth, brandColor, yPos);

  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, "F");
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, "S");

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text(
    "No significant storm events identified in the selected reporting window.",
    margin + 8,
    yPos + 8
  );
  doc.setFontSize(8);
  doc.text(
    "Weather data sourced from station observations. No hail, damaging wind, or severe weather alerts were detected.",
    margin + 8,
    yPos + 14
  );

  return yPos + 24;
}

function renderEventAnchorNote(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  yPos: number
): number {
  if (!vm.eventAnchorNote) return yPos;

  const noteText = sanitizeText(vm.eventAnchorNote);
  const lines = doc.splitTextToSize(noteText, contentWidth - 16) as string[];
  const boxHeight = Math.max(14, lines.length * 4 + 10);

  doc.setFillColor(254, 243, 199); // Amber 100
  doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, "F");
  doc.setFillColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
  doc.rect(margin, yPos, 3, boxHeight, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 53, 15);
  doc.text("NOTE: EVENT ANCHOR DIFFERS FROM DATE OF LOSS", margin + 8, yPos + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
  let textY = yPos + 10;
  for (const line of lines) {
    doc.text(line, margin + 8, textY);
    textY += 4;
  }

  return yPos + boxHeight + 6;
}

function renderEvidenceSummary(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  brandColor: RGB,
  yPos: number
): number {
  yPos = renderSectionHeader(doc, "EVIDENCE SUMMARY", margin, contentWidth, brandColor, yPos);

  const cardWidth = (contentWidth - 12) / 4;
  const cardHeight = 18;
  const cards = [
    {
      label: "HAIL",
      value: vm.evidence.hasHail ? vm.evidence.hailSizeMax || "Detected" : "None",
      active: vm.evidence.hasHail,
    },
    {
      label: "WIND",
      value: vm.evidence.maxWindGust ? `${vm.evidence.maxWindGust.toFixed(0)} mph` : "None",
      active: vm.evidence.hasWind,
    },
    {
      label: "RAIN",
      value: vm.evidence.maxPrecip ? `${vm.evidence.maxPrecip.toFixed(2)}"` : "None",
      active: vm.evidence.hasRain,
    },
    {
      label: "RADAR",
      value: vm.evidence.hasRadar ? `${vm.radarFrames.length} images` : "N/A",
      active: vm.evidence.hasRadar,
    },
  ];

  let cardX = margin;
  for (const card of cards) {
    doc.setFillColor(
      card.active ? COLORS.lightBlue.r : COLORS.light.r,
      card.active ? COLORS.lightBlue.g : COLORS.light.g,
      card.active ? COLORS.lightBlue.b : COLORS.light.b
    );
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, "F");

    doc.setDrawColor(
      card.active ? brandColor.r : COLORS.border.r,
      card.active ? brandColor.g : COLORS.border.g,
      card.active ? brandColor.b : COLORS.border.b
    );
    doc.setLineWidth(0.5);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, "S");

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text(card.label, cardX + cardWidth / 2, yPos + 5, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(
      card.active ? brandColor.r : COLORS.muted.r,
      card.active ? brandColor.g : COLORS.muted.g,
      card.active ? brandColor.b : COLORS.muted.b
    );
    doc.text(card.value, cardX + cardWidth / 2, yPos + 13, { align: "center" });

    cardX += cardWidth + 4;
  }

  // Confidence badge
  yPos += cardHeight + 4;
  const confColor = getConfidenceColor(vm.evidence.stormConfidence);
  doc.setFillColor(confColor.r, confColor.g, confColor.b);
  doc.roundedRect(margin, yPos, 80, 7, 2, 2, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Storm Confidence: ${vm.evidence.stormConfidence.toUpperCase()}`,
    margin + 40,
    yPos + 5,
    { align: "center" }
  );

  return yPos + 14;
}

function renderRadarImagery(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  brandColor: RGB,
  yPos: number,
  pageHeight: number
): number {
  yPos = renderSectionHeader(doc, "RADAR IMAGERY", margin, contentWidth, brandColor, yPos);

  // Station info bar
  doc.setFillColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.roundedRect(margin, yPos, contentWidth, 14, 3, 3, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.text("NEXRAD Radar Data", margin + 8, yPos + 6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  const radarInfo = [
    `Station: ${vm.location.radarStationId}`,
    `Images: ${vm.radarFrames.length}`,
    `Location: ${vm.location.lat.toFixed(4)}, ${vm.location.lng.toFixed(4)}`,
  ];
  doc.text(radarInfo.join("  |  "), margin + 8, yPos + 11);
  yPos += 18;

  // Render actual radar images
  const imageWidth = (contentWidth - 8) / Math.min(vm.radarFrames.length, 3);
  const imageHeight = imageWidth * 0.75; // 4:3 aspect ratio

  yPos = checkPageBreak(doc, yPos, imageHeight + 12, pageHeight, margin);

  let imgX = margin;
  for (const frame of vm.radarFrames.slice(0, 3)) {
    if (frame.base64Data && frame.imageLoaded) {
      try {
        // Embed actual radar image
        doc.addImage(frame.base64Data, "PNG", imgX, yPos, imageWidth - 4, imageHeight);

        // Frame label below image
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
        const frameLabel = `[${frame.frameType.toUpperCase()}] ${formatTimestamp(frame.timestamp)}`;
        doc.text(frameLabel, imgX + (imageWidth - 4) / 2, yPos + imageHeight + 4, {
          align: "center",
        });
      } catch {
        // Image embedding failed — show clean note
        doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
        doc.roundedRect(imgX, yPos, imageWidth - 4, imageHeight, 2, 2, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
        doc.text("Image unavailable", imgX + (imageWidth - 4) / 2, yPos + imageHeight / 2, {
          align: "center",
        });
      }
    }
    imgX += imageWidth;
  }

  return yPos + imageHeight + 12;
}

function renderCarrierTalkingPoints(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  yPos: number
): number {
  const text = sanitizeText(vm.carrierTalkingPoints);
  const lines = doc.splitTextToSize(text, contentWidth - 20) as string[];
  const lineHeight = 4.5;
  const headerHeight = 16;
  const padding = 8;
  const boxHeight = Math.max(22, lines.length * lineHeight + headerHeight + padding);
  const pageHeight = 279.4;
  const maxContentY = pageHeight - 30; // footer zone

  // If the whole box fits on this page, render it in one go
  if (yPos + boxHeight <= maxContentY) {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, "F");
    doc.setFillColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
    doc.rect(margin, yPos, 3, boxHeight, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 53, 15);
    doc.text("CARRIER TALKING POINTS", margin + 10, yPos + 8);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);

    let textY = yPos + headerHeight;
    for (const line of lines) {
      doc.text(line, margin + 10, textY);
      textY += lineHeight;
    }

    return yPos + boxHeight + 8;
  }

  // Box is too tall — render with page breaks
  // Draw header box on current page
  const firstPageLines: string[] = [];
  let testY = yPos + headerHeight;
  for (const line of lines) {
    if (testY + lineHeight > maxContentY) break;
    firstPageLines.push(line);
    testY += lineHeight;
  }

  const firstBoxHeight = firstPageLines.length * lineHeight + headerHeight + padding;
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin, yPos, contentWidth, firstBoxHeight, 3, 3, "F");
  doc.setFillColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
  doc.rect(margin, yPos, 3, firstBoxHeight, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 53, 15);
  doc.text("CARRIER TALKING POINTS", margin + 10, yPos + 8);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);

  let currentY = yPos + headerHeight;
  for (const line of firstPageLines) {
    doc.text(line, margin + 10, currentY);
    currentY += lineHeight;
  }

  // Remaining lines on new page(s)
  const remainingLines = lines.slice(firstPageLines.length);
  if (remainingLines.length > 0) {
    doc.addPage();
    currentY = margin;

    const contBoxHeight = remainingLines.length * lineHeight + padding + 4;
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin, currentY, contentWidth, contBoxHeight, 3, 3, "F");
    doc.setFillColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
    doc.rect(margin, currentY, 3, contBoxHeight, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);

    currentY += 4;
    for (const line of remainingLines) {
      if (currentY + lineHeight > maxContentY) {
        doc.addPage();
        currentY = margin + 4;
      }
      doc.text(line, margin + 10, currentY);
      currentY += lineHeight;
    }

    return currentY + 8;
  }

  return currentY + 8;
}

function renderFooter(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  pageWidth: number,
  pageHeight: number,
  brandColor: RGB
): void {
  const footerY = pageHeight - 22;

  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text(`Data Sources: ${vm.dataSources.join(" | ")}`, margin, footerY + 5);

  const genDate = new Date(vm.generatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated: ${genDate}`, margin, footerY + 9);
  doc.text(`Prepared by: ${vm.branding.companyName} | ${vm.generatedBy}`, margin, footerY + 13);

  doc.text(`Report ID: ${vm.reportId.substring(0, 8)}`, pageWidth - margin - 30, footerY + 5);

  doc.setFontSize(5);
  doc.text(
    "This report is generated using publicly available weather data and AI analysis. It should be used as supporting evidence only and does not constitute a formal weather certification.",
    margin,
    footerY + 18
  );

  // Bottom brand bar
  doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
  doc.rect(0, pageHeight - 3, pageWidth, 3, "F");
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function renderSectionHeader(
  doc: jsPDF,
  title: string,
  margin: number,
  contentWidth: number,
  brandColor: RGB,
  yPos: number
): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(brandColor.r, brandColor.g, brandColor.b);
  doc.text(title, margin, yPos);
  yPos += 2;
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, margin + contentWidth, yPos);
  return yPos + 5;
}

function renderInfoField(
  doc: jsPDF,
  label: string,
  value: string | null | undefined,
  x: number,
  y: number,
  maxWidth?: number
): void {
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text(label || "", x, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
  const safeValue = sanitizeText(value) || "--";
  const displayValue = maxWidth ? safeValue.substring(0, Math.floor(maxWidth / 2)) : safeValue;
  doc.text(displayValue, x, y + 5);
}

function checkPageBreak(
  doc: jsPDF,
  yPos: number,
  needed: number,
  pageHeight: number,
  margin: number
): number {
  if (yPos + needed > pageHeight - 30) {
    doc.addPage();
    return margin;
  }
  return yPos;
}

function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(
      /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu,
      ""
    )
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatShortDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function getPerilColor(peril: string): RGB {
  const p = peril.toLowerCase();
  if (p.includes("hail")) return { r: 37, g: 99, b: 235 };
  if (p.includes("wind")) return COLORS.danger;
  if (p.includes("rain") || p.includes("storm")) return COLORS.secondary;
  if (p.includes("unknown") || p.includes("review")) return COLORS.muted;
  return COLORS.warning;
}

function getEventColor(type?: string): RGB {
  if (!type) return COLORS.muted;
  const t = type.toLowerCase();
  if (t.includes("hail")) return { r: 37, g: 99, b: 235 };
  if (t.includes("wind")) return COLORS.danger;
  if (t.includes("rain") || t.includes("storm")) return COLORS.warning;
  return COLORS.secondary;
}

function getConfidenceColor(confidence: string): RGB {
  switch (confidence) {
    case "high":
      return COLORS.success;
    case "medium":
      return COLORS.warning;
    case "low":
      return { r: 234, g: 179, b: 8 };
    case "none":
      return COLORS.muted;
    default:
      return COLORS.muted;
  }
}
