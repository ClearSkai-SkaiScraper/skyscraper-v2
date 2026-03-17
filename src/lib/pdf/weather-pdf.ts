/**
 * Weather Report PDF Renderer (Serverless-Compatible)
 *
 * Generates a professional Weather Report PDF using jsPDF.
 * This replaces the Puppeteer-based htmlToPdfBuffer which FAILS on Vercel.
 *
 * @example
 * const buffer = renderWeatherPDF({ report, address, dol, radarStation, weatherConditions });
 */

import { logger } from "@/lib/logger";
import { jsPDF } from "jspdf";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WeatherEvent {
  date?: string;
  type?: string;
  description?: string;
  severity?: string;
  hailSize?: string;
  windSpeed?: string;
}

export interface WeatherCondition {
  datetime: string;
  tempmax?: number;
  tempmin?: number;
  precip?: number;
  precipprob?: number;
  windspeed?: number;
  windgust?: number;
  conditions?: string;
  icon?: string;
  description?: string;
}

export interface WeatherPdfInput {
  address: string;
  dol: string;
  peril?: string | null;
  summary?: string | null;
  carrierTalkingPoints?: string | null;
  events?: WeatherEvent[];
  lat?: number;
  lng?: number;
  radarStationId?: string | null;
  radarImageCount?: number;
  weatherConditions?: WeatherCondition[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Color Palette
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  primary: { r: 30, g: 64, b: 175 }, // #1e40af - Blue
  danger: { r: 220, g: 38, b: 38 }, // #dc2626 - Red
  success: { r: 5, g: 150, b: 105 }, // #059669 - Green
  warning: { r: 245, g: 158, b: 11 }, // #f59e0b - Amber
  dark: { r: 15, g: 23, b: 42 }, // #0f172a - Slate 900
  muted: { r: 100, g: 116, b: 139 }, // #64748b - Slate 500
  light: { r: 248, g: 250, b: 252 }, // #f8fafc - Slate 50
  border: { r: 226, g: 232, b: 240 }, // #e2e8f0 - Slate 200
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Renderer
// ─────────────────────────────────────────────────────────────────────────────

export function renderWeatherPDF(input: WeatherPdfInput): Buffer {
  const {
    address,
    dol,
    peril,
    summary,
    carrierTalkingPoints,
    events = [],
    lat = 0,
    lng = 0,
    radarStationId,
    radarImageCount = 0,
    weatherConditions = [],
  } = input;

  logger.info("[WEATHER_PDF] Rendering PDF", {
    address,
    dol,
    peril,
    eventsCount: events.length,
    weatherDays: weatherConditions.length,
  });

  const doc = new jsPDF({ format: "letter" });
  const pageWidth = 215.9;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  // ═══════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text("SkaiScraper Weather Intelligence", margin, yPos);

  // Badge on right
  doc.setFontSize(8);
  doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.roundedRect(pageWidth - margin - 50, yPos - 5, 50, 8, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.text("COMPREHENSIVE REPORT", pageWidth - margin - 48, yPos);

  yPos += 6;

  // Header line
  doc.setDrawColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ═══════════════════════════════════════════════════════════════════════
  // META INFO BOX
  // ═══════════════════════════════════════════════════════════════════════
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(margin, yPos - 2, contentWidth, 32, 2, 2, "F");
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.roundedRect(margin, yPos - 2, contentWidth, 32, 2, 2, "S");

  const col1 = margin + 4;
  const col2 = margin + contentWidth / 2;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);

  // Row 1
  doc.text("PROPERTY ADDRESS", col1, yPos + 3);
  doc.text("DATE OF LOSS", col2, yPos + 3);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.setFontSize(9);
  doc.text(address || "N/A", col1, yPos + 8);
  doc.text(dol || "N/A", col2, yPos + 8);

  // Row 2
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text("PRIMARY PERIL", col1, yPos + 15);
  doc.text("COORDINATES", col2, yPos + 15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.setFontSize(9);
  doc.text(peril || "Unknown", col1, yPos + 20);
  doc.text(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, col2, yPos + 20);

  // Row 3
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text("RADAR STATION", col1, yPos + 27);
  doc.text("GENERATED", col2, yPos + 27);
  yPos += 34;

  // ═══════════════════════════════════════════════════════════════════════
  // KEY METRICS CARDS
  // ═══════════════════════════════════════════════════════════════════════
  const cardWidth = contentWidth / 3 - 4;
  const cardHeight = 22;

  // Card 1: Peril
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(margin, yPos, cardWidth, cardHeight, 2, 2, "F");
  doc.setDrawColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
  doc.setLineWidth(1.5);
  doc.line(margin, yPos, margin, yPos + cardHeight);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
  doc.text(peril || "—", margin + cardWidth / 2, yPos + 10, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text("PRIMARY PERIL", margin + cardWidth / 2, yPos + 17, { align: "center" });

  // Card 2: Radar Station
  const card2X = margin + cardWidth + 6;
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(card2X, yPos, cardWidth, cardHeight, 2, 2, "F");
  doc.setDrawColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.line(card2X, yPos, card2X, yPos + cardHeight);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text(radarStationId || "—", card2X + cardWidth / 2, yPos + 10, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text("RADAR STATION", card2X + cardWidth / 2, yPos + 17, { align: "center" });

  // Card 3: Weather Days
  const card3X = margin + (cardWidth + 6) * 2;
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(card3X, yPos, cardWidth, cardHeight, 2, 2, "F");
  doc.setDrawColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
  doc.line(card3X, yPos, card3X, yPos + cardHeight);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
  doc.text(String(weatherConditions.length || 0), card3X + cardWidth / 2, yPos + 10, {
    align: "center",
  });
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text("WEATHER DAYS", card3X + cardWidth / 2, yPos + 17, { align: "center" });

  yPos += cardHeight + 10;

  // ═══════════════════════════════════════════════════════════════════════
  // EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════
  if (summary) {
    yPos = addSectionHeader(doc, "🔍 Executive Summary", yPos, margin, contentWidth);

    // Summary box
    const summaryLines = doc.splitTextToSize(summary, contentWidth - 16);
    const boxHeight = Math.max(20, summaryLines.length * 4.5 + 12);

    yPos = checkPage(doc, yPos, boxHeight);

    // Gradient-ish box effect
    doc.setFillColor(239, 246, 255); // Light blue
    doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, "F");
    doc.setDrawColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.setLineWidth(1.5);
    doc.line(margin, yPos, margin, yPos + boxHeight);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    for (let i = 0; i < summaryLines.length; i++) {
      doc.text(summaryLines[i], margin + 8, yPos + 8 + i * 4.5);
    }

    yPos += boxHeight + 8;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CARRIER TALKING POINTS
  // ═══════════════════════════════════════════════════════════════════════
  if (carrierTalkingPoints) {
    yPos = checkPage(doc, yPos, 30);

    const talkingLines = doc.splitTextToSize(carrierTalkingPoints, contentWidth - 16);
    const boxHeight = Math.max(20, talkingLines.length * 4.5 + 12);

    // Amber/yellow box
    doc.setFillColor(254, 243, 199); // Amber 100
    doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, "F");
    doc.setDrawColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
    doc.setLineWidth(1.5);
    doc.line(margin, yPos, margin, yPos + boxHeight);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 53, 15); // Amber 900
    doc.text("📋 Carrier Talking Points", margin + 8, yPos + 6);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    for (let i = 0; i < talkingLines.length; i++) {
      doc.text(talkingLines[i], margin + 8, yPos + 14 + i * 4.5);
    }

    yPos += boxHeight + 10;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WEATHER CONDITIONS TABLE
  // ═══════════════════════════════════════════════════════════════════════
  if (weatherConditions.length > 0) {
    yPos = checkPage(doc, yPos, 50);
    yPos = addSectionHeader(doc, "🌤️ Weather Data — 3-Day Window", yPos, margin, contentWidth);

    // Table header
    const colWidths = [32, 28, 22, 22, 32, 40];
    const headers = ["Date", "Temp (H/L)", "Precip", "Prob", "Wind", "Conditions"];
    let xOffset = margin;

    doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    doc.rect(margin, yPos, contentWidth, 7, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);

    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], xOffset + 2, yPos + 5);
      xOffset += colWidths[i];
    }
    yPos += 7;

    // Table rows
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);

    for (let idx = 0; idx < weatherConditions.length; idx++) {
      const w = weatherConditions[idx];
      yPos = checkPage(doc, yPos, 7);

      // Alternating row bg
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, yPos, contentWidth, 6, "F");
      }

      xOffset = margin;
      const dateStr = new Date(w.datetime).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      const rowData = [
        dateStr,
        `${w.tempmax?.toFixed(0) || "—"}° / ${w.tempmin?.toFixed(0) || "—"}°`,
        `${w.precip?.toFixed(2) || "0.00"}"`,
        `${w.precipprob?.toFixed(0) || 0}%`,
        `${w.windspeed?.toFixed(0) || "—"} mph`,
        w.conditions || "—",
      ];

      for (let i = 0; i < rowData.length; i++) {
        // Highlight high precip or wind
        if (i === 2 && (w.precip || 0) > 0.1) {
          doc.setTextColor(37, 99, 235); // Blue
        } else if (i === 4 && (w.windspeed || 0) > 30) {
          doc.setTextColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
        } else {
          doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
        }
        doc.text(rowData[i], xOffset + 2, yPos + 4);
        xOffset += colWidths[i];
      }

      // Row border
      doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      doc.setLineWidth(0.2);
      doc.line(margin, yPos + 6, margin + contentWidth, yPos + 6);

      yPos += 6;
    }

    yPos += 8;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WEATHER EVENTS
  // ═══════════════════════════════════════════════════════════════════════
  if (events.length > 0) {
    yPos = checkPage(doc, yPos, 30);
    yPos = addSectionHeader(doc, "⚡ Weather Events Detected", yPos, margin, contentWidth);

    for (const event of events) {
      yPos = checkPage(doc, yPos, 20);

      // Event card
      doc.setFillColor(255, 251, 235); // Amber 50
      doc.roundedRect(margin, yPos, contentWidth, 16, 2, 2, "F");
      doc.setDrawColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
      doc.setLineWidth(1.5);
      doc.line(margin, yPos, margin, yPos + 16);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 53, 15);
      doc.text(`${event.date || "Unknown Date"}: `, margin + 6, yPos + 6);

      doc.setFont("helvetica", "normal");
      const descText = event.description || event.type || "Weather Event";
      const descLines = doc.splitTextToSize(descText, contentWidth - 60);
      doc.text(descLines[0], margin + 40, yPos + 6);

      // Additional details
      doc.setFontSize(8);
      doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
      let detailX = margin + 6;

      if (event.severity) {
        doc.text(`Severity: ${event.severity}`, detailX, yPos + 12);
        detailX += 40;
      }
      if (event.hailSize) {
        doc.text(`Hail: ${event.hailSize}`, detailX, yPos + 12);
        detailX += 35;
      }
      if (event.windSpeed) {
        doc.text(`Wind: ${event.windSpeed}`, detailX, yPos + 12);
      }

      yPos += 20;
    }

    yPos += 6;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RADAR NOTE (if we have radar data)
  // ═══════════════════════════════════════════════════════════════════════
  if (radarStationId || radarImageCount > 0) {
    yPos = checkPage(doc, yPos, 24);

    doc.setFillColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    doc.roundedRect(margin, yPos, contentWidth, 20, 3, 3, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(248, 250, 252);
    doc.text("📡 NEXRAD Radar Data", margin + 8, yPos + 8);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Station: ${radarStationId || "N/A"} • ${radarImageCount} radar frames captured for ${dol}`,
      margin + 8,
      yPos + 14
    );

    yPos += 26;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════
  const footerY = 270;
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated by SkaiScraper Weather Intelligence • ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    margin,
    footerY + 6
  );
  doc.text(
    `Sources: Visual Crossing, Iowa Mesonet NEXRAD, NWS RIDGE • Coords: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    pageWidth - margin,
    footerY + 6,
    { align: "right" }
  );

  // ── Return as Buffer ──
  const arrayBuffer = doc.output("arraybuffer");
  logger.info("[WEATHER_PDF] PDF generated successfully", {
    byteSize: arrayBuffer.byteLength,
  });
  return Buffer.from(arrayBuffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function addSectionHeader(
  doc: jsPDF,
  title: string,
  yPos: number,
  margin: number,
  contentWidth: number
): number {
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.text(title, margin, yPos);
  yPos += 3;
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, margin + contentWidth, yPos);
  yPos += 6;
  return yPos;
}

function checkPage(doc: jsPDF, yPos: number, needed: number): number {
  if (yPos + needed > 265) {
    doc.addPage();
    return 20;
  }
  return yPos;
}
