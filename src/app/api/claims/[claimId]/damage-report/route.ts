/**
 * Damage Report Generator API — Professional Edition
 *
 * Generates a comprehensive, branded PDF damage report with:
 * - Company branding (logo, name, license, contact info)
 * - Employee/inspector info (name, headshot)
 * - Embedded photos with damage annotation overlays
 * - IRC building code references
 * - AI-generated damage summary & justification narrative
 * - Professional layout, margins, and typography
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";

import { apiError } from "@/lib/apiError";
import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { saveReportHistory } from "@/lib/reports/saveReportHistory";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// ── Layout constants ──
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 60;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 40;

// ── Brand colours (fallbacks parsed from hex) ──
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return rgb(
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255
  );
}

// IRC Building Codes reference
const IRC_CODES: Record<string, { code: string; title: string; text: string }> = {
  shingle_damage: {
    code: "IRC R905.2.7",
    title: "Asphalt Shingle Application",
    text: "Asphalt shingles shall be applied per manufacturer installation instructions and ASTM D3462.",
  },
  underlayment: {
    code: "IRC R905.1.1",
    title: "Underlayment Requirements",
    text: "Underlayment shall comply with ASTM D226, D4869, or D6757 for asphalt-saturated felt.",
  },
  flashing: {
    code: "IRC R905.2.8",
    title: "Flashing Requirements",
    text: "Flashings shall be installed at wall and roof intersections, changes in roof slope, and around roof openings.",
  },
  drip_edge: {
    code: "IRC R905.2.8.5",
    title: "Drip Edge",
    text: "A drip edge shall be provided at eaves and rakes of shingle roofs.",
  },
  ventilation: {
    code: "IRC R806.1",
    title: "Ventilation Required",
    text: "Enclosed attics and rafter spaces shall have cross ventilation with a minimum net free ventilating area of 1/150.",
  },
  ice_barrier: {
    code: "IRC R905.2.7.1",
    title: "Ice Barrier",
    text: "Ice barriers shall extend from the eave's edge to a point 24 inches inside the exterior wall line.",
  },
  nail_pattern: {
    code: "IRC R905.2.6",
    title: "Fastener Requirements",
    text: "Shingle fasteners shall be corrosion-resistant, minimum 12 gauge shank, 3/8 inch head diameter.",
  },
  hail_damage: {
    code: "IRC R903.2",
    title: "Roof Covering Materials",
    text: "Roof coverings shall be designed for weather protection and the specific application.",
  },
};

const RequestSchema = z.object({
  includePhotos: z.boolean().default(true),
  includeAnnotations: z.boolean().default(true),
  format: z.enum(["pdf"]).default("pdf"),
});

interface RouteParams {
  params: Promise<{ claimId: string }>;
}

interface AnnotationMeta {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  damageType?: string;
  severity?: string;
  ircCode?: string;
  caption?: string;
  confidence?: number;
}

interface PhotoWithMetadata {
  id: string;
  filename: string;
  publicUrl: string;
  ai_caption: string | null;
  ai_severity: string | null;
  ai_confidence: number | null;
  metadata: {
    annotations?: AnnotationMeta[];
    generatedCaption?: string;
    damageBoxes?: { x: number; y: number; w: number; h: number; label?: string }[];
  } | null;
}

// ── Helper: word-wrap text and draw lines ──
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

// ── Helper: draw a horizontal rule ──
function drawHR(page: PDFPage, y: number, color = rgb(0.82, 0.82, 0.82)) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 0.75,
    color,
  });
}

// ── Helper: draw page footer ──
function drawFooter(
  page: PDFPage,
  pageNum: number,
  totalPages: number,
  font: PDFFont,
  companyName: string
) {
  drawHR(page, FOOTER_Y + 12, rgb(0.85, 0.85, 0.85));
  page.drawText(companyName, {
    x: MARGIN,
    y: FOOTER_Y - 2,
    size: 7,
    font,
    color: rgb(0.55, 0.55, 0.55),
  });
  const pageLabel = `Page ${pageNum} of ${totalPages}`;
  const pw = font.widthOfTextAtSize(pageLabel, 7);
  page.drawText(pageLabel, {
    x: PAGE_W - MARGIN - pw,
    y: FOOTER_Y - 2,
    size: 7,
    font,
    color: rgb(0.55, 0.55, 0.55),
  });
}

// ── Helper: safely fetch & embed image ──
async function embedImageSafe(pdfDoc: PDFDocument, url: string): Promise<PDFImage | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      logger.warn("[DAMAGE_REPORT] Image fetch failed", { url, status: res.status });
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length < 100) {
      logger.warn("[DAMAGE_REPORT] Image too small", { url, size: buf.length });
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("png") || url.toLowerCase().endsWith(".png")) {
      return await pdfDoc.embedPng(buf);
    }
    // Try jpg first, fallback to png if it fails
    try {
      return await pdfDoc.embedJpg(buf);
    } catch {
      try {
        return await pdfDoc.embedPng(buf);
      } catch {
        logger.warn("[DAMAGE_REPORT] Could not embed as JPG or PNG", { url });
        return null;
      }
    }
  } catch (e) {
    logger.warn("[DAMAGE_REPORT] Could not embed image", { url, error: (e as Error).message });
    return null;
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId, userId } = auth;

  const { claimId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const options = RequestSchema.parse(body);

    // ── Fetch claim, branding, user in parallel ──
    const [claim, branding, user] = await Promise.all([
      prisma.claims.findFirst({
        where: { id: claimId, orgId },
        select: {
          id: true,
          claimNumber: true,
          dateOfLoss: true,
          carrier: true,
          policy_number: true,
          properties: {
            select: { street: true, city: true, state: true, zipCode: true },
          },
        },
      }),
      prisma.org_branding.findFirst({ where: { orgId } }),
      prisma.users.findFirst({
        where: { id: userId },
        select: { name: true, email: true, headshot_url: true },
      }),
    ]);

    if (!claim) {
      return apiError(404, "NOT_FOUND", "Claim not found");
    }

    const propertyAddress = claim.properties
      ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state} ${claim.properties.zipCode}`
      : null;

    const companyName = branding?.companyName || "Storm Restoration Report";
    const primaryColor = branding?.colorPrimary
      ? hexToRgb(branding.colorPrimary)
      : rgb(0.067, 0.486, 1); // #117CFF

    // Fetch all analyzed photos for this claim
    const photos = await prisma.file_assets.findMany({
      where: {
        orgId,
        claimId,
        mimeType: { startsWith: "image/" },
        analyzed_at: { not: null },
      },
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
    });

    if (photos.length === 0) {
      return apiError(400, "NO_PHOTOS", "No analyzed photos found for this claim");
    }

    // ── Severity counts ──
    const severeCnt = photos.filter((p) => p.ai_severity === "severe").length;
    const moderateCnt = photos.filter((p) => p.ai_severity === "moderate").length;
    const minorCnt = photos.filter((p) => p.ai_severity === "minor").length;

    const overallSeverity = severeCnt > 0 ? "SEVERE" : moderateCnt > 0 ? "MODERATE" : "MINOR";

    // ── Build PDF ──
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`Damage Assessment Report – ${claim.claimNumber || claimId}`);
    pdfDoc.setAuthor(companyName);
    pdfDoc.setSubject("Property Damage Assessment");
    pdfDoc.setCreator("SkaiScraper Pro");

    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Track pages for footer
    const pages: PDFPage[] = [];
    function newPage() {
      const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pages.push(p);
      return p;
    }

    // ── Try to embed logo & headshot ──
    let logoImage: PDFImage | null = null;
    let headshotImage: PDFImage | null = null;
    if (branding?.logoUrl) {
      logoImage = await embedImageSafe(pdfDoc, branding.logoUrl);
    }
    if (user?.headshot_url) {
      headshotImage = await embedImageSafe(pdfDoc, user.headshot_url);
    }

    // ═══════════════════════════════════════════════
    //  PAGE 1 — COVER PAGE
    // ═══════════════════════════════════════════════
    let page = newPage();
    let y = PAGE_H - MARGIN;

    // ── Top accent bar ──
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 8,
      width: PAGE_W,
      height: 8,
      color: primaryColor,
    });

    // ── Company logo + name header ──
    const headerStartX = MARGIN;
    let headerY = y - 10;

    if (logoImage) {
      const logoDims = logoImage.scaleToFit(120, 60);
      page.drawImage(logoImage, {
        x: headerStartX,
        y: headerY - logoDims.height + 10,
        width: logoDims.width,
        height: logoDims.height,
      });
      // Company name next to logo
      page.drawText(companyName.toUpperCase(), {
        x: headerStartX + logoImage.scaleToFit(120, 60).width + 16,
        y: headerY - 6,
        size: 18,
        font: helveticaBold,
        color: primaryColor,
      });
    } else {
      page.drawText(companyName.toUpperCase(), {
        x: headerStartX,
        y: headerY,
        size: 22,
        font: helveticaBold,
        color: primaryColor,
      });
    }

    // Contact row under company name
    headerY -= 75;
    const contactParts: string[] = [];
    if (branding?.phone) contactParts.push(branding.phone);
    if (branding?.email) contactParts.push(branding.email);
    if (branding?.website) contactParts.push(branding.website);
    if (branding?.license) contactParts.push(`Lic# ${branding.license}`);
    if (contactParts.length > 0) {
      page.drawText(contactParts.join("  •  "), {
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

    // ── Report Title ──
    page.drawText("DAMAGE ASSESSMENT", {
      x: MARGIN,
      y,
      size: 28,
      font: timesBold,
      color: rgb(0.1, 0.1, 0.15),
    });
    y -= 30;
    page.drawText("REPORT", {
      x: MARGIN,
      y,
      size: 28,
      font: timesBold,
      color: rgb(0.1, 0.1, 0.15),
    });
    y -= 50;

    // ── Claim details table ──
    const labelColor = rgb(0.45, 0.45, 0.45);
    const valueColor = rgb(0.1, 0.1, 0.1);
    const detailX = MARGIN;
    const detailValX = MARGIN + 130;

    const details: [string, string][] = [["Claim Number", claim.claimNumber || claimId]];
    if (propertyAddress) details.push(["Property Address", propertyAddress]);
    if (claim.dateOfLoss) {
      details.push([
        "Date of Loss",
        new Date(claim.dateOfLoss).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      ]);
    }
    if (claim.carrier) details.push(["Insurance Carrier", claim.carrier]);
    if (claim.policy_number) details.push(["Policy Number", claim.policy_number]);
    details.push([
      "Report Date",
      new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    ]);
    details.push(["Photos Analyzed", String(photos.length)]);
    details.push(["Overall Severity", overallSeverity]);

    for (const [label, value] of details) {
      page.drawText(label + ":", {
        x: detailX,
        y,
        size: 10,
        font: helveticaBold,
        color: labelColor,
      });
      page.drawText(value, { x: detailValX, y, size: 10, font: helvetica, color: valueColor });
      y -= 20;
    }

    // ── Inspector / Prepared By ──
    y -= 20;
    drawHR(page, y + 8);
    y -= 15;

    if (headshotImage) {
      const hdDims = headshotImage.scaleToFit(50, 50);
      page.drawImage(headshotImage, {
        x: MARGIN,
        y: y - hdDims.height + 10,
        width: hdDims.width,
        height: hdDims.height,
      });
      page.drawText("Prepared By", {
        x: MARGIN + 60,
        y,
        size: 8,
        font: helvetica,
        color: labelColor,
      });
      y -= 14;
      page.drawText(user?.name || "Inspector", {
        x: MARGIN + 60,
        y,
        size: 12,
        font: helveticaBold,
        color: valueColor,
      });
      y -= 14;
      if (user?.email) {
        page.drawText(user.email, {
          x: MARGIN + 60,
          y,
          size: 9,
          font: helvetica,
          color: labelColor,
        });
      }
    } else {
      page.drawText("Prepared By", { x: MARGIN, y, size: 8, font: helvetica, color: labelColor });
      y -= 14;
      page.drawText(user?.name || "Inspector", {
        x: MARGIN,
        y,
        size: 12,
        font: helveticaBold,
        color: valueColor,
      });
      y -= 14;
      if (user?.email) {
        page.drawText(user.email, { x: MARGIN, y, size: 9, font: helvetica, color: labelColor });
      }
    }

    // ═══════════════════════════════════════════════
    //  PAGE 2 — EXECUTIVE SUMMARY & DAMAGE OVERVIEW
    // ═══════════════════════════════════════════════
    page = newPage();
    y = PAGE_H - MARGIN - 10;

    // Section header helper
    const sectionHeader = (pg: PDFPage, yPos: number, title: string) => {
      pg.drawRectangle({
        x: MARGIN - 4,
        y: yPos - 5,
        width: CONTENT_W + 8,
        height: 24,
        color: rgb(0.95, 0.96, 0.97),
      });
      pg.drawText(title, {
        x: MARGIN,
        y: yPos,
        size: 13,
        font: helveticaBold,
        color: primaryColor,
      });
      return yPos - 35;
    };

    y = sectionHeader(page, y, "EXECUTIVE SUMMARY");

    // Build a narrative summary
    const damageTypes = new Set<string>();
    for (const p of photos) {
      const cap = p.ai_caption;
      if (cap) {
        // Extract damage keywords from captions
        const kw = cap.match(
          /\b(hail|wind|storm|shingle|flashing|gutter|siding|roof|water|moisture|dent|crack|missing|broken|torn|lifted|displaced|impact)\b/gi
        );
        if (kw) kw.forEach((w) => damageTypes.add(w.toLowerCase()));
      }
    }

    const summaryText = `This report documents the findings of a comprehensive property damage assessment conducted at ${
      propertyAddress || "the insured property"
    }. A total of ${photos.length} photograph${photos.length > 1 ? "s were" : " was"} captured and analyzed using AI-powered damage detection technology. The analysis identified ${
      severeCnt > 0
        ? `${severeCnt} area${severeCnt > 1 ? "s" : ""} of severe damage`
        : moderateCnt > 0
          ? `${moderateCnt} area${moderateCnt > 1 ? "s" : ""} of moderate damage`
          : `${minorCnt} area${minorCnt > 1 ? "s" : ""} of minor damage`
    }${
      damageTypes.size > 0
        ? `, including evidence of ${[...damageTypes].slice(0, 5).join(", ")} damage`
        : ""
    }. ${
      claim.dateOfLoss
        ? `The reported date of loss was ${new Date(claim.dateOfLoss).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`
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

    // Justification paragraph
    const justificationText = `Based on the documented evidence, the property has sustained damage that meets the threshold for insurance claim consideration. Each photograph has been individually analyzed for damage type, severity, and applicable building code compliance. The findings in this report substantiate the need for professional restoration to return the property to its pre-loss condition in accordance with applicable building codes and manufacturer specifications.`;
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

    // ── Severity Breakdown Box ──
    y = sectionHeader(page, y, "DAMAGE SEVERITY BREAKDOWN");

    const severityRows: [
      string,
      number,
      typeof rgb extends (...a: infer _) => infer R ? R : never,
    ][] = [];
    if (severeCnt > 0) severityRows.push(["Severe", severeCnt, rgb(0.85, 0.15, 0.15)]);
    if (moderateCnt > 0) severityRows.push(["Moderate", moderateCnt, rgb(0.9, 0.55, 0.1)]);
    if (minorCnt > 0) severityRows.push(["Minor", minorCnt, rgb(0.2, 0.7, 0.3)]);
    const noneCnt = photos.length - severeCnt - moderateCnt - minorCnt;
    if (noneCnt > 0) severityRows.push(["Informational", noneCnt, rgb(0.55, 0.55, 0.55)]);

    for (const [label, count, color] of severityRows) {
      // Severity bar
      const barWidth = Math.min((count / photos.length) * (CONTENT_W - 140), CONTENT_W - 140);
      page.drawRectangle({
        x: MARGIN + 120,
        y: y - 2,
        width: barWidth,
        height: 14,
        color,
        opacity: 0.2,
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

    // ── IRC Codes ──
    const allIrcCodes = new Set<string>();
    for (const photo of photos) {
      const meta = photo.metadata as PhotoWithMetadata["metadata"];
      if (meta?.annotations) {
        for (const ann of meta.annotations) {
          if (ann.ircCode) allIrcCodes.add(ann.ircCode);
        }
      }
    }

    if (allIrcCodes.size > 0) {
      y -= 10;
      y = sectionHeader(page, y, "APPLICABLE BUILDING CODES");

      for (const code of allIrcCodes) {
        const codeInfo = IRC_CODES[code];
        if (!codeInfo) continue;
        if (y < 120) {
          page = newPage();
          y = PAGE_H - MARGIN - 10;
        }
        page.drawText(`${codeInfo.code}  —  ${codeInfo.title}`, {
          x: MARGIN,
          y,
          size: 10,
          font: helveticaBold,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 14;
        y = drawWrappedText(
          page,
          codeInfo.text,
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

    // ═══════════════════════════════════════════════
    //  PHOTO EVIDENCE PAGES
    // ═══════════════════════════════════════════════
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i] as PhotoWithMetadata;
      page = newPage();
      y = PAGE_H - MARGIN - 10;

      // ── Photo page header ──
      page.drawRectangle({
        x: 0,
        y: PAGE_H - 4,
        width: PAGE_W,
        height: 4,
        color: primaryColor,
      });

      page.drawText(`PHOTO EVIDENCE  ${i + 1} / ${photos.length}`, {
        x: MARGIN,
        y,
        size: 12,
        font: helveticaBold,
        color: primaryColor,
      });
      y -= 6;
      drawHR(page, y);
      y -= 20;

      // ── Embed the actual photo ──
      if (options.includePhotos && photo.publicUrl) {
        const img = await embedImageSafe(pdfDoc, photo.publicUrl);
        if (img) {
          const maxW = CONTENT_W;
          const maxH = 340;
          const dims = img.scaleToFit(maxW, maxH);

          // Center the image
          const imgX = MARGIN + (CONTENT_W - dims.width) / 2;

          // Photo border/shadow effect
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

          // Draw damage boxes on the photo
          // Build damageBoxes from annotations (annotations are saved to metadata.annotations,
          // NOT metadata.damageBoxes, so we must convert here)
          const meta = photo.metadata;
          const rawAnnotations = (meta?.annotations || []) as Array<{
            x: number;
            y: number;
            width?: number;
            height?: number;
            caption?: string;
            damageType?: string;
            isPercentage?: boolean;
          }>;
          const damageBoxes = rawAnnotations.map((ann) => {
            const isPct = ann.isPercentage === true;
            return {
              x: isPct ? (ann.x || 0) / 100 : (ann.x || 0) / 800,
              y: isPct ? (ann.y || 0) / 100 : (ann.y || 0) / 600,
              w: isPct ? (ann.width || 5) / 100 : (ann.width || 50) / 800,
              h: isPct ? (ann.height || 5) / 100 : (ann.height || 50) / 600,
              label: ann.caption || ann.damageType || "Damage",
            };
          });
          for (const box of damageBoxes) {
            const bx = imgX + box.x * dims.width;
            const by = y - dims.height + (1 - box.y - box.h) * dims.height;
            const bw = box.w * dims.width;
            const bh = box.h * dims.height;

            page.drawRectangle({
              x: bx,
              y: by,
              width: bw,
              height: bh,
              borderColor: rgb(1, 0.2, 0.2),
              borderWidth: 2,
              color: rgb(1, 0.2, 0.2),
              opacity: 0.08,
            });

            if (box.label) {
              const lblW = helvetica.widthOfTextAtSize(box.label, 7);
              page.drawRectangle({
                x: bx,
                y: by + bh - 10,
                width: lblW + 6,
                height: 10,
                color: rgb(1, 0.2, 0.2),
              });
              page.drawText(box.label, {
                x: bx + 3,
                y: by + bh - 8,
                size: 7,
                font: helvetica,
                color: rgb(1, 1, 1),
              });
            }
          }

          y -= dims.height + 20;
        } else {
          // Placeholder if image fetch failed
          page.drawRectangle({
            x: MARGIN,
            y: y - 80,
            width: CONTENT_W,
            height: 80,
            color: rgb(0.95, 0.95, 0.95),
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 1,
          });
          page.drawText("[Photo could not be loaded]", {
            x: MARGIN + CONTENT_W / 2 - 80,
            y: y - 45,
            size: 10,
            font: helvetica,
            color: rgb(0.6, 0.6, 0.6),
          });
          y -= 100;
        }
      }

      // ── Severity badge ──
      if (photo.ai_severity) {
        const sevColor =
          photo.ai_severity === "severe"
            ? rgb(0.85, 0.15, 0.15)
            : photo.ai_severity === "moderate"
              ? rgb(0.9, 0.55, 0.1)
              : rgb(0.2, 0.7, 0.3);

        const sevLabel = `SEVERITY: ${photo.ai_severity.toUpperCase()}`;
        const sevW = helveticaBold.widthOfTextAtSize(sevLabel, 10);
        page.drawRectangle({
          x: MARGIN - 2,
          y: y - 4,
          width: sevW + 16,
          height: 18,
          color: sevColor,
          opacity: 0.12,
        });
        page.drawText(sevLabel, {
          x: MARGIN + 6,
          y,
          size: 10,
          font: helveticaBold,
          color: sevColor,
        });

        if (photo.ai_confidence != null) {
          page.drawText(`${Math.round(Number(photo.ai_confidence) * 100)}% confidence`, {
            x: MARGIN + sevW + 24,
            y,
            size: 8,
            font: helvetica,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
        y -= 24;
      }

      // ── Filename ──
      page.drawText(photo.filename, {
        x: MARGIN,
        y,
        size: 8,
        font: helvetica,
        color: rgb(0.55, 0.55, 0.55),
      });
      y -= 18;

      // ── AI Analysis Caption ──
      if (photo.ai_caption) {
        page.drawText("AI Analysis", {
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
        y -= 8;
      }

      // ── Detailed Damage Summary for this photo ──
      const annMeta = photo.metadata as PhotoWithMetadata["metadata"];
      if (options.includeAnnotations && annMeta?.annotations && annMeta.annotations.length > 0) {
        if (y < 120) {
          page = newPage();
          y = PAGE_H - MARGIN - 10;
        }

        // Summary header
        page.drawRectangle({
          x: MARGIN - 4,
          y: y - 5,
          width: CONTENT_W + 8,
          height: 22,
          color: rgb(0.95, 0.96, 0.97),
        });
        page.drawText(
          `DETAILED DAMAGE FINDINGS — ${annMeta.annotations.length} Area${annMeta.annotations.length > 1 ? "s" : ""} Identified`,
          {
            x: MARGIN,
            y,
            size: 10,
            font: helveticaBold,
            color: primaryColor,
          }
        );
        y -= 28;

        for (let ai = 0; ai < annMeta.annotations.length; ai++) {
          const ann = annMeta.annotations[ai];
          if (y < 100) {
            page = newPage();
            y = PAGE_H - MARGIN - 10;
          }

          // Finding number + damage type
          const sevColor =
            ann.severity === "Critical" || ann.severity === "High"
              ? rgb(0.85, 0.15, 0.15)
              : ann.severity === "Medium"
                ? rgb(0.9, 0.55, 0.1)
                : rgb(0.2, 0.7, 0.3);

          page.drawText(`Finding #${ai + 1}`, {
            x: MARGIN + 4,
            y,
            size: 9,
            font: helveticaBold,
            color: primaryColor,
          });
          y -= 14;

          // Damage type + severity inline
          const damageLabel = ann.damageType || "Damage";
          page.drawText(`Type: ${damageLabel.replace(/_/g, " ")}`, {
            x: MARGIN + 12,
            y,
            size: 9,
            font: helveticaBold,
            color: rgb(0.2, 0.2, 0.2),
          });
          if (ann.severity) {
            const sevText = `  Severity: ${ann.severity}`;
            const dmgW = helveticaBold.widthOfTextAtSize(
              `Type: ${damageLabel.replace(/_/g, " ")}`,
              9
            );
            page.drawText(sevText, {
              x: MARGIN + 12 + dmgW + 8,
              y,
              size: 9,
              font: helveticaBold,
              color: sevColor,
            });
          }
          y -= 14;

          // IRC code reference
          if (ann.ircCode) {
            const codeInfo = IRC_CODES[ann.ircCode];
            if (codeInfo) {
              page.drawText(`Code Reference: ${codeInfo.code} — ${codeInfo.title}`, {
                x: MARGIN + 12,
                y,
                size: 8.5,
                font: helvetica,
                color: rgb(0.15, 0.35, 0.65),
              });
              y -= 12;
            }
          }

          // Confidence score
          if (ann.confidence) {
            page.drawText(`Confidence: ${Math.round(ann.confidence * 100)}%`, {
              x: MARGIN + 12,
              y,
              size: 8,
              font: helvetica,
              color: rgb(0.5, 0.5, 0.5),
            });
            y -= 12;
          }

          // Caption / description
          if (ann.caption) {
            y = drawWrappedText(
              page,
              ann.caption,
              MARGIN + 12,
              y,
              CONTENT_W - 16,
              timesRoman,
              9,
              rgb(0.25, 0.25, 0.25),
              13
            );
          }
          y -= 10;

          // Separator between findings
          if (ai < annMeta.annotations.length - 1) {
            page.drawLine({
              start: { x: MARGIN + 12, y: y + 4 },
              end: { x: MARGIN + CONTENT_W / 2, y: y + 4 },
              thickness: 0.5,
              color: rgb(0.85, 0.85, 0.85),
            });
            y -= 6;
          }
        }
      }
    }

    // ═══════════════════════════════════════════════
    //  FINAL PAGE — DISCLAIMER & SIGNATURE
    // ═══════════════════════════════════════════════
    page = newPage();
    y = PAGE_H - MARGIN - 10;

    y = sectionHeader(page, y, "REPORT DISCLAIMER");

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

    y = sectionHeader(page, y, "INSPECTOR CERTIFICATION");

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

    // Signature line
    drawHR(page, y, rgb(0.3, 0.3, 0.3));
    y -= 14;
    page.drawText(user?.name || "Inspector Signature", {
      x: MARGIN,
      y,
      size: 10,
      font: helveticaBold,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 14;
    page.drawText(companyName, {
      x: MARGIN,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.45, 0.45, 0.45),
    });
    y -= 12;
    page.drawText(
      `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      {
        x: MARGIN,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.45, 0.45, 0.45),
      }
    );

    // ── Draw footers on all pages ──
    const totalPages = pages.length;
    for (let p = 0; p < totalPages; p++) {
      drawFooter(pages[p], p + 1, totalPages, helvetica, companyName);
    }

    // ── Save PDF ──
    logger.info("[DAMAGE_REPORT] Saving PDF...", { claimId, pageCount: pdfDoc.getPageCount() });
    const pdfBytes = await pdfDoc.save();
    const pdfUint8 = new Uint8Array(pdfBytes);

    // Upload to Supabase
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return apiError(500, "CONFIG_ERROR", "Storage not configured");
    }

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
      .upload(storagePath, pdfUint8, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      logger.error("[DAMAGE_REPORT] Upload error", { uploadError });
      return apiError(500, "UPLOAD_ERROR", "Failed to upload report PDF to storage");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    // Save to file_assets as a document (NOT a photo)
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
        note: `Professional Damage Assessment Report — ${photos.length} photos, ${overallSeverity} severity`,
        updatedAt: new Date(),
      },
    });

    logger.info("[DAMAGE_REPORT] Generated professional report", {
      claimId,
      reportId,
      photoCount: photos.length,
      pageCount: pdfDoc.getPageCount(),
      hasBranding: !!branding,
      hasLogo: !!logoImage,
    });

    // Save to Report History (non-blocking)
    try {
      await saveReportHistory({
        orgId,
        userId,
        type: "damage_report",
        title: `Damage Assessment Report — ${photos.length} photos`,
        sourceId: claimId,
        fileUrl: publicUrl,
        metadata: {
          reportId,
          photoCount: photos.length,
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
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", {
        errors: error.errors,
      });
    }
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    logger.error("[DAMAGE_REPORT] Generation failed", { error: errMsg, stack: errStack, claimId });
    return apiError(500, "INTERNAL_ERROR", `Failed to generate damage report: ${errMsg}`);
  }
}

// GET - List existing damage reports for a claim
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const { claimId } = await params;

  try {
    const reports = await prisma.file_assets.findMany({
      where: {
        orgId,
        claimId,
        file_type: "damage_report",
      },
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

    return NextResponse.json({
      success: true,
      reports,
      count: reports.length,
    });
  } catch (error) {
    logger.error("[DAMAGE_REPORT_LIST] Error", { error, claimId });
    return apiError(500, "INTERNAL_ERROR", "Failed to list damage reports");
  }
}
