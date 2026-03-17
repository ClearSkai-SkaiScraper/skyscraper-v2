/**
 * Weather Report PDF Renderer (Production-Ready)
 *
 * A professional, fully-hydrated weather report PDF that includes:
 * - Claim details (insured name, claim number, carrier)
 * - Company branding (logo, name, contact info)
 * - Real weather data from Visual Crossing / WeatherStack
 * - Proper geocoding with error handling
 * - Clean formatting without Unicode symbols
 *
 * @module lib/pdf/weather-report-pdf
 */

import { jsPDF } from "jspdf";

import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WeatherEvent {
  date?: string;
  time?: string;
  type?: string;
  description?: string;
  severity?: string;
  intensity?: string;
  hailSize?: string;
  windSpeed?: string;
  notes?: string;
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

export interface ClaimDetails {
  claimNumber?: string;
  insuredName?: string;
  carrier?: string;
  policyNumber?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  adjusterEmail?: string;
  dateOfLoss?: string;
  propertyAddress?: string;
}

export interface CompanyBranding {
  companyName: string;
  phone?: string;
  email?: string;
  website?: string;
  license?: string;
  logoUrl?: string;
  primaryColor?: string;
}

export interface WeatherReportPdfInput {
  // Required
  address: string;
  dol: string;

  // Location (validated - must not be 0,0)
  lat: number;
  lng: number;
  locationResolved: boolean;

  // Weather Analysis
  peril?: string | null;
  summary?: string | null;
  carrierTalkingPoints?: string | null;
  events?: WeatherEvent[];

  // Weather Data Sources
  weatherConditions?: WeatherCondition[];
  radarStationId?: string | null;
  radarImageCount?: number;

  // Claim Context
  claim?: ClaimDetails;

  // Company Branding
  branding?: CompanyBranding;

  // Metadata
  reportId?: string;
  generatedBy?: string;
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

export function renderWeatherReportPDF(input: WeatherReportPdfInput): Buffer {
  const {
    address,
    dol,
    lat,
    lng,
    locationResolved,
    peril,
    summary,
    carrierTalkingPoints,
    events = [],
    weatherConditions = [],
    radarStationId,
    radarImageCount = 0,
    claim,
    branding,
    reportId,
    generatedBy,
  } = input;

  logger.info("[WEATHER_REPORT_PDF] Rendering PDF", {
    address,
    dol,
    peril,
    locationResolved,
    lat,
    lng,
    eventsCount: events.length,
    weatherDays: weatherConditions.length,
    hasClaim: !!claim,
    hasBranding: !!branding,
  });

  const doc = new jsPDF({ format: "letter" });
  const pageWidth = 215.9;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  // Use branding color if available
  const brandColor = branding?.primaryColor
    ? hexToRgb(branding.primaryColor) || COLORS.primary
    : COLORS.primary;

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER - Company Branding
  // ═══════════════════════════════════════════════════════════════════════════
  const companyName = branding?.companyName || "SkaiScraper";

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(brandColor.r, brandColor.g, brandColor.b);
  doc.text(companyName, margin, yPos);

  // Sub-header with company info
  if (branding?.phone || branding?.email || branding?.website) {
    yPos += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    const contactParts = [branding.phone, branding.email, branding.website].filter(Boolean);
    doc.text(contactParts.join(" | "), margin, yPos);
  }

  // License if available
  if (branding?.license) {
    yPos += 4;
    doc.setFontSize(7);
    doc.text(`License: ${branding.license}`, margin, yPos);
  }

  // Report type badge on right
  doc.setFontSize(8);
  doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
  doc.roundedRect(pageWidth - margin - 55, 15, 55, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("WEATHER INTELLIGENCE", pageWidth - margin - 53, 21);

  yPos += 6;

  // Header line
  doc.setDrawColor(brandColor.r, brandColor.g, brandColor.b);
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // CLAIM DETAILS BOX (if available)
  // ═══════════════════════════════════════════════════════════════════════════
  if (claim && (claim.insuredName || claim.claimNumber || claim.carrier)) {
    doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
    doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, "F");
    doc.setDrawColor(brandColor.r, brandColor.g, brandColor.b);
    doc.setLineWidth(1);
    doc.line(margin, yPos, margin, yPos + 28);

    const col1 = margin + 6;
    const col2 = margin + contentWidth / 3;
    const col3 = margin + (contentWidth * 2) / 3;

    // Row 1 labels
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text("INSURED / CLIENT", col1, yPos + 5);
    doc.text("CLAIM NUMBER", col2, yPos + 5);
    doc.text("CARRIER", col3, yPos + 5);

    // Row 1 values
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    doc.text(claim.insuredName || "N/A", col1, yPos + 11);
    doc.text(claim.claimNumber || "N/A", col2, yPos + 11);
    doc.text(claim.carrier || "N/A", col3, yPos + 11);

    // Row 2 labels
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
    doc.text("POLICY NUMBER", col1, yPos + 17);
    doc.text("ADJUSTER", col2, yPos + 17);
    doc.text("DATE OF LOSS", col3, yPos + 17);

    // Row 2 values
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    doc.text(claim.policyNumber || "N/A", col1, yPos + 23);
    doc.text(claim.adjusterName || "N/A", col2, yPos + 23);
    doc.text(dol || "N/A", col3, yPos + 23);

    yPos += 34;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROPERTY & LOCATION BOX
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(margin, yPos, contentWidth, 24, 2, 2, "F");
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.roundedRect(margin, yPos, contentWidth, 24, 2, 2, "S");

  const propCol1 = margin + 4;
  const propCol2 = margin + contentWidth / 2;

  // Row 1
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text("PROPERTY ADDRESS", propCol1, yPos + 5);
  doc.text("PRIMARY PERIL", propCol2, yPos + 5);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text(address || "N/A", propCol1, yPos + 11);

  // Peril with color coding
  const perilDisplay = peril || "Unknown";
  if (peril?.toLowerCase().includes("hail")) {
    doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  } else if (peril?.toLowerCase().includes("wind")) {
    doc.setTextColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
  } else {
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  }
  doc.text(perilDisplay.toUpperCase(), propCol2, yPos + 11);

  // Row 2
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text("COORDINATES", propCol1, yPos + 17);
  doc.text("RADAR STATION", propCol2, yPos + 17);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  // Location warning if not resolved
  if (!locationResolved || (lat === 0 && lng === 0)) {
    doc.setTextColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
    doc.text("LOCATION NOT RESOLVED", propCol1, yPos + 22);
  } else {
    doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    doc.text(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, propCol1, yPos + 22);
  }

  doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.text(radarStationId || "N/A", propCol2, yPos + 22);

  yPos += 30;

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCATION WARNING (if geocoding failed)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!locationResolved || (lat === 0 && lng === 0)) {
    doc.setFillColor(254, 226, 226); // Red 100
    doc.roundedRect(margin, yPos, contentWidth, 14, 2, 2, "F");
    doc.setDrawColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
    doc.setLineWidth(1);
    doc.line(margin, yPos, margin, yPos + 14);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
    doc.text("WARNING: Location could not be geocoded", margin + 6, yPos + 6);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Weather data may be incomplete. Please verify the property address.",
      margin + 6,
      yPos + 11
    );

    yPos += 18;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // KEY METRICS CARDS
  // ═══════════════════════════════════════════════════════════════════════════
  const cardWidth = contentWidth / 3 - 4;
  const cardHeight = 20;

  // Card 1: Peril
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(margin, yPos, cardWidth, cardHeight, 2, 2, "F");
  doc.setDrawColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
  doc.setLineWidth(1.5);
  doc.line(margin, yPos, margin, yPos + cardHeight);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.danger.r, COLORS.danger.g, COLORS.danger.b);
  doc.text(peril || "--", margin + cardWidth / 2, yPos + 9, { align: "center" });
  doc.setFontSize(6);
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text("PRIMARY PERIL", margin + cardWidth / 2, yPos + 15, { align: "center" });

  // Card 2: Radar Station
  const card2X = margin + cardWidth + 6;
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(card2X, yPos, cardWidth, cardHeight, 2, 2, "F");
  doc.setDrawColor(brandColor.r, brandColor.g, brandColor.b);
  doc.line(card2X, yPos, card2X, yPos + cardHeight);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(brandColor.r, brandColor.g, brandColor.b);
  doc.text(radarStationId || "--", card2X + cardWidth / 2, yPos + 9, { align: "center" });
  doc.setFontSize(6);
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text("RADAR STATION", card2X + cardWidth / 2, yPos + 15, { align: "center" });

  // Card 3: Weather Days
  const card3X = margin + (cardWidth + 6) * 2;
  doc.setFillColor(COLORS.light.r, COLORS.light.g, COLORS.light.b);
  doc.roundedRect(card3X, yPos, cardWidth, cardHeight, 2, 2, "F");
  doc.setDrawColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
  doc.line(card3X, yPos, card3X, yPos + cardHeight);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
  doc.text(String(weatherConditions.length || 0), card3X + cardWidth / 2, yPos + 9, {
    align: "center",
  });
  doc.setFontSize(6);
  doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
  doc.text("WEATHER DAYS", card3X + cardWidth / 2, yPos + 15, { align: "center" });

  yPos += cardHeight + 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  if (summary) {
    yPos = addSectionHeader(doc, "EXECUTIVE SUMMARY", yPos, margin, contentWidth, brandColor);

    const cleanSummary = sanitizeText(summary);
    const summaryLines = doc.splitTextToSize(cleanSummary, contentWidth - 16);
    const boxHeight = Math.max(20, summaryLines.length * 4.5 + 12);

    yPos = checkPage(doc, yPos, boxHeight);

    doc.setFillColor(239, 246, 255); // Light blue
    doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, "F");
    doc.setDrawColor(brandColor.r, brandColor.g, brandColor.b);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // CARRIER TALKING POINTS
  // ═══════════════════════════════════════════════════════════════════════════
  if (carrierTalkingPoints) {
    yPos = checkPage(doc, yPos, 30);

    const cleanTalking = sanitizeText(carrierTalkingPoints);
    const talkingLines = doc.splitTextToSize(cleanTalking, contentWidth - 16);
    const boxHeight = Math.max(20, talkingLines.length * 4.5 + 14);

    doc.setFillColor(254, 243, 199); // Amber 100
    doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, "F");
    doc.setDrawColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
    doc.setLineWidth(1.5);
    doc.line(margin, yPos, margin, yPos + boxHeight);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 53, 15); // Amber 900
    doc.text("CARRIER TALKING POINTS", margin + 8, yPos + 7);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    for (let i = 0; i < talkingLines.length; i++) {
      doc.text(talkingLines[i], margin + 8, yPos + 15 + i * 4.5);
    }

    yPos += boxHeight + 10;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER CONDITIONS TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  if (weatherConditions.length > 0) {
    yPos = checkPage(doc, yPos, 50);
    yPos = addSectionHeader(
      doc,
      "WEATHER DATA - 3-DAY WINDOW",
      yPos,
      margin,
      contentWidth,
      brandColor
    );

    // Table header
    const colWidths = [32, 28, 22, 22, 32, 40];
    const headers = ["Date", "Temp (H/L)", "Precip", "Prob", "Wind", "Conditions"];
    let xOffset = margin;

    doc.setFillColor(brandColor.r, brandColor.g, brandColor.b);
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

    for (let idx = 0; idx < Math.min(weatherConditions.length, 7); idx++) {
      const w = weatherConditions[idx];
      yPos = checkPage(doc, yPos, 7);

      // Alternating row bg
      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, yPos, contentWidth, 6, "F");
      }

      xOffset = margin;
      const dateStr = formatWeatherDate(w.datetime);

      const rowData = [
        dateStr,
        `${w.tempmax?.toFixed(0) || "--"}F / ${w.tempmin?.toFixed(0) || "--"}F`,
        `${w.precip?.toFixed(2) || "0.00"}"`,
        `${w.precipprob?.toFixed(0) || 0}%`,
        `${w.windspeed?.toFixed(0) || "--"} mph`,
        sanitizeText(w.conditions || "--"),
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
        doc.text(rowData[i].substring(0, 18), xOffset + 2, yPos + 4); // Truncate long text
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

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  if (events.length > 0) {
    yPos = checkPage(doc, yPos, 30);
    yPos = addSectionHeader(doc, "WEATHER EVENTS DETECTED", yPos, margin, contentWidth, brandColor);

    for (const event of events.slice(0, 5)) {
      // Max 5 events
      yPos = checkPage(doc, yPos, 18);

      // Event card
      doc.setFillColor(255, 251, 235); // Amber 50
      doc.roundedRect(margin, yPos, contentWidth, 14, 2, 2, "F");
      doc.setDrawColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
      doc.setLineWidth(1.5);
      doc.line(margin, yPos, margin, yPos + 14);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 53, 15);
      const eventDate = event.date || "Unknown Date";
      const eventTime = event.time ? ` at ${event.time}` : "";
      doc.text(`${eventDate}${eventTime}:`, margin + 6, yPos + 6);

      doc.setFont("helvetica", "normal");
      const eventType = event.type || event.description || "Weather Event";
      doc.text(sanitizeText(eventType).substring(0, 50), margin + 50, yPos + 6);

      // Details row
      doc.setFontSize(8);
      doc.setTextColor(COLORS.muted.r, COLORS.muted.g, COLORS.muted.b);
      const details: string[] = [];
      if (event.intensity || event.severity) {
        details.push(`Severity: ${event.intensity || event.severity}`);
      }
      if (event.hailSize) {
        details.push(`Hail: ${event.hailSize}`);
      }
      if (event.windSpeed) {
        details.push(`Wind: ${event.windSpeed}`);
      }
      if (event.notes) {
        details.push(sanitizeText(event.notes).substring(0, 40));
      }
      if (details.length > 0) {
        doc.text(details.join(" | "), margin + 6, yPos + 11);
      }

      yPos += 18;
    }

    yPos += 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA SOURCES
  // ═══════════════════════════════════════════════════════════════════════════
  yPos = checkPage(doc, yPos, 30);

  doc.setFillColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.roundedRect(margin, yPos, contentWidth, 22, 3, 3, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(248, 250, 252);
  doc.text("DATA SOURCES", margin + 8, yPos + 7);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);

  const sources: string[] = [];
  if (weatherConditions.length > 0) sources.push("Visual Crossing Weather API");
  if (radarStationId) sources.push(`NEXRAD Radar (${radarStationId})`);
  sources.push("Iowa Environmental Mesonet", "NWS RIDGE");

  doc.text(sources.join(" | "), margin + 8, yPos + 13);
  doc.text(
    `Radar frames captured: ${radarImageCount} | Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    margin + 8,
    yPos + 18
  );

  yPos += 28;

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  const footerY = 268;
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);

  // Left side - company info
  const footerLeft: string[] = [];
  footerLeft.push(`Generated by ${companyName}`);
  if (generatedBy) footerLeft.push(`Prepared by: ${generatedBy}`);
  doc.text(footerLeft.join(" | "), margin, footerY + 5);

  // Center - date
  const genDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(genDate, pageWidth / 2, footerY + 5, { align: "center" });

  // Right side - report ID
  if (reportId) {
    doc.text(`Report ID: ${reportId.substring(0, 8)}`, pageWidth - margin, footerY + 5, {
      align: "right",
    });
  }

  // Disclaimer
  doc.setFontSize(6);
  doc.text(
    "This report is generated using publicly available weather data and AI analysis. It should be used as supporting evidence only.",
    margin,
    footerY + 10
  );

  // ── Return as Buffer ──
  const arrayBuffer = doc.output("arraybuffer");
  logger.info("[WEATHER_REPORT_PDF] PDF generated successfully", {
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
  contentWidth: number,
  brandColor: { r: number; g: number; b: number }
): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(brandColor.r, brandColor.g, brandColor.b);
  doc.text(title, margin, yPos);
  yPos += 3;
  doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, margin + contentWidth, yPos);
  yPos += 6;
  return yPos;
}

function checkPage(doc: jsPDF, yPos: number, needed: number): number {
  if (yPos + needed > 262) {
    doc.addPage();
    return 20;
  }
  return yPos;
}

/**
 * Remove unsupported Unicode characters and emojis for jsPDF
 */
function sanitizeText(text: string): string {
  if (!text) return "";
  // Remove emojis, special symbols, and problematic characters
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu,
      ""
    )
    .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Format weather date for display
 */
function formatWeatherDate(datetime: string): string {
  try {
    return new Date(datetime).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return datetime || "--";
  }
}
