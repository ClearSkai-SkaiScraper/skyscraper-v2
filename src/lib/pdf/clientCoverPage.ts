/**
 * Client-Side Cover Page for Browser PDF Generation
 *
 * Mirror of server-side drawCoverPage from @/lib/pdf/coverPage
 * but designed for "use client" components. Images loaded via browser canvas.
 *
 * Usage:
 *   import { drawClientCoverPage, fetchPropertyMapClient, type ClientCoverPageData } from "@/lib/pdf/clientCoverPage";
 *   const mapBase64 = await fetchPropertyMapClient("123 Main St, City, ST");
 *   await drawClientCoverPage(doc, { reportTitle: "Material Estimate", ... });
 *   doc.addPage(); // Start content
 */

import type { jsPDF } from "jspdf";

// ============================================================================
// Types
// ============================================================================

export type ReportCategory = "insurance" | "retail";

export interface ClientCoverPageData {
  reportTitle: string;
  reportSubtitle?: string;
  reportCategory: ReportCategory;

  // Branding
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
  brandColor: string;
  accentColor?: string;

  // Property
  propertyAddress?: string;
  propertyMapBase64?: string;

  // Insurance
  insuredName?: string;
  carrierName?: string;
  claimNumber?: string;
  policyNumber?: string;
  dateOfLoss?: string | Date;

  // Retail
  customerName?: string;
  projectName?: string;
  jobNumber?: string;

  reportDate?: Date;
}

// ============================================================================
// Helpers
// ============================================================================

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [17, 124, 255];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

function lightenRgb(rgb: [number, number, number], factor = 0.85): [number, number, number] {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * factor),
    Math.round(rgb[1] + (255 - rgb[1]) * factor),
    Math.round(rgb[2] + (255 - rgb[2]) * factor),
  ];
}

function _darkenRgb(rgb: [number, number, number], factor = 0.15): [number, number, number] {
  return [
    Math.round(rgb[0] * (1 - factor)),
    Math.round(rgb[1] * (1 - factor)),
    Math.round(rgb[2] * (1 - factor)),
  ];
}

function formatDate(d: string | Date | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

async function tryAddImageClient(
  doc: jsPDF,
  urlOrBase64: string,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<boolean> {
  try {
    if (urlOrBase64.startsWith("data:")) {
      const format = urlOrBase64.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(urlOrBase64, format, x, y, w, h);
      return true;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = urlOrBase64;
    });

    if (!loaded || img.width === 0) return false;

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    doc.addImage(dataUrl, "JPEG", x, y, w, h);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Cover Page Renderer (Client-Side)
// ============================================================================

export async function drawClientCoverPage(doc: jsPDF, data: ClientCoverPageData): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  const contentWidth = pageWidth - margin * 2;
  const brand = hexToRgb(data.brandColor);
  const brandLight = lightenRgb(brand, 0.92);
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

  // ── Accent line ──
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, 8, pageWidth, 2, "F");

  // ── Header background ──
  doc.setFillColor(brandLight[0], brandLight[1], brandLight[2]);
  doc.rect(0, 10, pageWidth, 68, "F");

  let yPos = 18;

  // ── Logo (top-left) ──
  const logoSize = 40;
  const logoX = margin;
  const logoY = yPos;
  let logoLoaded = false;
  if (data.logoUrl) {
    logoLoaded = await tryAddImageClient(doc, data.logoUrl, logoX, logoY, logoSize, logoSize);
  }
  if (!logoLoaded) {
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
  if (data.headshotUrl) {
    await tryAddImageClient(doc, data.headshotUrl, headshotX, yPos, headshotSize, headshotSize);
  }

  // ── Company info (center) ──
  const infoX = logoX + logoSize + 10;
  const infoMaxW = headshotX - infoX - 10;
  let infoY = yPos + 4;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(data.companyName, infoX, infoY, { maxWidth: infoMaxW });
  infoY += 7;

  if (data.companyLicense) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`License #${data.companyLicense}`, infoX, infoY);
    infoY += 5;
  }

  if (data.employeeName) {
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    let empLine = data.employeeName;
    if (data.employeeTitle) empLine += ` — ${data.employeeTitle}`;
    doc.text(empLine, infoX, infoY, { maxWidth: infoMaxW });
    infoY += 5;
  }

  if (data.employeePhone || data.companyPhone) {
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const parts: string[] = [];
    if (data.employeePhone) parts.push(data.employeePhone);
    else if (data.companyPhone) parts.push(data.companyPhone);
    if (data.companyEmail) parts.push(data.companyEmail);
    doc.text(parts.join("  •  "), infoX, infoY, { maxWidth: infoMaxW });
  }

  // ── Divider ──
  yPos = 82;
  doc.setDrawColor(brand[0], brand[1], brand[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // ── Map Image ──
  yPos += 8;
  if (data.propertyMapBase64) {
    const mapWidth = contentWidth * 0.85;
    const mapHeight = mapWidth * (400 / 600);
    const mapX = margin + (contentWidth - mapWidth) / 2;

    try {
      await tryAddImageClient(doc, data.propertyMapBase64, mapX, yPos, mapWidth, mapHeight);
      doc.setDrawColor(200, 210, 225);
      doc.setLineWidth(0.5);
      doc.rect(mapX, yPos, mapWidth, mapHeight, "S");
      yPos += mapHeight + 4;

      if (data.propertyAddress) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(data.propertyAddress, pageWidth / 2, yPos, { align: "center" });
        yPos += 8;
      }
    } catch {
      yPos += 4;
    }
  } else {
    yPos += 20;
    if (data.propertyAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(data.propertyAddress, pageWidth / 2, yPos, { align: "center" });
      yPos += 12;
    }
  }

  // ── Divider ──
  doc.setDrawColor(brand[0], brand[1], brand[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ── Report Title ──
  doc.setFillColor(brand[0], brand[1], brand[2]);
  const titleBoxH = data.reportSubtitle ? 30 : 22;
  doc.roundedRect(margin, yPos, contentWidth, titleBoxH, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.reportTitle, pageWidth / 2, yPos + (data.reportSubtitle ? 12 : 14), {
    align: "center",
    maxWidth: contentWidth - 20,
  });

  if (data.reportSubtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(data.reportSubtitle, pageWidth / 2, yPos + 23, {
      align: "center",
      maxWidth: contentWidth - 20,
    });
  }

  yPos += titleBoxH + 14;

  // ── Info Grid ──
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

    doc.setFillColor(brandLight[0], brandLight[1], brandLight[2]);
    doc.roundedRect(x + 2, y, cellW - 4, cellH - 3, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(brand[0], brand[1], brand[2]);
    doc.text(infoItems[i].label.toUpperCase(), x + cellPadding + 2, y + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(infoItems[i].value, x + cellPadding + 2, y + 19, {
      maxWidth: cellW - cellPadding * 2 - 4,
    });
  }

  // ── Bottom bar ──
  const bottomBarY = pageHeight - 16;
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(0, bottomBarY, pageWidth, 8, "F");
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, bottomBarY - 2, pageWidth, 2, "F");

  if (data.companyWebsite) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(data.companyWebsite, pageWidth / 2, bottomBarY + 5.5, { align: "center" });
  }

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
// Property Map Fetcher (Client-Side)
// ============================================================================

/**
 * Fetch a Mapbox satellite map with pin marker as base64 (browser-side).
 */
export async function fetchPropertyMapClient(address: string): Promise<string | undefined> {
  if (!address?.trim()) return undefined;

  try {
    // Geocode via Open-Meteo (free, no API key needed)
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

    // Build map URL — use Mapbox if token available, else OSM
    // Access NEXT_PUBLIC_ vars which are inlined at build time
    const mapboxToken =
      typeof window !== "undefined"
        ? ((window as { __NEXT_DATA__?: { props?: { pageProps?: { mapboxToken?: string } } } })
            .__NEXT_DATA__?.props?.pageProps?.mapboxToken ??
          // NEXT_PUBLIC_ vars are safe to access directly as they're replaced at build time
          (globalThis as { NEXT_PUBLIC_MAPBOX_TOKEN?: string }).NEXT_PUBLIC_MAPBOX_TOKEN)
        : undefined;

    let mapUrl: string;
    if (mapboxToken) {
      mapUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/pin-l+e74c3c(${lng},${lat})/${lng},${lat},15,0/600x400@2x?access_token=${mapboxToken}&attribution=false&logo=false`;
    } else {
      mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x400&markers=${lat},${lng},lightblue`;
    }

    // Load via canvas
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = mapUrl;
    });

    if (!loaded) return undefined;

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return undefined;
  }
}
