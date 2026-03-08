/**
 * Unified PDF Branding Header
 *
 * Shared branding header system used across ALL report types:
 * - Claims Packet
 * - Bid Package / Contractor Packet
 * - Project Plan
 * - AI Reports
 * - Estimates & Proposals
 *
 * Layout: Logo (left) | Company + Employee Info (center) | Employee Headshot (right)
 *
 * Usage:
 *   import { drawBrandedHeader, fetchBrandingData } from "@/lib/pdf/brandedHeader";
 *   const branding = await fetchBrandingData(orgId, userId);
 *   const yAfterHeader = await drawBrandedHeader(doc, branding, { reportType: "Claims Packet" });
 */

import { jsPDF } from "jspdf";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ============================================================================
// Types
// ============================================================================

export interface BrandingData {
  // Company
  companyName: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyLicense?: string;
  logoUrl?: string;
  brandColor: string; // hex e.g. "#1e40af"

  // Employee / User
  employeeName?: string;
  employeeTitle?: string;
  employeePhone?: string;
  employeeEmail?: string;
  headshotUrl?: string;

  // Client (optional, for report sub-header)
  clientName?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  claimNumber?: string;
  policyNumber?: string;
}

export interface HeaderOptions {
  reportType: string; // e.g. "Claims Packet", "Bid Package", "Project Plan"
  reportTitle?: string; // Optional sub-title
  dateLabel?: string; // Default: "Generated: {date}"
  showAiDisclaimer?: boolean; // Default: true
}

// ============================================================================
// Data Fetcher
// ============================================================================

/**
 * Fetch complete branding data for PDF headers from the database.
 * Pulls from OrganizationBranding table + Clerk user profile.
 */
export async function fetchBrandingData(orgId: string, userId?: string): Promise<BrandingData> {
  try {
    // Fetch org branding
    const branding = await prisma.org_branding
      .findFirst({
        where: { orgId },
        select: {
          companyName: true,
          phone: true,
          email: true,
          website: true,
          license: true,
          logoUrl: true,
          colorPrimary: true,
          teamPhotoUrl: true,
        },
      })
      .catch(() => null);

    // Fetch org name fallback
    const org = await prisma.org
      .findUnique({
        where: { id: orgId },
        select: { name: true },
      })
      .catch(() => null);

    // Fetch user info if userId provided
    let userInfo: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      imageUrl?: string;
      title?: string;
    } = {};

    if (userId) {
      // Try to get user details from users table
      const user = await prisma.users
        .findFirst({
          where: { clerkUserId: userId },
          select: {
            id: true,
            name: true,
            email: true,
            headshot_url: true,
          },
        })
        .catch(() => null);

      let memberRole: string | null = null;
      if (user) {
        const membership = await prisma.user_organizations
          .findFirst({
            where: { userId: user.id, organizationId: orgId },
            select: { role: true },
          })
          .catch(() => null);
        memberRole = membership?.role || null;

        const nameParts = (user.name || "").split(" ");
        userInfo = {
          firstName: nameParts[0] || undefined,
          lastName: nameParts.slice(1).join(" ") || undefined,
          email: user.email || undefined,
          phone: undefined,
          imageUrl: user.headshot_url || undefined,
          title: memberRole
            ? memberRole.charAt(0).toUpperCase() + memberRole.slice(1).toLowerCase()
            : undefined,
        };
      }
    }

    const employeeName =
      [userInfo.firstName, userInfo.lastName].filter(Boolean).join(" ") || undefined;

    return {
      companyName: branding?.companyName || org?.name || "SkaiScraper",
      companyPhone: branding?.phone || undefined,
      companyEmail: branding?.email || undefined,
      companyWebsite: branding?.website || undefined,
      companyLicense: branding?.license || undefined,
      logoUrl: branding?.logoUrl || undefined,
      brandColor: branding?.colorPrimary || "#1e40af",
      employeeName,
      employeeTitle: userInfo.title,
      employeePhone: userInfo.phone || undefined,
      employeeEmail: userInfo.email || undefined,
      headshotUrl: branding?.teamPhotoUrl || userInfo.imageUrl || undefined,
    };
  } catch (error) {
    logger.error("[PDF_BRANDING] Failed to fetch branding data", error);
    return {
      companyName: "SkaiScraper",
      brandColor: "#1e40af",
    };
  }
}

// ============================================================================
// Header Drawing (jsPDF)
// ============================================================================

/**
 * Parse hex color to RGB values
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [30, 64, 175]; // Default blue
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

/**
 * Try to load an image and add it to the PDF.
 * Returns true if successful, false if image could not be loaded.
 */
async function tryAddImage(
  doc: jsPDF,
  url: string,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Detect format from URL or content-type
    const contentType = response.headers.get("content-type") || "";
    let format: "JPEG" | "PNG" = "PNG";
    if (contentType.includes("jpeg") || contentType.includes("jpg") || url.match(/\.jpe?g/i)) {
      format = "JPEG";
    }

    doc.addImage(`data:image/${format.toLowerCase()};base64,${base64}`, format, x, y, w, h);
    return true;
  } catch {
    return false;
  }
}

/**
 * Draw the branded header on a jsPDF document.
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
export async function drawBrandedHeader(
  doc: jsPDF,
  branding: BrandingData,
  options: HeaderOptions
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
    const loaded = await tryAddImage(doc, branding.logoUrl, logoX, logoY, logoSize, logoSize);
    if (loaded) {
      contentStartX = logoX + logoSize + 6;
    }
  }

  // If no logo loaded, use a colored circle with company initial
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

  // ── Employee headshot (right side) ──
  const headshotSize = 28;
  const headshotX = pageWidth - margin - headshotSize;
  const headshotY = 10;
  if (branding.headshotUrl) {
    const loaded = await tryAddImage(
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
  doc.text(companyLine, centerX, yPos, { maxWidth: contentEndX - centerX });
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
    doc.text(contactParts.join(" • "), centerX, yPos, { maxWidth: contentEndX - centerX });
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
    doc.text(employeeLine, centerX, yPos, { maxWidth: contentEndX - centerX });
    yPos += 4;
  }

  // Employee contact
  if (branding.employeePhone || branding.employeeEmail) {
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    const empContact: string[] = [];
    if (branding.employeePhone) empContact.push(branding.employeePhone);
    if (branding.employeeEmail) empContact.push(branding.employeeEmail);
    doc.text(empContact.join(" • "), centerX, yPos, { maxWidth: contentEndX - centerX });
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

  const dateStr =
    options.dateLabel ||
    `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(dateStr, pageWidth - margin, barY + 8, { align: "right" });

  // ── Client details sub-header (if available) ──
  let afterHeaderY = barY + 16;

  if (branding.clientName || branding.clientAddress || branding.claimNumber) {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(0, afterHeaderY - 2, pageWidth, 18, "F");

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");

    let clientLine = "";
    if (branding.clientName) clientLine += branding.clientName;
    if (branding.clientAddress) clientLine += ` | ${branding.clientAddress}`;
    if (clientLine) {
      doc.text(clientLine, margin, afterHeaderY + 5, { maxWidth: pageWidth - margin * 2 });
    }

    const refParts: string[] = [];
    if (branding.claimNumber) refParts.push(`Claim #: ${branding.claimNumber}`);
    if (branding.policyNumber) refParts.push(`Policy #: ${branding.policyNumber}`);
    if (refParts.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(refParts.join(" | "), margin, afterHeaderY + 11);
    }

    afterHeaderY += 20;
  }

  return afterHeaderY;
}

// ============================================================================
// Footer Drawing
// ============================================================================

/**
 * Draw the standard page footer with page number, generation date, and AI disclaimer.
 */
export function drawPageFooter(
  doc: jsPDF,
  options: { showAiDisclaimer?: boolean; companyName?: string } = {}
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Page number
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" });

    // Generation line
    doc.text(
      `Generated by ${options.companyName || "SkaiScraper"} · ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 4.5,
      { align: "center" }
    );

    // AI Disclaimer (only on last page, or all pages if desired)
    if (options.showAiDisclaimer !== false && i === totalPages) {
      doc.setFontSize(6.5);
      doc.setTextColor(180, 80, 80);
      doc.text(
        "⚠ AI can make mistakes — please read through the final report carefully before submission.",
        pageWidth / 2,
        pageHeight - 13,
        { align: "center" }
      );
    }
  }
}
