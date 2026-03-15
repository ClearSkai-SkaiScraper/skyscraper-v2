/**
 * DAMAGE REPORT GENERATOR v2 — Professional Inspection Packet
 *
 * Complete rewrite using:
 *  - Shared IRC code database (no more duplicate definitions)
 *  - Evidence grouping engine (deduplicated, ranked findings)
 *  - Professional caption generator (inspector-style, per damage type)
 *  - Damage color system (color-coded annotations by category)
 *  - Fixed photo loading (HEIC handling, retry, compression)
 *  - Annotation overflow prevention (max 5 per photo, short labels, clipping)
 *  - Clean page layout: Photo -> Findings Table -> Code -> Significance
 *
 * Generates:
 *  Cover Page -> Executive Summary -> Damage Color Legend -> Building Codes
 *  -> Photo Evidence Pages (with grouped/colored annotations + captions)
 *  -> Disclaimer & Certification
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";

import { apiError } from "@/lib/apiError";
import { requireAuth } from "@/lib/auth/requireAuth";
import { DAMAGE_COLORS, type DamageColor } from "@/lib/constants/irc-codes";
import { getAZCode, isArizonaJurisdiction } from "@/lib/constants/irc-codes-az";
import { generateCaption, type CaptionStyle } from "@/lib/inspection/caption-generator";
import {
  collectUniqueCodes,
  groupEvidence,
  type EvidenceCluster,
  type RawAnnotation,
} from "@/lib/inspection/evidence-grouping";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  calculateQualityMetrics,
  createReportTimer,
  recordReportMetrics,
} from "@/lib/reports/report-metrics";
import { saveReportHistory } from "@/lib/reports/saveReportHistory";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStormEvidence } from "@/lib/weather";

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT CONSTANTS — Print-safe page geometry
// ═══════════════════════════════════════════════════════════════════════════════
const PAGE_W = 612;
const PAGE_H = 792;

// Separate margins for fine-grained control
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const MARGIN_LEFT = 56;
const MARGIN_RIGHT = 56;
const MARGIN = MARGIN_LEFT; // backward compat alias

// Reserved zones
const HEADER_H = 20; // Top accent bar + spacing
const FOOTER_H = 28; // Footer text + rule line

// Safe content boundaries
const SAFE_CONTENT_Y_MAX = PAGE_H - MARGIN_TOP - HEADER_H; // Highest y for content
const SAFE_CONTENT_Y_MIN = MARGIN_BOTTOM + FOOTER_H; // Lowest y for content

const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;
const FOOTER_Y = 36;
const MAX_PHOTO_H = 320;
const MIN_PHOTO_H = 150;
const MAX_FINDINGS_PER_PAGE = 4;
const PAGE_BREAK_THRESHOLD = 160; // Start new page if < this much space remains

// Brand colours
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return rgb(
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255
  );
}

function damageColorToRgb(c: DamageColor) {
  return rgb(c.r, c.g, c.b);
}

/**
 * Sanitize text for WinAnsi PDF encoding.
 * Replaces characters that WinAnsi cannot encode with ASCII equivalents.
 */
function sanitizeForPDF(text: string): string {
  return text
    .replace(/≥/g, ">=") // greater-than-or-equal
    .replace(/≤/g, "<=") // less-than-or-equal
    .replace(/°/g, " degrees") // degree symbol
    .replace(/±/g, "+/-") // plus-minus
    .replace(/×/g, "x") // multiplication
    .replace(/÷/g, "/") // division
    .replace(/≈/g, "~") // approximately
    .replace(/≠/g, "!=") // not equal
    .replace(/∞/g, "infinity") // infinity
    .replace(/•/g, "-") // bullet
    .replace(/–/g, "-") // en-dash
    .replace(/—/g, "-") // em-dash
    .replace(/'/g, "'") // smart single quote left
    .replace(/'/g, "'") // smart single quote right
    .replace(/"/g, '"') // smart double quote left
    .replace(/"/g, '"') // smart double quote right
    .replace(/…/g, "...") // ellipsis
    .replace(/§/g, "S ") // section symbol
    .replace(/©/g, "(c)") // copyright
    .replace(/®/g, "(R)") // registered
    .replace(/™/g, "(TM)") // trademark
    .replace(/μ/g, "u") // micro
    .replace(/Ω/g, "Ohm"); // ohm
}

// Print-safe mode helpers (darker grays, larger min font, no edge-bleed)
const PRINT_SAFE_MIN_FONT = 8;
function printSafeSize(size: number, printSafe: boolean): number {
  return printSafe ? Math.max(size, PRINT_SAFE_MIN_FONT) : size;
}
function printSafeGray(lightness: number, printSafe: boolean) {
  // In print-safe mode, clamp light grays to be darker for legibility
  const clamped = printSafe ? Math.min(lightness, 0.45) : lightness;
  return rgb(clamped, clamped, clamped);
}

const RequestSchema = z.object({
  includePhotos: z.boolean().default(true),
  includeAnnotations: z.boolean().default(true),
  format: z.enum(["pdf"]).default("pdf"),
  captionStyle: z.enum(["full", "concise", "code-only"]).default("full"),
  photoOrder: z.enum(["claim-value", "upload-order", "severity"]).default("claim-value"),
  layout: z.enum(["single", "double"]).default("single"),
  printSafe: z.boolean().default(false),
  includeRepairability: z.boolean().default(true),
  includeBuildingCodes: z.boolean().default(true),
  // ── Preview Override Support ─────────────────────────────────────────
  // When a user edits findings in the DamageReportPreview, these overrides
  // are passed to the generator so the user's changes persist in the PDF.
  overrides: z
    .object({
      excludedPhotoIds: z.array(z.string()).default([]),
      captionOverrides: z.record(z.string(), z.record(z.string(), z.string())).default({}),
      severityOverrides: z.record(z.string(), z.record(z.string(), z.string())).default({}),
      evidenceTiers: z
        .record(z.string(), z.record(z.string(), z.enum(["primary", "supporting", "reference"])))
        .default({}),
    })
    .optional(),
});

interface RouteParams {
  params: Promise<{ claimId: string }>;
}

interface PhotoWithMetadata {
  id: string;
  filename: string;
  publicUrl: string;
  ai_caption: string | null;
  ai_severity: string | null;
  ai_confidence: number | null;
  metadata: {
    annotations?: RawAnnotation[];
    generatedCaption?: string;
    damageBoxes?: { x: number; y: number; w: number; h: number; label?: string }[];
  } | null;
}

// ============================================================================
//  PDF HELPERS
// ============================================================================

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  color = rgb(0.15, 0.15, 0.15),
  lineHeight = size + 4
): number {
  let y = startY;
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const tw = font.widthOfTextAtSize(testLine, size);
    if (tw > maxWidth && line) {
      page.drawText(line, { x, y, size, font, color });
      y -= lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}

function drawHR(page: PDFPage, y: number, color = rgb(0.82, 0.82, 0.82)) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 0.75,
    color,
  });
}

function drawFooter(
  page: PDFPage,
  pageNum: number,
  totalPages: number,
  font: PDFFont,
  companyName: string,
  primaryColor: ReturnType<typeof rgb>
) {
  page.drawLine({
    start: { x: MARGIN, y: FOOTER_Y + 14 },
    end: { x: PAGE_W - MARGIN, y: FOOTER_Y + 14 },
    thickness: 0.5,
    color: primaryColor,
    opacity: 0.3,
  });
  page.drawText(companyName, {
    x: MARGIN,
    y: FOOTER_Y,
    size: 7,
    font,
    color: rgb(0.55, 0.55, 0.55),
  });
  const pageLabel = `Page ${pageNum} of ${totalPages}`;
  const pw = font.widthOfTextAtSize(pageLabel, 7);
  page.drawText(pageLabel, {
    x: PAGE_W - MARGIN - pw,
    y: FOOTER_Y,
    size: 7,
    font,
    color: rgb(0.55, 0.55, 0.55),
  });
}

/** Safely fetch & embed image with HEIC detection and retry */
async function embedImageSafe(pdfDoc: PDFDocument, url: string): Promise<PDFImage | null> {
  if (!url) return null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        logger.warn("[DAMAGE_REPORT] Image fetch failed", { url, status: res.status, attempt });
        continue;
      }

      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length < 100) {
        logger.warn("[DAMAGE_REPORT] Image too small", { url, size: buf.length });
        return null;
      }

      // Check for HEIC magic bytes
      const header = String.fromCharCode(...buf.slice(4, 12));
      if (
        header.includes("ftyp") &&
        (header.includes("heic") || header.includes("heix") || header.includes("mif1"))
      ) {
        logger.warn("[DAMAGE_REPORT] HEIC image detected - not embeddable in PDF directly", {
          url,
        });
        return null;
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("png") || url.toLowerCase().endsWith(".png")) {
        try {
          return await pdfDoc.embedPng(buf);
        } catch {
          /* fall through */
        }
      }

      try {
        return await pdfDoc.embedJpg(buf);
      } catch {
        /* fall through */
      }
      try {
        return await pdfDoc.embedPng(buf);
      } catch {
        logger.warn("[DAMAGE_REPORT] Could not embed as JPG or PNG", { url, attempt });
      }
    } catch (e) {
      logger.warn("[DAMAGE_REPORT] Image fetch error", {
        url,
        error: (e as Error).message,
        attempt,
      });
    }
  }
  return null;
}

// ─── Page Geometry Helpers ────────────────────────────────────────────────────

/** Pre-measure wrapped text height for widow/orphan protection */
function measureWrappedTextHeight(
  text: string,
  maxWidth: number,
  font: PDFFont,
  size: number,
  lineHeight = size + 4
): number {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const tw = font.widthOfTextAtSize(testLine, size);
    if (tw > maxWidth && line) {
      lines++;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines++;
  return lines * lineHeight;
}

/** Estimate total height needed for a photo + its findings */
function estimatePhotoSectionHeight(
  clusterCount: number,
  photoLoaded: boolean,
  avgCaptionLines = 3
): number {
  let height = 36; // header + filename + spacing
  if (photoLoaded)
    height += MAX_PHOTO_H + 8; // photo + margin (tightened)
  else height += 80; // placeholder
  // Each finding: ~55px (number + severity + code + caption + separator — tightened)
  height += clusterCount * (26 + avgCaptionLines * 13 + 14);
  return height;
}

// Section header with left accent bar
function drawSectionHeader(
  page: PDFPage,
  y: number,
  title: string,
  font: PDFFont,
  primaryColor: ReturnType<typeof rgb>
): number {
  page.drawRectangle({
    x: MARGIN - 4,
    y: y - 5,
    width: CONTENT_W + 8,
    height: 24,
    color: rgb(0.95, 0.96, 0.97),
  });
  page.drawRectangle({
    x: MARGIN - 4,
    y: y - 5,
    width: 3,
    height: 24,
    color: primaryColor,
  });
  page.drawText(title, {
    x: MARGIN + 4,
    y: y + 1,
    size: 12,
    font,
    color: primaryColor,
  });
  return y - 28;
}

// ============================================================================
//  MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId, userId } = auth;
  const { claimId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const options = RequestSchema.parse(body);

    // Fetch claim, branding, user, storm evidence in parallel
    const [claim, branding, user, stormEvidence] = await Promise.all([
      prisma.claims.findFirst({
        where: { id: claimId, orgId },
        select: {
          id: true,
          claimNumber: true,
          dateOfLoss: true,
          carrier: true,
          policy_number: true,
          insured_name: true,
          homeownerEmail: true,
          homeowner_email: true,
          adjusterName: true,
          adjusterPhone: true,
          adjusterEmail: true,
          damageType: true,
          properties: { select: { street: true, city: true, state: true, zipCode: true } },
        },
      }),
      prisma.org_branding.findFirst({ where: { orgId } }).catch(() => null),
      // Fetch current user first, then check for org default inspector
      prisma.users
        .findFirst({
          where: { clerkUserId: userId, orgId },
          select: {
            name: true,
            email: true,
            headshot_url: true,
            title: true,
            phone: true,
            license_number: true,
            license_state: true,
            certifications: true,
            is_default_inspector: true,
          },
        })
        .then(async (u) => {
          // If user found, return it
          if (u?.name) return u;
          // Fallback: try by id instead of clerkUserId
          const fallback = await prisma.users.findFirst({
            where: { id: userId },
            select: {
              name: true,
              email: true,
              headshot_url: true,
              title: true,
              phone: true,
              license_number: true,
              license_state: true,
              certifications: true,
              is_default_inspector: true,
            },
          });
          return fallback;
        }),
      // Fetch storm evidence (canonical weather intelligence layer)
      getStormEvidence(claimId).catch(() => null),
    ]);

    if (!claim) return apiError(404, "NOT_FOUND", "Claim not found");

    const propertyAddress = claim.properties
      ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state} ${claim.properties.zipCode}`
      : null;

    const companyName = branding?.companyName || "Storm Restoration Report";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyLocation: string | null =
      (branding as any)?.companyAddress || branding?.business_state || null;
    const primaryColor = branding?.colorPrimary
      ? hexToRgb(branding.colorPrimary)
      : rgb(0.067, 0.486, 1);

    // Fetch analyzed photos
    const photos = (await prisma.file_assets.findMany({
      where: { orgId, claimId, mimeType: { startsWith: "image/" }, analyzed_at: { not: null } },
      select: {
        id: true,
        filename: true,
        publicUrl: true,
        ai_caption: true,
        ai_severity: true,
        ai_confidence: true,
        metadata: true,
      },
      orderBy: { createdAt: "asc" },
    })) as PhotoWithMetadata[];

    // Apply preview overrides — filter excluded photos
    const overrides = options.overrides;
    const filteredPhotos = overrides?.excludedPhotoIds?.length
      ? photos.filter((p) => !overrides.excludedPhotoIds.includes(p.id))
      : photos;

    if (filteredPhotos.length === 0)
      return apiError(400, "NO_PHOTOS", "No analyzed photos found for this claim");

    // Evidence grouping for ALL photos
    const photoClusterMap = new Map<string, EvidenceCluster[]>();
    const eventType = claim.damageType?.replace(/_/g, " ") || "storm";
    const captionStyleOpt = options.captionStyle as CaptionStyle;
    const reportTimer = createReportTimer();

    for (const photo of filteredPhotos) {
      const rawAnnotations = (photo.metadata?.annotations || []) as RawAnnotation[];
      const clusters = groupEvidence(rawAnnotations, 5, 0.15);
      const captionedClusters = clusters.map((cluster, idx) => {
        const photoOverrides = overrides?.captionOverrides?.[photo.id];
        const severityOvr = overrides?.severityOverrides?.[photo.id];
        const tierOvr = overrides?.evidenceTiers?.[photo.id];
        const overriddenCaption = photoOverrides?.[String(idx)];
        const overriddenSeverity = severityOvr?.[String(idx)];
        const evidenceTier = tierOvr?.[String(idx)] || "primary";

        return {
          ...cluster,
          ...(overriddenSeverity ? { severity: overriddenSeverity } : {}),
          evidenceTier,
          caption:
            overriddenCaption ||
            (cluster.caption && cluster.caption.length > 30
              ? cluster.caption
              : generateCaption(cluster, {
                  eventType,
                  variationIndex: idx,
                  captionStyle: captionStyleOpt,
                  includeRepairability: options.includeRepairability,
                })),
        };
      });
      photoClusterMap.set(photo.id, captionedClusters);
    }

    // Collect all clusters for metrics calculation
    const allClusters: EvidenceCluster[] = [];
    for (const clusters of photoClusterMap.values()) {
      allClusters.push(...clusters);
    }

    // Sort photos by selected order
    if (options.photoOrder === "claim-value") {
      filteredPhotos.sort((a, b) => {
        const aClusters = photoClusterMap.get(a.id) || [];
        const bClusters = photoClusterMap.get(b.id) || [];
        const aMax = aClusters.length > 0 ? Math.max(...aClusters.map((c) => c.score)) : 0;
        const bMax = bClusters.length > 0 ? Math.max(...bClusters.map((c) => c.score)) : 0;
        return bMax - aMax;
      });
    } else if (options.photoOrder === "severity") {
      const sevOrder: Record<string, number> = { severe: 3, moderate: 2, minor: 1 };
      filteredPhotos.sort(
        (a, b) =>
          (sevOrder[b.ai_severity || "minor"] || 0) - (sevOrder[a.ai_severity || "minor"] || 0)
      );
    }
    // "upload-order" = default DB order, no sort needed

    // AZ-specific codes overlay
    const propertyState = claim.properties?.state || null;
    const isAZ = isArizonaJurisdiction(propertyState);

    const uniqueCodes = collectUniqueCodes(photoClusterMap);

    // Severity counts
    const severeCnt = filteredPhotos.filter((p) => p.ai_severity === "severe").length;
    const moderateCnt = filteredPhotos.filter((p) => p.ai_severity === "moderate").length;
    const minorCnt = filteredPhotos.filter((p) => p.ai_severity === "minor").length;
    const overallSeverity = severeCnt > 0 ? "SEVERE" : moderateCnt > 0 ? "MODERATE" : "MINOR";

    let totalFindings = 0;
    for (const clusters of photoClusterMap.values()) totalFindings += clusters.length;

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`Damage Assessment Report - ${claim.claimNumber || claimId}`);
    pdfDoc.setAuthor(companyName);
    pdfDoc.setSubject("Professional Property Damage Assessment");
    pdfDoc.setCreator("SkaiScraper Pro - AI Inspection Engine");

    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages: PDFPage[] = [];
    function newPage() {
      const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pages.push(p);
      return p;
    }

    let logoImage: PDFImage | null = null;
    let headshotImage: PDFImage | null = null;
    if (branding?.logoUrl) logoImage = await embedImageSafe(pdfDoc, branding.logoUrl);
    if (user?.headshot_url) headshotImage = await embedImageSafe(pdfDoc, user.headshot_url);

    // =========================================================================
    //  PAGE 1 - COVER PAGE
    // =========================================================================
    let page = newPage();
    let y = PAGE_H - MARGIN;

    // Top accent bar
    page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: primaryColor });

    // Company logo + name
    let headerY = y - 10;
    if (logoImage) {
      const logoDims = logoImage.scaleToFit(120, 60);
      page.drawImage(logoImage, {
        x: MARGIN,
        y: headerY - logoDims.height + 10,
        width: logoDims.width,
        height: logoDims.height,
      });
      const textX = MARGIN + logoDims.width + 16;
      page.drawText(companyName.toUpperCase(), {
        x: textX,
        y: headerY - 2,
        size: 18,
        font: helveticaBold,
        color: primaryColor,
      });
      if (companyLocation) {
        page.drawText(companyLocation, {
          x: textX,
          y: headerY - 18,
          size: 9,
          font: helvetica,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
    } else {
      page.drawText(companyName.toUpperCase(), {
        x: MARGIN,
        y: headerY,
        size: 22,
        font: helveticaBold,
        color: primaryColor,
      });
      if (companyLocation) {
        page.drawText(companyLocation, {
          x: MARGIN,
          y: headerY - 20,
          size: 9,
          font: helvetica,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
    }

    // Contact row
    headerY -= companyLocation ? 85 : 75;
    const contactParts: string[] = [];
    if (branding?.phone) contactParts.push(branding.phone);
    if (branding?.email) contactParts.push(branding.email);
    if (branding?.website) contactParts.push(branding.website);
    if (branding?.license) contactParts.push(`Lic# ${branding.license}`);
    if (contactParts.length > 0) {
      page.drawText(contactParts.join("  |  "), {
        x: MARGIN,
        y: headerY,
        size: 8,
        font: helvetica,
        color: rgb(0.45, 0.45, 0.45),
      });
      headerY -= 14;
    }
    drawHR(page, headerY);
    y = headerY - 30;

    // Report Title
    page.drawText("DAMAGE ASSESSMENT REPORT", {
      x: MARGIN,
      y,
      size: 24,
      font: timesBold,
      color: rgb(0.1, 0.1, 0.15),
    });
    y -= 35;

    // Client Information
    const labelColor = rgb(0.45, 0.45, 0.45);
    const valueColor = rgb(0.1, 0.1, 0.1);
    const detailValX = MARGIN + 140;

    y = drawSectionHeader(page, y, "CLIENT INFORMATION", helveticaBold, primaryColor);
    y += 10;

    const clientDetails: [string, string][] = [];
    if (claim.insured_name) clientDetails.push(["Insured Name", claim.insured_name]);
    if (propertyAddress) clientDetails.push(["Property Address", propertyAddress]);
    const clientEmail = claim.homeowner_email || claim.homeownerEmail;
    if (clientEmail) clientDetails.push(["Contact Email", clientEmail]);

    if (clientDetails.length > 0) {
      for (const [label, value] of clientDetails) {
        page.drawText(label + ":", {
          x: MARGIN + 8,
          y,
          size: 10,
          font: helveticaBold,
          color: labelColor,
        });
        const valWidth = CONTENT_W - 156;
        const textWidth = helvetica.widthOfTextAtSize(value, 10);
        if (textWidth > valWidth) {
          y = drawWrappedText(page, value, detailValX, y, valWidth, helvetica, 10, valueColor, 14);
        } else {
          page.drawText(value, { x: detailValX, y, size: 10, font: helvetica, color: valueColor });
          y -= 18;
        }
      }
    } else {
      page.drawText("Client information not available", {
        x: MARGIN + 8,
        y,
        size: 10,
        font: helvetica,
        color: labelColor,
      });
      y -= 18;
    }
    y -= 12;

    // Claim Details
    y = drawSectionHeader(page, y, "CLAIM DETAILS", helveticaBold, primaryColor);
    y += 10;

    const claimDetailRows: [string, string][] = [["Claim Number", claim.claimNumber || claimId]];
    if (claim.dateOfLoss) {
      claimDetailRows.push([
        "Date of Loss",
        new Date(claim.dateOfLoss).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      ]);
    }
    if (claim.carrier) claimDetailRows.push(["Insurance Carrier", claim.carrier]);
    if (claim.policy_number) claimDetailRows.push(["Policy Number", claim.policy_number]);
    if (claim.adjusterName) {
      let adjusterInfo = claim.adjusterName;
      if (claim.adjusterPhone) adjusterInfo += ` | ${claim.adjusterPhone}`;
      claimDetailRows.push(["Adjuster", adjusterInfo]);
    }
    if (claim.damageType) {
      claimDetailRows.push([
        "Damage Type",
        claim.damageType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      ]);
    }
    claimDetailRows.push([
      "Report Date",
      new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    ]);
    claimDetailRows.push(["Photos Analyzed", String(filteredPhotos.length)]);
    claimDetailRows.push(["Findings Documented", String(totalFindings)]);
    claimDetailRows.push(["Overall Severity", overallSeverity]);

    for (const [label, value] of claimDetailRows) {
      page.drawText(label + ":", {
        x: MARGIN + 8,
        y,
        size: 10,
        font: helveticaBold,
        color: labelColor,
      });
      page.drawText(value, { x: detailValX, y, size: 10, font: helvetica, color: valueColor });
      y -= 18;
    }
    y -= 10;

    // Prepared By
    drawHR(page, y + 4);
    y -= 20;
    y = drawSectionHeader(page, y, "PREPARED BY", helveticaBold, primaryColor);
    y += 10;

    const inspectorTextX = headshotImage ? MARGIN + 70 : MARGIN + 8;
    if (headshotImage) {
      const hdDims = headshotImage.scaleToFit(55, 55);
      page.drawRectangle({
        x: MARGIN + 6,
        y: y - hdDims.height - 2,
        width: hdDims.width + 4,
        height: hdDims.height + 4,
        borderColor: rgb(0.82, 0.82, 0.82),
        borderWidth: 1,
        color: rgb(0.97, 0.97, 0.97),
      });
      page.drawImage(headshotImage, {
        x: MARGIN + 8,
        y: y - hdDims.height,
        width: hdDims.width,
        height: hdDims.height,
      });
    }
    page.drawText(companyName, {
      x: inspectorTextX,
      y,
      size: 13,
      font: helveticaBold,
      color: primaryColor,
    });
    y -= 18;
    // Inspector name — use real profile data
    const inspectorName = user?.name || "Inspector";
    const inspectorTitle = (user as any)?.title || "Certified Roof Inspector";
    const inspectorPhone = (user as any)?.phone || null;
    const inspectorLicense = (user as any)?.license_number || branding?.license || null;
    const inspectorLicenseState = (user as any)?.license_state || null;
    const inspectorCerts = (user as any)?.certifications || [];

    page.drawText(inspectorName, {
      x: inspectorTextX,
      y,
      size: 11,
      font: helveticaBold,
      color: valueColor,
    });
    y -= 15;
    page.drawText(inspectorTitle, {
      x: inspectorTextX,
      y,
      size: 9,
      font: helvetica,
      color: labelColor,
    });
    y -= 13;
    if (user?.email) {
      page.drawText(user.email, {
        x: inspectorTextX,
        y,
        size: 9,
        font: helvetica,
        color: labelColor,
      });
      y -= 13;
    }
    if (inspectorPhone) {
      page.drawText(inspectorPhone, {
        x: inspectorTextX,
        y,
        size: 9,
        font: helvetica,
        color: labelColor,
      });
      y -= 13;
    }
    if (inspectorLicense) {
      const licenseText = inspectorLicenseState
        ? `License: ${inspectorLicense} (${inspectorLicenseState})`
        : `License: ${inspectorLicense}`;
      page.drawText(licenseText, {
        x: inspectorTextX,
        y,
        size: 9,
        font: helvetica,
        color: labelColor,
      });
      y -= 13;
    }
    // Show certifications if present
    const certList = Array.isArray(inspectorCerts) ? inspectorCerts : [];
    if (certList.length > 0) {
      const certStr = certList.slice(0, 3).join(" | ");
      page.drawText(certStr, {
        x: inspectorTextX,
        y,
        size: 8,
        font: helvetica,
        color: rgb(0.45, 0.55, 0.45),
      });
    }

    // =========================================================================
    //  PAGE 2 - EXECUTIVE SUMMARY
    // =========================================================================
    page = newPage();
    y = PAGE_H - MARGIN - 10;
    page.drawRectangle({ x: 0, y: PAGE_H - 4, width: PAGE_W, height: 4, color: primaryColor });

    y = drawSectionHeader(page, y, "EXECUTIVE SUMMARY", helveticaBold, primaryColor);

    const damageTypes = new Set<string>();
    for (const clusters of photoClusterMap.values()) {
      for (const c of clusters) damageTypes.add(c.color.label.toLowerCase());
    }

    const summaryText = `This report documents the findings of a comprehensive property damage assessment conducted at ${
      propertyAddress || "the insured property"
    } in accordance with HAAG Engineering inspection standards. A total of ${filteredPhotos.length} photograph${photos.length > 1 ? "s were" : " was"} captured and analyzed using AI-powered damage detection technology calibrated to HAAG-certified damage identification criteria. After evidence grouping and deduplication, ${totalFindings} distinct damage finding${totalFindings !== 1 ? "s were" : " was"} identified across ${photoClusterMap.size} inspection area${photoClusterMap.size !== 1 ? "s" : ""}. The analysis identified ${
      severeCnt > 0
        ? `${severeCnt} area${severeCnt > 1 ? "s" : ""} of severe/functional damage`
        : moderateCnt > 0
          ? `${moderateCnt} area${moderateCnt > 1 ? "s" : ""} of moderate damage requiring repair`
          : `${minorCnt} area${minorCnt > 1 ? "s" : ""} of minor/cosmetic damage`
    }${damageTypes.size > 0 ? `, including documented evidence of ${[...damageTypes].slice(0, 4).join(", ")} damage` : ""}.${
      claim.dateOfLoss
        ? ` The reported date of loss was ${new Date(claim.dateOfLoss).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`
        : ""
    }`;

    y = drawWrappedText(
      page,
      summaryText,
      MARGIN,
      y,
      CONTENT_W,
      timesRoman,
      10.5,
      rgb(0.15, 0.15, 0.15),
      16
    );
    y -= 10;

    const justificationText = `Based on the documented evidence and HAAG Engineering damage identification standards, the property has sustained functional damage that meets the threshold for insurance claim consideration per applicable IRC/IBC building codes. Each photograph has been individually analyzed for damage type, severity classification, and applicable building code compliance. The findings in this report substantiate the need for professional restoration to return the property to its pre-loss condition in accordance with applicable building codes and manufacturer installation specifications.`;
    y = drawWrappedText(
      page,
      justificationText,
      MARGIN,
      y,
      CONTENT_W,
      timesRoman,
      10.5,
      rgb(0.15, 0.15, 0.15),
      16
    );
    y -= 25;

    // =========================================================================
    //  WEATHER & STORM VERIFICATION SECTION (using storm_evidence)
    // =========================================================================
    if (stormEvidence) {
      const wxPeril = stormEvidence.primaryPeril || "Storm";
      const topEvents = (stormEvidence.topEvents || []) as Array<{
        type?: string;
        magnitude?: number;
        source?: string;
        timeUtc?: string;
      }>;
      const photoCorrelation = stormEvidence.correlationScore ?? 0;
      const dolConfidence = stormEvidence.dolConfidence ?? 0;

      // Check if we need a new page
      if (y < 250) {
        page = newPage();
        y = PAGE_H - MARGIN - 10;
        page.drawRectangle({ x: 0, y: PAGE_H - 4, width: PAGE_W, height: 4, color: primaryColor });
      }

      y = drawSectionHeader(page, y, "WEATHER & STORM VERIFICATION", helveticaBold, primaryColor);

      // Storm details box
      const wxBoxY = y;
      const wxBoxH = 70;
      page.drawRectangle({
        x: MARGIN,
        y: wxBoxY - wxBoxH,
        width: CONTENT_W,
        height: wxBoxH,
        color: rgb(0.94, 0.96, 0.98),
        borderColor: rgb(0.8, 0.85, 0.9),
        borderWidth: 0.5,
      });

      // DOL confidence label
      const dolConfidenceLabel =
        dolConfidence >= 0.8 ? "HIGH" : dolConfidence >= 0.5 ? "MEDIUM" : "LOW";

      const wxDetails: [string, string][] = [
        [
          "Storm Date:",
          stormEvidence.selectedDOL
            ? new Date(stormEvidence.selectedDOL).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "Under investigation",
        ],
        [
          "Primary Peril:",
          wxPeril.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        ],
        [
          "Verification:",
          topEvents.length > 0
            ? `${topEvents.length} storm event${topEvents.length > 1 ? "s" : ""} confirmed`
            : "AI weather analysis completed",
        ],
        ["DOL Confidence:", `${dolConfidenceLabel} (${Math.round(dolConfidence * 100)}%)`],
      ];

      // Add hail/wind from storm evidence
      if (stormEvidence.hailSizeInches)
        wxDetails.push(["Hail Size:", `${stormEvidence.hailSizeInches} inch diameter`]);
      if (stormEvidence.windSpeedMph)
        wxDetails.push(["Wind Speed:", `${stormEvidence.windSpeedMph} mph`]);

      // Photo correlation score
      if (photoCorrelation > 0)
        wxDetails.push([
          "Photo Correlation:",
          `${Math.round(photoCorrelation * 100)}% of photos within storm window`,
        ]);

      let wxY = wxBoxY - 14;
      const wxCol1X = MARGIN + 12;
      const wxCol2X = MARGIN + 120;
      const wxCol3X = MARGIN + CONTENT_W / 2 + 10;
      const wxCol4X = MARGIN + CONTENT_W / 2 + 120;

      for (let di = 0; di < wxDetails.length; di++) {
        const col = di < 3 ? 0 : 1;
        const row = di < 3 ? di : di - 3;
        const labelX = col === 0 ? wxCol1X : wxCol3X;
        const valueX = col === 0 ? wxCol2X : wxCol4X;
        const rowY = wxY - row * 18;

        page.drawText(wxDetails[di][0], {
          x: labelX,
          y: rowY,
          size: 9,
          font: helveticaBold,
          color: rgb(0.3, 0.3, 0.3),
        });
        page.drawText(wxDetails[di][1], {
          x: valueX,
          y: rowY,
          size: 9,
          font: helvetica,
          color: rgb(0.15, 0.15, 0.15),
        });
      }

      y = wxBoxY - wxBoxH - 12;

      // Weather narrative from AI-generated summary
      const wxNarrative = stormEvidence.aiNarrative || null;
      if (wxNarrative) {
        y = drawWrappedText(
          page,
          String(wxNarrative).slice(0, 500),
          MARGIN,
          y,
          CONTENT_W,
          timesRoman,
          10,
          rgb(0.2, 0.2, 0.2),
          15
        );
        y -= 8;
      }

      // Evidence grade badge
      if (stormEvidence.evidenceGrade) {
        const gradeColors: Record<string, ReturnType<typeof rgb>> = {
          A: rgb(0.13, 0.55, 0.13),
          B: rgb(0.2, 0.6, 0.2),
          C: rgb(0.8, 0.6, 0.0),
          D: rgb(0.85, 0.4, 0.1),
          F: rgb(0.75, 0.15, 0.15),
        };
        const gradeColor = gradeColors[stormEvidence.evidenceGrade] || rgb(0.5, 0.5, 0.5);
        page.drawText(
          `Storm Evidence Grade: ${stormEvidence.evidenceGrade} (${stormEvidence.overallScore ?? 0}/100)`,
          {
            x: MARGIN,
            y,
            size: 9,
            font: helveticaBold,
            color: gradeColor,
          }
        );
        y -= 16;
      }

      // Source attribution
      page.drawText(
        "Source: NOAA Storm Reports, NWS, Iowa State Mesonet, SkaiScraper Weather Intelligence",
        {
          x: MARGIN,
          y,
          size: 7.5,
          font: timesItalic || timesRoman,
          color: rgb(0.5, 0.5, 0.5),
        }
      );
      y -= 25;
    }

    // Severity Breakdown
    y = drawSectionHeader(page, y, "DAMAGE SEVERITY BREAKDOWN", helveticaBold, primaryColor);

    const severityRows: [string, number, ReturnType<typeof rgb>][] = [];
    if (severeCnt > 0) severityRows.push(["Severe", severeCnt, rgb(0.85, 0.15, 0.15)]);
    if (moderateCnt > 0) severityRows.push(["Moderate", moderateCnt, rgb(0.9, 0.55, 0.1)]);
    if (minorCnt > 0) severityRows.push(["Minor", minorCnt, rgb(0.2, 0.7, 0.3)]);
    const noneCnt = filteredPhotos.length - severeCnt - moderateCnt - minorCnt;
    if (noneCnt > 0) severityRows.push(["Informational", noneCnt, rgb(0.55, 0.55, 0.55)]);

    for (const [label, count, color] of severityRows) {
      const barWidth = Math.min(
        (count / filteredPhotos.length) * (CONTENT_W - 140),
        CONTENT_W - 140
      );
      page.drawRectangle({
        x: MARGIN + 120,
        y: y - 2,
        width: barWidth,
        height: 14,
        color,
        opacity: 0.15,
      });
      page.drawRectangle({
        x: MARGIN + 120,
        y: y - 2,
        width: barWidth,
        height: 14,
        borderColor: color,
        borderWidth: 1,
        color: rgb(1, 1, 1),
        opacity: 0,
      });
      page.drawText(label, { x: MARGIN, y, size: 10, font: helveticaBold, color });
      page.drawText(`${count} photo${count > 1 ? "s" : ""}`, {
        x: MARGIN + 125,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 24;
    }

    // Damage Color Legend
    y -= 10;
    y = drawSectionHeader(page, y, "DAMAGE CATEGORY LEGEND", helveticaBold, primaryColor);

    const usedColors = new Set<string>();
    for (const clusters of photoClusterMap.values()) {
      for (const c of clusters) usedColors.add(c.color.hex);
    }
    const legendItems = Object.values(DAMAGE_COLORS).filter((c) => usedColors.has(c.hex));
    const colWidth = CONTENT_W / 2;

    for (let li = 0; li < legendItems.length; li++) {
      const col = li % 2;
      const legendX = MARGIN + col * colWidth;
      if (col === 0 && li > 0) y -= 20;

      page.drawRectangle({
        x: legendX,
        y: y - 3,
        width: 14,
        height: 14,
        color: damageColorToRgb(legendItems[li]),
      });
      page.drawText(legendItems[li].label, {
        x: legendX + 20,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
      });
    }
    if (legendItems.length % 2 === 1) y -= 20;
    else y -= 20;

    // Applicable Building Codes
    if (uniqueCodes.size > 0 && options.includeBuildingCodes) {
      y -= 10;
      if (y < 200) {
        page = newPage();
        y = PAGE_H - MARGIN - 10;
        page.drawRectangle({ x: 0, y: PAGE_H - 4, width: PAGE_W, height: 4, color: primaryColor });
      }
      const codesTitle = isAZ
        ? "APPLICABLE BUILDING CODES (ARIZONA AMENDMENTS)"
        : "APPLICABLE BUILDING CODES";
      y = drawSectionHeader(page, y, codesTitle, helveticaBold, primaryColor);

      for (const [codeKey, codeInfo] of uniqueCodes) {
        if (y < PAGE_BREAK_THRESHOLD) {
          page = newPage();
          y = PAGE_H - MARGIN - 10;
          page.drawRectangle({
            x: 0,
            y: PAGE_H - 4,
            width: PAGE_W,
            height: 4,
            color: primaryColor,
          });
        }
        // Use AZ-specific code when applicable
        const displayCode = isAZ ? getAZCode(codeKey, propertyState) || codeInfo : codeInfo;
        // Sanitize text for WinAnsi PDF encoding
        const safeCodeTitle = sanitizeForPDF(`${displayCode.code}  -  ${displayCode.title}`);
        const safeCodeText = sanitizeForPDF(displayCode.text);
        page.drawText(safeCodeTitle, {
          x: MARGIN,
          y,
          size: 10,
          font: helveticaBold,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 14;
        y = drawWrappedText(
          page,
          safeCodeText,
          MARGIN + 10,
          y,
          CONTENT_W - 10,
          timesRoman,
          9,
          rgb(0.35, 0.35, 0.35),
          13
        );
        y -= 8;
      }
    }

    // =========================================================================
    //  PHOTO EVIDENCE PAGES
    // =========================================================================
    for (let i = 0; i < filteredPhotos.length; i++) {
      const photo = filteredPhotos[i];
      const clusters = photoClusterMap.get(photo.id) || [];

      page = newPage();
      y = PAGE_H - MARGIN - 10;
      page.drawRectangle({ x: 0, y: PAGE_H - 4, width: PAGE_W, height: 4, color: primaryColor });

      // Report header on evidence pages
      const reportHeaderText = claim.claimNumber
        ? `Claim #${claim.claimNumber}`
        : "Damage Assessment";
      const reportHeaderW = helvetica.widthOfTextAtSize(reportHeaderText, 8);
      page.drawText(reportHeaderText, {
        x: PAGE_W - MARGIN_RIGHT - reportHeaderW,
        y: PAGE_H - MARGIN_TOP + 6,
        size: 8,
        font: helvetica,
        color: rgb(0.55, 0.55, 0.55),
      });

      // Photo page header with severity badge
      page.drawText(`PHOTO EVIDENCE  ${i + 1} / ${filteredPhotos.length}`, {
        x: MARGIN,
        y,
        size: 12,
        font: helveticaBold,
        color: primaryColor,
      });
      if (photo.ai_severity) {
        const sevColor =
          photo.ai_severity === "severe"
            ? rgb(0.85, 0.15, 0.15)
            : photo.ai_severity === "moderate"
              ? rgb(0.9, 0.55, 0.1)
              : rgb(0.2, 0.7, 0.3);
        const sevLabel = photo.ai_severity.toUpperCase();
        const headerTextW = helveticaBold.widthOfTextAtSize(
          `PHOTO EVIDENCE  ${i + 1} / ${filteredPhotos.length}`,
          12
        );
        const sevW = helveticaBold.widthOfTextAtSize(sevLabel, 9);
        page.drawRectangle({
          x: MARGIN + headerTextW + 16,
          y: y - 2,
          width: sevW + 12,
          height: 16,
          color: sevColor,
          opacity: 0.15,
        });
        page.drawText(sevLabel, {
          x: MARGIN + headerTextW + 22,
          y: y + 1,
          size: 9,
          font: helveticaBold,
          color: sevColor,
        });
      }
      y -= 6;
      drawHR(page, y);
      y -= 16;

      // Filename
      page.drawText(photo.filename, {
        x: MARGIN,
        y,
        size: 7.5,
        font: helvetica,
        color: rgb(0.55, 0.55, 0.55),
      });
      y -= 16;

      // Embed photo
      if (options.includePhotos && photo.publicUrl) {
        const img = await embedImageSafe(pdfDoc, photo.publicUrl);
        if (img) {
          const dims = img.scaleToFit(CONTENT_W, MAX_PHOTO_H);
          const imgX = MARGIN + (CONTENT_W - dims.width) / 2;

          // Photo border
          page.drawRectangle({
            x: imgX - 2,
            y: y - dims.height - 2,
            width: dims.width + 4,
            height: dims.height + 4,
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 1,
            color: rgb(0.97, 0.97, 0.97),
          });
          page.drawImage(img, {
            x: imgX,
            y: y - dims.height,
            width: dims.width,
            height: dims.height,
          });

          // Draw color-coded annotation shapes with numbered callouts
          if (options.includeAnnotations && clusters.length > 0) {
            for (let ci = 0; ci < clusters.length; ci++) {
              const cluster = clusters[ci];
              const box = cluster.bbox;
              const clrRgb = damageColorToRgb(cluster.color);

              const bx = imgX + box.x * dims.width;
              const by = y - dims.height + (1 - box.y - box.h) * dims.height;
              const bw = Math.max(box.w * dims.width, 10);
              const bh = Math.max(box.h * dims.height, 10);

              // Clamp to image bounds
              const clampedBx = Math.max(imgX, Math.min(imgX + dims.width - bw, bx));
              const clampedBy = Math.max(y - dims.height, Math.min(y - bh, by));

              // Shape-type-aware annotation rendering
              const shapeType = cluster.shapeType || "rectangle";

              if (shapeType === "circle") {
                // Ellipse for point-source damage (hail dents, punctures)
                const cx = clampedBx + bw / 2;
                const cy = clampedBy + bh / 2;
                const rx = bw / 2;
                const ry = bh / 2;
                page.drawEllipse({
                  x: cx,
                  y: cy,
                  xScale: rx,
                  yScale: ry,
                  borderColor: clrRgb,
                  borderWidth: 2,
                  color: clrRgb,
                  opacity: 0.08,
                  borderOpacity: 1,
                });
              } else if (shapeType === "outline") {
                // Dashed outline for area damage (discoloration, wear patterns)
                // Draw dashed border with segments
                const dashLen = 6;
                const gapLen = 4;
                const drawDashedLine = (x1: number, y1: number, x2: number, y2: number) => {
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  const steps = Math.floor(len / (dashLen + gapLen));
                  for (let s = 0; s < steps; s++) {
                    const t0 = (s * (dashLen + gapLen)) / len;
                    const t1 = Math.min((s * (dashLen + gapLen) + dashLen) / len, 1);
                    page.drawLine({
                      start: { x: x1 + dx * t0, y: y1 + dy * t0 },
                      end: { x: x1 + dx * t1, y: y1 + dy * t1 },
                      thickness: 2,
                      color: clrRgb,
                    });
                  }
                };
                // Top, right, bottom, left
                drawDashedLine(clampedBx, clampedBy + bh, clampedBx + bw, clampedBy + bh);
                drawDashedLine(clampedBx + bw, clampedBy + bh, clampedBx + bw, clampedBy);
                drawDashedLine(clampedBx + bw, clampedBy, clampedBx, clampedBy);
                drawDashedLine(clampedBx, clampedBy, clampedBx, clampedBy + bh);
              } else {
                // Default: solid rectangle (granular damage, cracking, missing components)
                page.drawRectangle({
                  x: clampedBx,
                  y: clampedBy,
                  width: bw,
                  height: bh,
                  borderColor: clrRgb,
                  borderWidth: 2,
                  color: clrRgb,
                  opacity: 0.08,
                });
              }

              // Numbered callout circle at top-right of box
              const calloutR = 8;
              const calloutX = Math.min(clampedBx + bw + 2, imgX + dims.width - calloutR);
              const calloutY = clampedBy + bh - calloutR;
              page.drawCircle({
                x: calloutX + calloutR,
                y: calloutY + calloutR,
                size: calloutR,
                color: clrRgb,
              });
              const numStr = String(ci + 1);
              const numW = helveticaBold.widthOfTextAtSize(numStr, 8);
              page.drawText(numStr, {
                x: calloutX + calloutR - numW / 2,
                y: calloutY + calloutR - 3,
                size: 8,
                font: helveticaBold,
                color: rgb(1, 1, 1),
              });
            }
          }
          y -= dims.height + 8;
        } else {
          // Photo placeholder
          page.drawRectangle({
            x: MARGIN,
            y: y - 60,
            width: CONTENT_W,
            height: 60,
            color: rgb(0.95, 0.95, 0.95),
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 1,
          });
          page.drawText("[Photo could not be loaded - may be HEIC format]", {
            x: MARGIN + CONTENT_W / 2 - 120,
            y: y - 35,
            size: 9,
            font: helvetica,
            color: rgb(0.6, 0.6, 0.6),
          });
          y -= 80;
        }
      }

      // Findings Table with widow/orphan protection
      if (clusters.length > 0) {
        if (y < PAGE_BREAK_THRESHOLD) {
          page = newPage();
          y = PAGE_H - MARGIN - 10;
          page.drawRectangle({
            x: 0,
            y: PAGE_H - 4,
            width: PAGE_W,
            height: 4,
            color: primaryColor,
          });
        }

        y = drawSectionHeader(
          page,
          y,
          `FINDINGS - ${clusters.length} Damage Area${clusters.length > 1 ? "s" : ""} Identified`,
          helveticaBold,
          primaryColor
        );

        let findingsOnPage = 0;

        for (let ci = 0; ci < clusters.length; ci++) {
          const cluster = clusters[ci];
          const clrRgb = damageColorToRgb(cluster.color);

          // Pre-measure finding height for widow/orphan protection
          const captionLines = cluster.caption ? Math.ceil(cluster.caption.length / 80) : 3;
          const estimatedHeight = estimatePhotoSectionHeight(1, false, captionLines);

          // Start new page if: not enough space OR exceeded max findings per page
          if (y < estimatedHeight + SAFE_CONTENT_Y_MIN || findingsOnPage >= MAX_FINDINGS_PER_PAGE) {
            page = newPage();
            y = PAGE_H - MARGIN - 10;
            page.drawRectangle({
              x: 0,
              y: PAGE_H - 4,
              width: PAGE_W,
              height: 4,
              color: primaryColor,
            });
            // Continuation header
            page.drawText(`FINDINGS (continued) - Photo ${i + 1}`, {
              x: MARGIN,
              y,
              size: 10,
              font: helveticaBold,
              color: primaryColor,
            });
            y -= 20;
            findingsOnPage = 0;
          }

          // Finding number with color swatch
          page.drawRectangle({ x: MARGIN, y: y - 3, width: 12, height: 12, color: clrRgb });
          page.drawText(`Finding #${ci + 1}  -  ${cluster.label}`, {
            x: MARGIN + 18,
            y,
            size: 10,
            font: helveticaBold,
            color: rgb(0.15, 0.15, 0.15),
          });
          y -= 13;

          // Severity + Confidence
          const sevColor = ["critical", "severe", "high"].includes(cluster.severity.toLowerCase())
            ? rgb(0.85, 0.15, 0.15)
            : ["moderate", "medium"].includes(cluster.severity.toLowerCase())
              ? rgb(0.9, 0.55, 0.1)
              : rgb(0.2, 0.7, 0.3);

          page.drawText(`Severity: ${cluster.severity}`, {
            x: MARGIN + 12,
            y,
            size: 9,
            font: helveticaBold,
            color: sevColor,
          });
          if (cluster.confidence > 0) {
            const sevTextW = helveticaBold.widthOfTextAtSize(`Severity: ${cluster.severity}`, 9);
            page.drawText(`   |   Confidence: ${Math.round(cluster.confidence * 100)}%`, {
              x: MARGIN + 12 + sevTextW,
              y,
              size: 9,
              font: helvetica,
              color: rgb(0.5, 0.5, 0.5),
            });
          }
          if (cluster.memberCount > 1) {
            const groupedText = `${cluster.memberCount} detections grouped`;
            page.drawText(groupedText, {
              x: PAGE_W - MARGIN - helvetica.widthOfTextAtSize(groupedText, 8) - 4,
              y,
              size: 8,
              font: helvetica,
              color: rgb(0.6, 0.6, 0.6),
            });
          }
          y -= 13;

          // IRC code reference
          if (cluster.ircCode) {
            page.drawText(`${cluster.ircCode.code}  -  ${cluster.ircCode.title}`, {
              x: MARGIN + 12,
              y,
              size: 9,
              font: helveticaBold,
              color: rgb(0.15, 0.35, 0.65),
            });
            y -= 12;
          }

          // Professional caption
          if (cluster.caption) {
            y = drawWrappedText(
              page,
              cluster.caption,
              MARGIN + 12,
              y,
              CONTENT_W - 16,
              timesRoman,
              9,
              rgb(0.22, 0.22, 0.22),
              13
            );
          }
          y -= 4;

          // Separator
          if (ci < clusters.length - 1) {
            // Add finding description/details if available
            if (cluster.memberCount > 1) {
              page.drawText(
                `Based on ${cluster.memberCount} AI detections grouped by damage type and proximity.`,
                {
                  x: MARGIN + 12,
                  y,
                  size: 8,
                  font: helvetica,
                  color: rgb(0.5, 0.5, 0.5),
                }
              );
              y -= 10;
            }
            page.drawLine({
              start: { x: MARGIN + 12, y: y + 4 },
              end: { x: MARGIN + CONTENT_W / 2, y: y + 4 },
              thickness: 0.5,
              color: rgb(0.85, 0.85, 0.85),
            });
            y -= 4;
          }
          findingsOnPage++;
        }
      } else if (photo.ai_caption) {
        // No clusters but has AI caption
        y -= 4;
        page.drawText("Analysis Notes", {
          x: MARGIN,
          y,
          size: 10,
          font: helveticaBold,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 15;
        y = drawWrappedText(
          page,
          photo.ai_caption,
          MARGIN + 8,
          y,
          CONTENT_W - 8,
          timesRoman,
          9.5,
          rgb(0.2, 0.2, 0.2),
          14
        );
      }
    }

    // =========================================================================
    //  FINAL PAGE - DISCLAIMER & CERTIFICATION
    // =========================================================================
    page = newPage();
    y = PAGE_H - MARGIN - 10;
    page.drawRectangle({ x: 0, y: PAGE_H - 4, width: PAGE_W, height: 4, color: primaryColor });

    y = drawSectionHeader(page, y, "REPORT DISCLAIMER", helveticaBold, primaryColor);

    const disclaimer = `This damage assessment report was prepared using AI-assisted analysis technology and professional inspection methodology. While every effort has been made to ensure accuracy, the findings herein should be verified by a licensed professional prior to making repair decisions. Damage assessments are based on visual evidence available at the time of inspection. Hidden damage, pre-existing conditions, or subsequent events may alter the scope of required repairs. This report is provided for informational purposes and does not constitute a guarantee of insurance coverage or claim approval.`;
    y = drawWrappedText(
      page,
      disclaimer,
      MARGIN,
      y,
      CONTENT_W,
      timesRoman,
      9,
      rgb(0.35, 0.35, 0.35),
      14
    );
    y -= 30;

    y = drawSectionHeader(page, y, "INSPECTOR CERTIFICATION", helveticaBold, primaryColor);

    page.drawText("I certify that the information contained in this report accurately represents", {
      x: MARGIN,
      y,
      size: 10,
      font: timesRoman,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;
    page.drawText("the conditions observed during the property inspection.", {
      x: MARGIN,
      y,
      size: 10,
      font: timesRoman,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 40;

    drawHR(page, y, rgb(0.3, 0.3, 0.3));
    y -= 14;
    const certInspectorName = user?.name || "Inspector Signature";
    const certInspectorTitle = (user as any)?.title || "";
    const certLicense = (user as any)?.license_number || branding?.license || null;
    page.drawText(certInspectorName, {
      x: MARGIN,
      y,
      size: 10,
      font: helveticaBold,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 14;
    if (certInspectorTitle) {
      page.drawText(certInspectorTitle, {
        x: MARGIN,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.35, 0.35, 0.35),
      });
      y -= 12;
    }
    page.drawText(companyName, {
      x: MARGIN,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.45, 0.45, 0.45),
    });
    y -= 12;
    if (certLicense) {
      page.drawText(`License #: ${certLicense}`, {
        x: MARGIN,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.45, 0.45, 0.45),
      });
      y -= 12;
    }
    page.drawText(
      `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      { x: MARGIN, y, size: 9, font: helvetica, color: rgb(0.45, 0.45, 0.45) }
    );

    // Draw footers
    const totalPages = pages.length;
    for (let p = 0; p < totalPages; p++) {
      drawFooter(pages[p], p + 1, totalPages, helvetica, companyName, primaryColor);
    }

    // Save PDF
    logger.info("[DAMAGE_REPORT] Saving PDF...", { claimId, pageCount: pdfDoc.getPageCount() });
    const pdfBytes = await pdfDoc.save();
    const pdfUint8 = new Uint8Array(pdfBytes);

    // Upload to Supabase
    const supabase = getSupabaseAdmin();
    if (!supabase) return apiError(500, "CONFIG_ERROR", "Storage not configured");

    const reportId = createId();
    const filename = `damage-report-${claim.claimNumber || claimId}-${Date.now()}.pdf`;
    const bucket = "claim-photos";
    const storagePath = `${orgId}/${claimId}/reports/${filename}`;

    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.some((b: { name: string }) => b.name === bucket)) {
        await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 50 * 1024 * 1024,
        });
      }
    } catch (bucketErr) {
      logger.warn("[DAMAGE_REPORT] Bucket check/create error (non-fatal)", { bucketErr });
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, pdfUint8, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      logger.error("[DAMAGE_REPORT] Upload error", { uploadError });
      return apiError(500, "UPLOAD_ERROR", "Failed to upload report PDF to storage");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    // Save to file_assets
    await prisma.file_assets.create({
      data: {
        id: reportId,
        orgId,
        ownerId: userId,
        claimId,
        filename,
        mimeType: "application/pdf",
        sizeBytes: pdfUint8.length,
        storageKey: storagePath,
        bucket,
        publicUrl,
        category: "document",
        file_type: "damage_report",
        source: "ai_generated",
        note: `Professional Damage Assessment Report - ${filteredPhotos.length} photos, ${totalFindings} findings, ${overallSeverity} severity`,
        updatedAt: new Date(),
      },
    });

    logger.info("[DAMAGE_REPORT] Generated professional report v2", {
      claimId,
      reportId,
      photoCount: photos.length,
      findingCount: totalFindings,
      pageCount: pdfDoc.getPageCount(),
      hasBranding: !!branding,
      hasLogo: !!logoImage,
    });

    // Record report generation metrics
    try {
      const photoStats = photos.map((p) => {
        const cls = photoClusterMap.get(p.id) || [];
        return { hasClusters: cls.length > 0, clusterCount: cls.length };
      });
      const clusterStats = allClusters.map((c) => ({
        severity: c.severity,
        confidence: c.confidence,
        ircCode: c.ircCode,
        caption: c.caption || "",
        score: c.score,
      }));
      const qualityMetrics = calculateQualityMetrics(photoStats, clusterStats);
      await recordReportMetrics(
        reportId,
        {
          generationTimeMs: reportTimer.elapsed(),
          pageCount: pdfDoc.getPageCount(),
          photoCount: photos.length,
          photosEmbedded: photos.length,
          photosFailed: 0,
          findingCount: totalFindings,
          uniqueCodeCount: uniqueCodes.size,
          clusterCount: allClusters.length,
          avgClaimWorthiness:
            allClusters.length > 0
              ? allClusters.reduce((s, c) => s + c.score, 0) / allClusters.length
              : 0,
          hasBranding: !!branding,
          hasLogo: !!logoImage,
          hasHeadshot: !!headshotImage,
          reportVersion: "v2",
          options: {
            captionStyle: captionStyleOpt,
            photoOrder: options.photoOrder as string,
            includeRepairability: options.includeRepairability,
          },
        },
        qualityMetrics
      );
    } catch (metricsErr) {
      logger.warn("[DAMAGE_REPORT] Metrics recording failed (non-fatal)", { metricsErr });
    }

    // Save to Report History
    try {
      await saveReportHistory({
        orgId,
        userId,
        type: "damage_report",
        title: `Damage Assessment Report - ${filteredPhotos.length} photos, ${totalFindings} findings`,
        sourceId: claimId,
        fileUrl: publicUrl,
        metadata: {
          reportId,
          photoCount: photos.length,
          findingCount: totalFindings,
          pageCount: pdfDoc.getPageCount(),
        },
      });
    } catch (historyErr) {
      logger.warn("[DAMAGE_REPORT] Report history save failed (non-fatal)", { historyErr });
    }

    return NextResponse.json({
      success: true,
      reportId,
      pdfUrl: publicUrl,
      pageCount: pdfDoc.getPageCount(),
      photoCount: photos.length,
      findingCount: totalFindings,
      generationTimeMs: reportTimer.elapsed(),
      captionStyle: captionStyleOpt,
      isArizona: isAZ,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", { errors: error.errors });
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    logger.error("[DAMAGE_REPORT] Generation failed", { error: errMsg, stack: errStack, claimId });
    return apiError(500, "INTERNAL_ERROR", `Failed to generate damage report: ${errMsg}`);
  }
}

// GET - List existing damage reports
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;
  const { claimId } = await params;

  try {
    const reports = await prisma.file_assets.findMany({
      where: { orgId, claimId, file_type: "damage_report" },
      select: {
        id: true,
        filename: true,
        publicUrl: true,
        sizeBytes: true,
        createdAt: true,
        note: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, reports, count: reports.length });
  } catch (error) {
    logger.error("[DAMAGE_REPORT_LIST] Error", { error, claimId });
    return apiError(500, "INTERNAL_ERROR", "Failed to list damage reports");
  }
}
