/**
 * Unified Cover Page — Server-Side (jsPDF)
 *
 * A beautiful, full-page cover for ALL report types.
 * Automatically handles Insurance vs Retail layout differences.
 *
 * Layout (Option A):
 * ┌─────────────────────────────────────────────────────────────┐
 * │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ Brand Color Top Bar ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
 * │                                                             │
 * │  [LOGO]     Company Name                    [HEADSHOT]      │
 * │             License #123456                                 │
 * │             Employee Name — Title — Phone                   │
 * │                                                             │
 * │ ─────────────────────────────────────────────────────────── │
 * │                                                             │
 * │           ╔══════════════════════════════╗                   │
 * │           ║   MAP PIN SATELLITE IMAGE   ║                   │
 * │           ║        (600×400)            ║                   │
 * │           ╚══════════════════════════════╝                   │
 * │              📍 123 Main St, City, ST                       │
 * │                                                             │
 * │ ─────────────────────────────────────────────────────────── │
 * │                                                             │
 * │          ┌──────── REPORT TITLE ────────┐                   │
 * │          │   Weather & Loss Report      │                   │
 * │          └──────────────────────────────┘                   │
 * │                                                             │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
 * │  │ Insured      │  │ Date of Loss│  │ Carrier     │        │
 * │  │ John Smith   │  │ Mar 15 2026 │  │ State Farm  │        │
 * │  └─────────────┘  └─────────────┘  └─────────────┘        │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
 * │  │ Claim #     │  │ Report Date │  │ Policy #    │        │
 * │  │ CLM-A1B2C3  │  │ Mar 22 2026 │  │ HO-123456  │        │
 * │  └─────────────┘  └─────────────┘  └─────────────┘        │
 * │                                                             │
 * │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ Brand Color Bottom Bar ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   import { drawCoverPage, type CoverPageData } from "@/lib/pdf/coverPage";
 *   const yAfterCover = await drawCoverPage(doc, data);
 *   doc.addPage(); // Start report content on next page
 */

import { jsPDF } from "jspdf";

import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type ReportCategory = "insurance" | "retail";

export interface CoverPageData {
  // Report info
  reportTitle: string; // e.g. "Weather & Loss Justification Report"
  reportSubtitle?: string; // e.g. "Certified Storm Damage Assessment"
  reportCategory: ReportCategory;

  // Branding (from fetchBrandingData)
  companyName: string;
  companyLicense?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  logoUrl?: string;
  headshotUrl?: string;
  employeeName?: string;
  employeeTitle?: string;
  employeePhone?: string;
  brandColor: string; // hex e.g. "#117CFF"
  accentColor?: string; // hex e.g. "#FFC838"

  // Property / Claim
  propertyAddress?: string;
  propertyMapBase64?: string; // Pre-fetched base64 map image

  // Insurance-specific fields
  insuredName?: string;
  carrierName?: string;
  claimNumber?: string;
  policyNumber?: string;
  dateOfLoss?: string | Date;

  // Retail-specific fields
  customerName?: string;
  projectName?: string;
  jobNumber?: string;

  // Common
  reportDate?: Date; // Defaults to now
}

import { BRAND_PRIMARY_RGB } from "@/lib/constants/branding";

// ============================================================================
// Helpers
// ============================================================================

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return BRAND_PRIMARY_RGB;
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

function darkenRgb(rgb: [number, number, number], factor = 0.15): [number, number, number] {
  return [
    Math.round(rgb[0] * (1 - factor)),
    Math.round(rgb[1] * (1 - factor)),
    Math.round(rgb[2] * (1 - factor)),
  ];
}

function lightenRgb(rgb: [number, number, number], factor = 0.85): [number, number, number] {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * factor),
    Math.round(rgb[1] + (255 - rgb[1]) * factor),
    Math.round(rgb[2] + (255 - rgb[2]) * factor),
  ];
}

function formatDate(d: string | Date | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Try to load a base64 image (already fetched) or fetch from URL and add to PDF.
 */
async function tryAddImage(
  doc: jsPDF,
  urlOrBase64: string,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<boolean> {
  try {
    if (urlOrBase64.startsWith("data:")) {
      // Already base64
      const format = urlOrBase64.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(urlOrBase64, format, x, y, w, h);
      return true;
    }

    // Fetch from URL
    const response = await fetch(urlOrBase64);
    if (!response.ok) return false;
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = response.headers.get("content-type") || "";
    const format: "JPEG" | "PNG" =
      contentType.includes("jpeg") || contentType.includes("jpg") || urlOrBase64.match(/\.jpe?g/i)
        ? "JPEG"
        : "PNG";
    doc.addImage(`data:image/${format.toLowerCase()};base64,${base64}`, format, x, y, w, h);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Cover Page Renderer
// ============================================================================

/**
 * Draw a beautiful full-page cover on the current page of a jsPDF document.
 *
 * Should be called on the first page. After calling, do `doc.addPage()` to
 * start the report body.
 */
export async function drawCoverPage(doc: jsPDF, data: CoverPageData): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  const contentWidth = pageWidth - margin * 2;
  const brand = hexToRgb(data.brandColor);
  const brandLight = lightenRgb(brand, 0.92);
  const _brandDark = darkenRgb(brand);
  const accent = data.accentColor
    ? hexToRgb(data.accentColor)
    : ([255, 200, 56] as [number, number, number]);
  const reportDate = formatDate(data.reportDate || new Date());
  const isInsurance = data.reportCategory === "insurance";

  // ── Background ──
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // ── Top brand bar ──
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(0, 0, pageWidth, 8, "F");

  // ── Thin accent line below brand bar ──
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, 8, pageWidth, 2, "F");

  // ── Header area background ──
  doc.setFillColor(brandLight[0], brandLight[1], brandLight[2]);
  doc.rect(0, 10, pageWidth, 68, "F");

  let yPos = 18;

  // ── Logo (top-left) ──
  const logoSize = 40;
  const logoX = margin;
  const logoY = yPos;
  let logoLoaded = false;
  if (data.logoUrl) {
    logoLoaded = await tryAddImage(doc, data.logoUrl, logoX, logoY, logoSize, logoSize);
  }

  if (!logoLoaded) {
    // Fallback: colored circle with initial
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.circle(logoX + 20, logoY + 20, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(data.companyName.charAt(0).toUpperCase(), logoX + 20, logoY + 27, {
      align: "center",
    });
  }

  // ── Headshot (top-right) ──
  const headshotSize = 40;
  const headshotX = pageWidth - margin - headshotSize;
  const headshotY = yPos;
  if (data.headshotUrl) {
    await tryAddImage(doc, data.headshotUrl, headshotX, headshotY, headshotSize, headshotSize);
  }

  // ── Company info (center between logo and headshot) ──
  const infoX = logoX + logoSize + 10;
  const infoMaxW = headshotX - infoX - 10;
  let infoY = yPos + 4;

  // Company name
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.companyName, infoX, infoY, { maxWidth: infoMaxW });
  infoY += 7;

  // License
  if (data.companyLicense) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`License #${data.companyLicense}`, infoX, infoY);
    infoY += 5;
  }

  // Employee
  if (data.employeeName) {
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    let empLine = data.employeeName;
    if (data.employeeTitle) empLine += ` — ${data.employeeTitle}`;
    doc.text(empLine, infoX, infoY, { maxWidth: infoMaxW });
    infoY += 5;
  }

  // Employee phone
  if (data.employeePhone || data.companyPhone) {
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const contactParts: string[] = [];
    if (data.employeePhone) contactParts.push(`📞 ${data.employeePhone}`);
    else if (data.companyPhone) contactParts.push(`📞 ${data.companyPhone}`);
    if (data.companyEmail) contactParts.push(data.companyEmail);
    doc.text(contactParts.join("  •  "), infoX, infoY, { maxWidth: infoMaxW });
  }

  // ── Divider line ──
  yPos = 82;
  doc.setDrawColor(brand[0], brand[1], brand[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // ── Map Pin Satellite Image (center, large) ──
  yPos += 8;
  if (data.propertyMapBase64) {
    const mapWidth = contentWidth * 0.85;
    const mapHeight = mapWidth * (400 / 600); // 3:2 aspect ratio
    const mapX = margin + (contentWidth - mapWidth) / 2;

    try {
      await tryAddImage(doc, data.propertyMapBase64, mapX, yPos, mapWidth, mapHeight);

      // Map border with rounded corners effect (just a rect stroke)
      doc.setDrawColor(200, 210, 225);
      doc.setLineWidth(0.5);
      doc.rect(mapX, yPos, mapWidth, mapHeight, "S");

      // Shadow effect — subtle bottom/right edge
      doc.setDrawColor(230, 235, 240);
      doc.setLineWidth(1);
      doc.line(mapX + 2, yPos + mapHeight + 1, mapX + mapWidth, yPos + mapHeight + 1);
      doc.line(mapX + mapWidth + 1, yPos + 2, mapX + mapWidth + 1, yPos + mapHeight);

      yPos += mapHeight + 4;

      // Address caption under map
      if (data.propertyAddress) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`📍 ${data.propertyAddress}`, pageWidth / 2, yPos, { align: "center" });
        yPos += 8;
      }
    } catch (err) {
      logger.warn("[COVER_PAGE] Map image embed failed:", err);
      yPos += 4;
    }
  } else {
    // No map — add extra spacing
    yPos += 20;

    // Show address as text if we have it
    if (data.propertyAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`📍 ${data.propertyAddress}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 12;
    }
  }

  // ── Divider line ──
  doc.setDrawColor(brand[0], brand[1], brand[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ── Report Title (centered, large) ──
  doc.setFillColor(brand[0], brand[1], brand[2]);
  const titleBoxH = data.reportSubtitle ? 30 : 22;
  const titleBoxY = yPos;
  doc.roundedRect(margin, titleBoxY, contentWidth, titleBoxH, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.reportTitle, pageWidth / 2, titleBoxY + (data.reportSubtitle ? 12 : 14), {
    align: "center",
    maxWidth: contentWidth - 20,
  });

  if (data.reportSubtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255, 0.85);
    doc.text(data.reportSubtitle, pageWidth / 2, titleBoxY + 23, {
      align: "center",
      maxWidth: contentWidth - 20,
    });
  }

  yPos = titleBoxY + titleBoxH + 14;

  // ── Info Grid (2 rows × 3 columns) ──
  const gridCols = 3;
  const cellW = contentWidth / gridCols;
  const cellH = 28;
  const cellPadding = 4;

  let infoItems: Array<{ label: string; value: string }>;

  if (isInsurance) {
    infoItems = [
      { label: "Insured", value: data.insuredName || "—" },
      { label: "Date of Loss", value: formatDate(data.dateOfLoss) || "—" },
      { label: "Carrier", value: data.carrierName || "—" },
      { label: "Claim Number", value: data.claimNumber || "—" },
      { label: "Report Date", value: reportDate },
      { label: "Policy Number", value: data.policyNumber || "—" },
    ];
  } else {
    // Retail
    infoItems = [
      { label: "Customer", value: data.customerName || data.insuredName || "—" },
      { label: "Project", value: data.projectName || "Restoration Project" },
      { label: "Report Date", value: reportDate },
      { label: "Job Number", value: data.jobNumber || "—" },
      { label: "Address", value: data.propertyAddress || "—" },
      { label: "Prepared By", value: data.employeeName || data.companyName },
    ];
  }

  for (let i = 0; i < infoItems.length; i++) {
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const x = margin + col * cellW;
    const y = yPos + row * cellH;

    // Cell background — alternate light
    doc.setFillColor(brandLight[0], brandLight[1], brandLight[2]);
    doc.roundedRect(x + 2, y, cellW - 4, cellH - 3, 2, 2, "F");

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(brand[0], brand[1], brand[2]);
    doc.text(infoItems[i].label.toUpperCase(), x + cellPadding + 2, y + 9);

    // Value
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(infoItems[i].value, x + cellPadding + 2, y + 19, {
      maxWidth: cellW - cellPadding * 2 - 4,
    });
  }

  yPos += Math.ceil(infoItems.length / gridCols) * cellH + 8;

  // ── Bottom brand bar ──
  const bottomBarY = pageHeight - 16;
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(0, bottomBarY, pageWidth, 8, "F");
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, bottomBarY - 2, pageWidth, 2, "F");

  // Company website in bottom bar
  if (data.companyWebsite) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(data.companyWebsite, pageWidth / 2, bottomBarY + 5.5, { align: "center" });
  }

  // Confidentiality notice
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(160, 170, 185);
  doc.text(
    "This document contains proprietary information. Distribution without written consent is prohibited.",
    pageWidth / 2,
    bottomBarY - 6,
    { align: "center" }
  );
}

// ============================================================================
// Helper: Build property map image (base64) from address
// ============================================================================

/**
 * Geocode an address and fetch a Mapbox satellite map with pin marker as base64.
 * Use this to get the propertyMapBase64 for CoverPageData.
 */
export async function fetchPropertyMapBase64(address: string): Promise<string | undefined> {
  if (!address?.trim()) return undefined;

  try {
    // Geocode via Open-Meteo (free)
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=en&format=json`
    );

    if (!geoRes.ok) return undefined;
    const geoData = (await geoRes.json()) as {
      results?: Array<{ latitude: number; longitude: number }>;
    };

    const result = geoData?.results?.[0];
    if (!result) return undefined;

    const { latitude: lat, longitude: lng } = result;

    // Build map URL
    const mapboxToken = config.NEXT_PUBLIC_MAPBOX_TOKEN ?? config.MAPBOX_ACCESS_TOKEN;
    let mapUrl: string;

    if (mapboxToken) {
      mapUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/pin-l+e74c3c(${lng},${lat})/${lng},${lat},15,0/600x400@2x?access_token=${mapboxToken}&attribution=false&logo=false`;
    } else {
      mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x400&markers=${lat},${lng},lightblue`;
    }

    // Fetch and convert to base64
    const imgRes = await fetch(mapUrl);
    if (!imgRes.ok) return undefined;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (err) {
    logger.warn("[COVER_PAGE] Property map fetch failed:", err);
    return undefined;
  }
}
