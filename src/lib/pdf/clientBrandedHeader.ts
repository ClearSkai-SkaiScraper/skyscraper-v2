/**
 * Client-Side Branded PDF Header
 *
 * Mirror of the server-side `drawBrandedHeader` from @/lib/pdf/brandedHeader
 * but designed to work in the browser. Images are loaded via browser fetch.
 *
 * Usage (in a "use client" component):
 *   import { fetchClientBranding, drawBrandedHeaderClient, drawPageFooterClient } from "@/lib/pdf/clientBrandedHeader";
 *   const branding = await fetchClientBranding();
 *   const yAfterHeader = await drawBrandedHeaderClient(doc, branding, { reportType: "Material Estimate" });
 *   // ... draw content ...
 *   drawPageFooterClient(doc, { companyName: branding.companyName });
 */

import type { jsPDF } from "jspdf";

import { BRAND_PRIMARY } from "@/lib/constants/branding";

// ============================================================================
// Types (matches server-side BrandingData)
// ============================================================================

export interface ClientBrandingData {
  companyName: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyLicense?: string;
  logoUrl?: string;
  brandColor: string;
  accentColor?: string;
  employeeName?: string;
  employeeTitle?: string;
  employeeEmail?: string;
  employeePhone?: string;
  headshotUrl?: string;
}

export interface ClientHeaderOptions {
  reportType: string;
  reportSubtitle?: string;
  dateLabel?: string;
}

// ============================================================================
// Data Fetcher (client-side — calls /api/branding/pdf)
// ============================================================================

/**
 * Fetch branding data from the server API for use in client-side PDF generation.
 */
export async function fetchClientBranding(): Promise<ClientBrandingData> {
  try {
    const res = await fetch("/api/branding/pdf");
    if (!res.ok) throw new Error(`Branding fetch failed: ${res.status}`);
    const data = (await res.json()) as Partial<ClientBrandingData>;
    return {
      companyName: data.companyName || "Your Company",
      companyPhone: data.companyPhone || undefined,
      companyEmail: data.companyEmail || undefined,
      companyWebsite: data.companyWebsite || undefined,
      companyLicense: data.companyLicense || undefined,
      logoUrl: data.logoUrl || undefined,
      brandColor: data.brandColor || BRAND_PRIMARY,
      accentColor: data.accentColor || undefined,
      employeeName: data.employeeName || undefined,
      employeeTitle: data.employeeTitle || undefined,
      employeeEmail: data.employeeEmail || undefined,
      employeePhone: data.employeePhone || undefined,
      headshotUrl: data.headshotUrl || undefined,
    };
  } catch {
    return { companyName: "Your Company", brandColor: BRAND_PRIMARY };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [17, 124, 255]; // BRAND_PRIMARY fallback
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

/**
 * Load an image URL and add it to the jsPDF document (browser-side).
 * Uses canvas to convert the image to a data URL.
 */
async function tryAddImageClient(
  doc: jsPDF,
  url: string,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<boolean> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });

    if (!loaded || !img.naturalWidth) return false;

    // Draw to canvas for format conversion
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0);

    const dataUrl = canvas.toDataURL("image/png");
    doc.addImage(dataUrl, "PNG", x, y, w, h);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Header Drawing (client-side jsPDF)
// ============================================================================

/**
 * Draw the branded header on a jsPDF document (client-side).
 * Returns the Y position after the header for content to begin.
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────────┐
 * │ [LOGO]    Company Name • License #123456        [PHOTO]  │
 * │           Phone • Email • Website                        │
 * │           Employee Name — Title                          │
 * ├──────────────────────────────────────────────────────────┤
 * │           Report Type | Date Generated                   │
 * └──────────────────────────────────────────────────────────┘
 */
export async function drawBrandedHeaderClient(
  doc: jsPDF,
  branding: ClientBrandingData,
  options: ClientHeaderOptions
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const headerHeight = 52;
  const [r, g, b] = hexToRgb(branding.brandColor);

  // ── Brand color bar at very top ──
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, pageWidth, 4, "F");

  // ── Header background ──
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(0, 4, pageWidth, headerHeight, "F");

  let contentStartX = margin;
  let contentEndX = pageWidth - margin;

  // ── Logo (left side) ──
  const logoSize = 28;
  const logoX = margin;
  const logoY = 10;
  if (branding.logoUrl) {
    const loaded = await tryAddImageClient(doc, branding.logoUrl, logoX, logoY, logoSize, logoSize);
    if (loaded) {
      contentStartX = logoX + logoSize + 6;
    }
  }

  // If no logo, use a colored circle with company initial
  if (contentStartX === margin) {
    doc.setFillColor(r, g, b);
    doc.circle(logoX + 14, logoY + 14, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(branding.companyName.charAt(0).toUpperCase(), logoX + 14, logoY + 19, {
      align: "center",
    });
    contentStartX = logoX + logoSize + 6;
  }

  // ── Employee headshot / team photo (right side) ──
  const headshotSize = 28;
  const headshotX = pageWidth - margin - headshotSize;
  const headshotY = 10;
  if (branding.headshotUrl) {
    const loaded = await tryAddImageClient(
      doc,
      branding.headshotUrl,
      headshotX,
      headshotY,
      headshotSize,
      headshotSize
    );
    if (loaded) {
      contentEndX = headshotX - 6;
    }
  }

  // ── Center: Company & Employee Info ──
  const centerX = contentStartX;
  let yPos = 14;

  // Company name + license
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  let companyLine = branding.companyName;
  if (branding.companyLicense) {
    companyLine += ` • Lic #${branding.companyLicense}`;
  }
  doc.text(companyLine, centerX, yPos, {
    maxWidth: contentEndX - centerX,
  });
  yPos += 5;

  // Contact info line
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // slate-500
  const contactParts: string[] = [];
  if (branding.companyPhone) contactParts.push(branding.companyPhone);
  if (branding.companyEmail) contactParts.push(branding.companyEmail);
  if (branding.companyWebsite) contactParts.push(branding.companyWebsite);
  if (contactParts.length > 0) {
    doc.text(contactParts.join(" • "), centerX, yPos, {
      maxWidth: contentEndX - centerX,
    });
    yPos += 4;
  }

  // Employee name + title
  if (branding.employeeName) {
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.setFont("helvetica", "normal");
    let employeeLine = branding.employeeName;
    if (branding.employeeTitle) {
      employeeLine += ` — ${branding.employeeTitle}`;
    }
    doc.text(employeeLine, centerX, yPos, {
      maxWidth: contentEndX - centerX,
    });
    yPos += 4;
  }

  // Employee email
  if (branding.employeeEmail) {
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(branding.employeeEmail, centerX, yPos, {
      maxWidth: contentEndX - centerX,
    });
    yPos += 4;
  }

  // ── Report type bar ──
  const barY = 4 + headerHeight;
  doc.setFillColor(r, g, b);
  doc.rect(0, barY, pageWidth, 12, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(options.reportType.toUpperCase(), margin, barY + 8);

  // Subtitle or date on right
  const dateStr =
    options.dateLabel ||
    `Generated: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(dateStr, pageWidth - margin, barY + 8, { align: "right" });

  // ── Optional subtitle below bar ──
  let afterHeaderY = barY + 16;

  if (options.reportSubtitle) {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(0, afterHeaderY - 2, pageWidth, 12, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(options.reportSubtitle, margin, afterHeaderY + 5, {
      maxWidth: pageWidth - margin * 2,
    });
    afterHeaderY += 14;
  }

  return afterHeaderY;
}

// ============================================================================
// Footer Drawing (client-side)
// ============================================================================

/**
 * Draw professional footer on all pages with page numbers and company name.
 */
export function drawPageFooterClient(
  doc: jsPDF,
  options: {
    companyName?: string;
    showDisclaimer?: boolean;
    disclaimerText?: string;
  } = {}
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();
  const margin = 15;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Separator line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    // Disclaimer (if enabled)
    if (options.showDisclaimer !== false) {
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184); // slate-400
      const disclaimer =
        options.disclaimerText ||
        "This estimate is for planning purposes only. Verify all quantities with your supplier before ordering.";
      doc.text(disclaimer, margin, pageHeight - 14, {
        maxWidth: pageWidth - margin * 2,
      });
    }

    // Page number (centered)
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 7, {
      align: "center",
    });

    // Company + date (left-aligned)
    doc.text(
      `Generated by ${options.companyName || "SkaiScraper"} • ${new Date().toLocaleDateString()}`,
      margin,
      pageHeight - 7
    );
  }
}
