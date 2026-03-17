/**
 * Premium Weather Report PDF Renderer
 *
 * A polished, branded weather report PDF that matches the quality
 * of our better report generators.
 *
 * Layout:
 * 1. Branded Header
 * 2. Claim Snapshot Grid
 * 3. Executive Summary
 * 4. Weather Timeline (Day Before / DOL / Day After)
 * 5. Storm Event Evidence
 * 6. Radar Imagery (if available)
 * 7. Carrier Talking Points
 * 8. Sources + Footer
 *
 * @module lib/pdf/weather-report-pdf
 */

import { jsPDF } from "jspdf";

import { logger } from "@/lib/logger";
import type { WeatherPdfViewModel } from "@/lib/weather/weatherPdfViewModel";

// Re-export types for route compatibility
export { buildWeatherPdfViewModel } from "@/lib/weather/weatherPdfViewModel";
export type { WeatherPdfViewModel };

// ─────────────────────────────────────────────────────────────────────────────
// Color Palette
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  primary: { r: 30, g: 64, b: 175 }, // #1e40af
  secondary: { r: 59, g: 130, b: 246 }, // #3b82f6
  danger: { r: 220, g: 38, b: 38 }, // #dc2626
  success: { r: 5, g: 150, b: 105 }, // #059669
  warning: { r: 245, g: 158, b: 11 }, // #f59e0b
  dark: { r: 15, g: 23, b: 42 }, // #0f172a
  text: { r: 30, g: 41, b: 59 }, // #1e293b
  muted: { r: 100, g: 116, b: 139 }, // #64748b
  light: { r: 248, g: 250, b: 252 }, // #f8fafc
  lightBlue: { r: 239, g: 246, b: 255 }, // #eff6ff
  border: { r: 226, g: 232, b: 240 }, // #e2e8f0
  white: { r: 255, g: 255, b: 255 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Renderer
// ─────────────────────────────────────────────────────────────────────────────

export function renderWeatherReportPDF(viewModel: WeatherPdfViewModel): Buffer {
  logger.info("[WEATHER_PDF] Rendering premium PDF", {
    reportId: viewModel.reportId,
    anchorDate: viewModel.anchorDate,
    weatherDays: viewModel.weatherWindow.length,
    events: viewModel.events.length,
    radarFrames: viewModel.radarFrames.length,
    hasStormEvidence: viewModel.hasStormEvidence,
    peril: viewModel.peril.type,
  });

  const doc = new jsPDF({ format: "letter" });
  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Parse brand color
  const brandColor = hexToRgb(viewModel.branding.primaryColor) || COLORS.primary;

  let yPos = margin;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: BRANDED HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  yPos = renderBrandedHeader(doc, viewModel, margin, contentWidth, pageWidth, brandColor, yPos);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: CLAIM SNAPSHOT
  // ═══════════════════════════════════════════════════════════════════════════
  yPos = renderClaimSnapshot(doc, viewModel, margin, contentWidth, brandColor, yPos);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  yPos = checkPageBreak(doc, yPos, 40, pageHeight, margin);
  yPos = renderExecutiveSummary(doc, viewModel, margin, contentWidth, brandColor, yPos);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: WEATHER TIMELINE
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewModel.weatherWindow.length > 0) {
    yPos = checkPageBreak(doc, yPos, 50, pageHeight, margin);
    yPos = renderWeatherTimeline(doc, viewModel, margin, contentWidth, brandColor, yPos);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: STORM EVENT EVIDENCE
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewModel.events.length > 0) {
    yPos = checkPageBreak(doc, yPos, 40, pageHeight, margin);
    yPos = renderStormEvents(doc, viewModel, margin, contentWidth, brandColor, yPos, pageHeight);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: EVIDENCE SUMMARY (if storm evidence exists)
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewModel.hasStormEvidence) {
    yPos = checkPageBreak(doc, yPos, 35, pageHeight, margin);
    yPos = renderEvidenceSummary(doc, viewModel, margin, contentWidth, brandColor, yPos);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: RADAR IMAGERY NOTE
  // ═══════════════════════════════════════════════════════════════════════════
  yPos = checkPageBreak(doc, yPos, 30, pageHeight, margin);
  yPos = renderRadarSection(doc, viewModel, margin, contentWidth, brandColor, yPos);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: CARRIER TALKING POINTS
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewModel.carrierTalkingPoints) {
    yPos = checkPageBreak(doc, yPos, 40, pageHeight, margin);
    yPos = renderCarrierTalkingPoints(doc, viewModel, margin, contentWidth, yPos);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 9: DATA SOURCES + FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  renderFooter(doc, viewModel, margin, contentWidth, pageWidth, pageHeight, brandColor);

  // ── Return as Buffer ──
  const arrayBuffer = doc.output("arraybuffer");
  logger.info("[WEATHER_PDF] PDF generated successfully", {
    byteSize: arrayBuffer.byteLength,
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
  // Brand color top bar
  doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
  doc.rect(0, 0, pageWidth, 4, "F");

  yPos = 12;

  // Company name
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(brandColor.r, brandColor.g, brandColor.b);
  doc.text(vm.branding.companyName, margin, yPos);

  // Report badge
  doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
  doc.roundedRect(pageWidth - margin - 48, yPos - 6, 48, 10, 2, 2, "F");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("WEATHER REPORT", pageWidth - margin - 46, yPos - 1);

  yPos += 5;

  // Company contact line
  const contactParts = [vm.branding.phone, vm.branding.email, vm.branding.website].filter(Boolean);
  if (contactParts.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text(contactParts.join("  |  "), margin, yPos);
    yPos += 4;
  }

  // License
  if (vm.branding.license) {
    doc.setFontSize(7);
    doc.text(`License: ${vm.branding.license}`, margin, yPos);
    yPos += 3;
  }

  // Divider line
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
  // Section header
  yPos = renderSectionHeader(doc, "CLAIM SNAPSHOT", margin, contentWidth, brandColor, yPos);

  // Snapshot grid background
  const gridHeight = 38;
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(margin, yPos, contentWidth, gridHeight, 3, 3, "F");
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, contentWidth, gridHeight, 3, 3, "S");

  // Brand accent line
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

  // Peril value with appropriate color
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
  const lines = doc.splitTextToSize(summary, contentWidth - 16);
  const boxHeight = Math.max(20, lines.length * 4.5 + 12);

  // Summary box
  doc.setFillColor(COLORS.lightBlue.r, COLORS.lightBlue.g, COLORS.lightBlue.b);
  doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, "F");

  // Accent line
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

function renderWeatherTimeline(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  brandColor: RGB,
  yPos: number
): number {
  yPos = renderSectionHeader(
    doc,
    "WEATHER TIMELINE - Day Before / Date of Loss / Day After",
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

  // Table rows
  for (const day of vm.weatherWindow) {
    const rowHeight = 8;

    // Highlight DOL row
    if (day.isAnchorDay) {
      doc.setFillColor(254, 243, 199); // Amber 100
    } else {
      doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    }
    doc.rect(margin, yPos, contentWidth, rowHeight, "F");

    // Row border
    doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    doc.setLineWidth(0.2);
    doc.line(margin, yPos + rowHeight, margin + contentWidth, yPos + rowHeight);

    doc.setFontSize(8);
    doc.setFont("helvetica", day.isAnchorDay ? "bold" : "normal");
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);

    xOffset = margin + 3;

    // Date + Label
    const dateDisplay = formatShortDate(day.date);
    doc.text(`${dateDisplay} (${day.label})`, xOffset, yPos + 5.5);
    xOffset += colWidths[0];

    // Temp
    const tempStr = `${day.tempHigh?.toFixed(0) || "--"}F / ${day.tempLow?.toFixed(0) || "--"}F`;
    doc.text(tempStr, xOffset, yPos + 5.5);
    xOffset += colWidths[1];

    // Precip
    const precipStr = `${day.precip?.toFixed(2) || "0.00"}"`;
    if ((day.precip || 0) > 0.1) {
      doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    }
    doc.text(precipStr, xOffset, yPos + 5.5);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    xOffset += colWidths[2];

    // Prob
    doc.text(`${day.precipProb?.toFixed(0) || 0}%`, xOffset, yPos + 5.5);
    xOffset += colWidths[3];

    // Wind
    const windStr = day.windGust
      ? `${day.windSpeed?.toFixed(0) || "--"} (${day.windGust.toFixed(0)}) mph`
      : `${day.windSpeed?.toFixed(0) || "--"} mph`;
    if ((day.windGust || 0) > 40) {
      doc.setTextColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
    }
    doc.text(windStr, xOffset, yPos + 5.5);
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    xOffset += colWidths[4];

    // Conditions
    const condStr = sanitizeText(day.conditions || "--").substring(0, 30);
    doc.text(condStr, xOffset, yPos + 5.5);

    yPos += rowHeight;
  }

  return yPos + 8;
}

function renderStormEvents(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  brandColor: RGB,
  yPos: number,
  pageHeight: number
): number {
  yPos = renderSectionHeader(doc, "STORM EVENT EVIDENCE", margin, contentWidth, brandColor, yPos);

  for (const event of vm.events.slice(0, 4)) {
    // Max 4 events
    yPos = checkPageBreak(doc, yPos, 18, pageHeight, margin);

    // Event card
    const cardHeight = 15;
    doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
    doc.roundedRect(margin, yPos, contentWidth, cardHeight, 2, 2, "F");

    // Type accent
    const eventColor = getEventColor(event.type);
    doc.setFillColor(eventColor.r, eventColor.g, eventColor.b);
    doc.rect(margin, yPos, 3, cardHeight, "F");

    // Event date/time
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);
    const eventDateTime = event.time ? `${event.date} at ${event.time}` : event.date;
    doc.text(eventDateTime || "Unknown Date", margin + 8, yPos + 6);

    // Event type badge
    doc.setFillColor(eventColor.r, eventColor.g, eventColor.b);
    doc.roundedRect(margin + 70, yPos + 2, 25, 6, 1, 1, "F");
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text((event.type || "Event").toUpperCase(), margin + 82.5, yPos + 6, { align: "center" });

    // Details line
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);

    const detailParts: string[] = [];
    if (event.severity || event.intensity) {
      detailParts.push(`Severity: ${event.severity || event.intensity}`);
    }
    if (event.hailSize) {
      detailParts.push(`Hail: ${event.hailSize}`);
    }
    if (event.windSpeed) {
      detailParts.push(`Wind: ${event.windSpeed}`);
    }
    if (event.notes) {
      detailParts.push(sanitizeText(event.notes).substring(0, 50));
    }

    if (detailParts.length > 0) {
      doc.text(detailParts.join("  |  "), margin + 8, yPos + 12);
    }

    yPos += cardHeight + 4;
  }

  return yPos + 4;
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

  // Evidence cards grid
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
      value: vm.evidence.hasRadar ? `${vm.radarFrames.length} frames` : "N/A",
      active: vm.evidence.hasRadar,
    },
  ];

  let cardX = margin;
  for (const card of cards) {
    // Card background
    if (card.active) {
      doc.setFillColor(COLORS.lightBlue.r, COLORS.lightBlue.g, COLORS.lightBlue.b);
    } else {
      doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
    }
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, "F");

    // Border
    if (card.active) {
      doc.setDrawColor(brandColor.r, brandColor.g, brandColor.b);
    } else {
      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    }
    doc.setLineWidth(0.5);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 2, 2, "S");

    // Label
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text(card.label, cardX + cardWidth / 2, yPos + 5, { align: "center" });

    // Value
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    if (card.active) {
      doc.setTextColor(brandColor.r, brandColor.g, brandColor.b);
    } else {
      doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    }
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

function renderRadarSection(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  brandColor: RGB,
  yPos: number
): number {
  yPos = renderSectionHeader(doc, "RADAR IMAGERY", margin, contentWidth, brandColor, yPos);

  if (!vm.hasRadarImagery) {
    // No radar available - clean note
    doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
    doc.roundedRect(margin, yPos, contentWidth, 14, 2, 2, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text(
      "No radar imagery available for the selected time window. Weather data sourced from station observations.",
      margin + 6,
      yPos + 9
    );

    return yPos + 20;
  }

  // Radar metadata card
  doc.setFillColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.roundedRect(margin, yPos, contentWidth, 22, 3, 3, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
  doc.text("NEXRAD Radar Data", margin + 8, yPos + 8);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);

  const radarInfo = [
    `Station: ${vm.location.radarStationId}`,
    `Frames Captured: ${vm.radarFrames.length}`,
    `Location: ${vm.location.lat.toFixed(4)}, ${vm.location.lng.toFixed(4)}`,
  ];
  doc.text(radarInfo.join("  |  "), margin + 8, yPos + 15);

  yPos += 26;

  // Radar frame metadata
  if (vm.radarFrames.length > 0) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text("Selected radar frames:", margin, yPos);
    yPos += 4;

    for (const frame of vm.radarFrames.slice(0, 3)) {
      const frameLabel = `[${frame.frameType.toUpperCase()}] ${formatTimestamp(frame.timestamp)} - ${frame.label}`;
      doc.text(frameLabel, margin + 4, yPos);
      yPos += 3.5;
    }
  }

  return yPos + 6;
}

function renderCarrierTalkingPoints(
  doc: jsPDF,
  vm: WeatherPdfViewModel,
  margin: number,
  contentWidth: number,
  yPos: number
): number {
  // Amber/warning style box
  const text = sanitizeText(vm.carrierTalkingPoints);
  const lines = doc.splitTextToSize(text, contentWidth - 16);
  const boxHeight = Math.max(22, lines.length * 4.5 + 16);

  doc.setFillColor(254, 243, 199); // Amber 100
  doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, "F");

  // Warning accent
  doc.setFillColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
  doc.rect(margin, yPos, 3, boxHeight, "F");

  // Header
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 53, 15); // Amber 900
  doc.text("CARRIER TALKING POINTS", margin + 10, yPos + 8);

  // Content
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);

  let textY = yPos + 16;
  for (const line of lines) {
    doc.text(line, margin + 10, textY);
    textY += 4.5;
  }

  return yPos + boxHeight + 8;
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

  // Divider
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  // Data sources
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text(`Data Sources: ${vm.dataSources.join(" | ")}`, margin, footerY + 5);

  // Generated info
  const genDate = new Date(vm.generatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated: ${genDate}`, margin, footerY + 9);
  doc.text(`Prepared by: ${vm.generatedBy}`, margin, footerY + 13);

  // Report ID
  doc.text(`Report ID: ${vm.reportId.substring(0, 8)}`, pageWidth - margin - 30, footerY + 5);

  // Disclaimer
  doc.setFontSize(5);
  doc.text(
    "This report is generated using publicly available weather data and AI analysis. It should be used as supporting evidence only and does not constitute a formal weather certification.",
    margin,
    footerY + 18
  );

  // Brand bar at bottom
  doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
  doc.rect(0, pageHeight - 3, pageWidth, 3, "F");
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

interface RGB {
  r: number;
  g: number;
  b: number;
}

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
  value: string,
  x: number,
  y: number,
  maxWidth?: number
): void {
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text(label, x, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text.r, COLORS.text.g, COLORS.text.b);

  const displayValue = maxWidth
    ? sanitizeText(value).substring(0, Math.floor(maxWidth / 2))
    : sanitizeText(value);
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
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function sanitizeText(text: string): string {
  if (!text) return "";
  return text
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
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
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
  if (p.includes("hail")) return { r: 37, g: 99, b: 235 }; // Blue
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
      return { r: 234, g: 179, b: 8 }; // Yellow
    default:
      return COLORS.muted;
  }
}
