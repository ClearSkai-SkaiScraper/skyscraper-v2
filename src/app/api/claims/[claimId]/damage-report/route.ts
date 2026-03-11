/**
 * Damage Report Generator API
 *
 * Generates a comprehensive PDF damage report from all analyzed photos
 * on a claim, including annotations, IRC codes, and severity assessments.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { z } from "zod";

import { apiError } from "@/lib/apiError";
import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { saveReportHistory } from "@/lib/reports/saveReportHistory";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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

interface Annotation {
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
    annotations?: Annotation[];
    generatedCaption?: string;
  } | null;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId, userId } = auth;

  const { claimId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const options = RequestSchema.parse(body);

    // Fetch claim details
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: {
        id: true,
        claimNumber: true,
        dateOfLoss: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    if (!claim) {
      return apiError(404, "NOT_FOUND", "Claim not found");
    }

    // Build property address from relation
    const propertyAddress = claim.properties
      ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state} ${claim.properties.zipCode}`
      : null;

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

    // Generate the PDF
    const pdfDoc = await PDFDocument.create();
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // === COVER PAGE ===
    let page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();
    let y = height - 80;

    // Title
    page.drawText("DAMAGE ASSESSMENT REPORT", {
      x: 50,
      y,
      size: 24,
      font: timesBold,
      color: rgb(0.1, 0.1, 0.3),
    });
    y -= 40;

    // Claim info
    page.drawText(`Claim #: ${claim.claimNumber || claimId}`, {
      x: 50,
      y,
      size: 12,
      font: timesRoman,
    });
    y -= 20;

    if (propertyAddress) {
      page.drawText(`Property: ${propertyAddress}`, {
        x: 50,
        y,
        size: 12,
        font: timesRoman,
      });
      y -= 20;
    }

    if (claim.dateOfLoss) {
      page.drawText(`Date of Loss: ${new Date(claim.dateOfLoss).toLocaleDateString()}`, {
        x: 50,
        y,
        size: 12,
        font: timesRoman,
      });
      y -= 20;
    }

    page.drawText(`Report Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 50;

    // Summary stats
    const severeCnt = photos.filter((p) => p.ai_severity === "severe").length;
    const moderateCnt = photos.filter((p) => p.ai_severity === "moderate").length;
    const minorCnt = photos.filter((p) => p.ai_severity === "minor").length;

    page.drawText("DAMAGE SUMMARY", {
      x: 50,
      y,
      size: 16,
      font: timesBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 25;

    page.drawText(`Total Photos Analyzed: ${photos.length}`, {
      x: 50,
      y,
      size: 12,
      font: timesRoman,
    });
    y -= 18;

    if (severeCnt > 0) {
      page.drawText(`Severe Damage: ${severeCnt} photo(s)`, {
        x: 50,
        y,
        size: 12,
        font: timesRoman,
        color: rgb(0.8, 0.1, 0.1),
      });
      y -= 18;
    }

    if (moderateCnt > 0) {
      page.drawText(`Moderate Damage: ${moderateCnt} photo(s)`, {
        x: 50,
        y,
        size: 12,
        font: timesRoman,
        color: rgb(0.9, 0.5, 0.1),
      });
      y -= 18;
    }

    if (minorCnt > 0) {
      page.drawText(`Minor Damage: ${minorCnt} photo(s)`, {
        x: 50,
        y,
        size: 12,
        font: timesRoman,
        color: rgb(0.7, 0.7, 0.1),
      });
      y -= 18;
    }

    // === IRC CODES REFERENCED ===
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
      y -= 30;
      page.drawText("APPLICABLE BUILDING CODES", {
        x: 50,
        y,
        size: 16,
        font: timesBold,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 25;

      for (const code of allIrcCodes) {
        const codeInfo = IRC_CODES[code];
        if (codeInfo) {
          page.drawText(`${codeInfo.code}: ${codeInfo.title}`, {
            x: 50,
            y,
            size: 11,
            font: timesBold,
          });
          y -= 14;

          // Word wrap the text
          const words = codeInfo.text.split(" ");
          let line = "";
          for (const word of words) {
            const testLine = line + word + " ";
            if (testLine.length > 80) {
              page.drawText(line.trim(), {
                x: 60,
                y,
                size: 10,
                font: timesRoman,
                color: rgb(0.3, 0.3, 0.3),
              });
              y -= 12;
              line = word + " ";
            } else {
              line = testLine;
            }
          }
          if (line.trim()) {
            page.drawText(line.trim(), {
              x: 60,
              y,
              size: 10,
              font: timesRoman,
              color: rgb(0.3, 0.3, 0.3),
            });
            y -= 18;
          }
        }
      }
    }

    // === PHOTO DETAIL PAGES ===
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i] as PhotoWithMetadata;
      page = pdfDoc.addPage([612, 792]);
      y = height - 50;

      // Photo header
      page.drawText(`Photo ${i + 1} of ${photos.length}`, {
        x: 50,
        y,
        size: 14,
        font: timesBold,
      });
      y -= 20;

      page.drawText(photo.filename, {
        x: 50,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 30;

      // Severity badge
      if (photo.ai_severity) {
        const severityColor =
          photo.ai_severity === "severe"
            ? rgb(0.8, 0.1, 0.1)
            : photo.ai_severity === "moderate"
              ? rgb(0.9, 0.5, 0.1)
              : rgb(0.7, 0.7, 0.1);

        page.drawText(`Severity: ${photo.ai_severity.toUpperCase()}`, {
          x: 50,
          y,
          size: 12,
          font: timesBold,
          color: severityColor,
        });
        y -= 20;
      }

      // AI Caption
      if (photo.ai_caption) {
        page.drawText("AI Analysis:", {
          x: 50,
          y,
          size: 11,
          font: timesBold,
        });
        y -= 14;

        // Word wrap caption
        const words = photo.ai_caption.split(" ");
        let line = "";
        for (const word of words) {
          const testLine = line + word + " ";
          if (testLine.length > 90) {
            page.drawText(line.trim(), {
              x: 60,
              y,
              size: 10,
              font: timesRoman,
            });
            y -= 12;
            line = word + " ";
          } else {
            line = testLine;
          }
        }
        if (line.trim()) {
          page.drawText(line.trim(), {
            x: 60,
            y,
            size: 10,
            font: timesRoman,
          });
          y -= 20;
        }
      }

      // Annotations list
      const meta = photo.metadata;
      if (options.includeAnnotations && meta?.annotations && meta.annotations.length > 0) {
        y -= 10;
        page.drawText(`Damage Annotations (${meta.annotations.length}):`, {
          x: 50,
          y,
          size: 11,
          font: timesBold,
        });
        y -= 16;

        for (const ann of meta.annotations) {
          const annText = [
            ann.damageType || "Damage",
            ann.severity ? `(${ann.severity})` : "",
            ann.ircCode ? `- ${IRC_CODES[ann.ircCode]?.code || ann.ircCode}` : "",
          ]
            .filter(Boolean)
            .join(" ");

          page.drawText(`• ${annText}`, {
            x: 60,
            y,
            size: 10,
            font: timesRoman,
          });
          y -= 14;

          if (ann.caption) {
            page.drawText(`  "${ann.caption}"`, {
              x: 70,
              y,
              size: 9,
              font: helvetica,
              color: rgb(0.4, 0.4, 0.4),
            });
            y -= 12;
          }

          if (y < 100) {
            page = pdfDoc.addPage([612, 792]);
            y = height - 50;
          }
        }
      }

      // Photo URL reference
      y -= 20;
      page.drawText("Photo URL:", {
        x: 50,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 10;
      page.drawText(photo.publicUrl.substring(0, 80) + "...", {
        x: 50,
        y,
        size: 8,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.6),
      });
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // Upload to Supabase
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return apiError(500, "CONFIG_ERROR", "Storage not configured");
    }

    const reportId = createId();
    const filename = `damage-report-${claim.claimNumber || claimId}-${Date.now()}.pdf`;
    const storagePath = `damage-reports/${orgId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      logger.error("[DAMAGE_REPORT] Upload error", { uploadError });
      throw new Error("Failed to upload PDF");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("uploads").getPublicUrl(storagePath);

    // Save to file_assets
    await prisma.file_assets.create({
      data: {
        id: reportId,
        orgId,
        ownerId: userId,
        claimId,
        filename,
        mimeType: "application/pdf",
        sizeBytes: pdfBuffer.length,
        storageKey: storagePath,
        bucket: "uploads",
        publicUrl,
        category: "report",
        file_type: "damage_report",
        source: "ai_generated",
        note: `Damage Assessment Report - ${photos.length} photos analyzed`,
        updatedAt: new Date(),
      },
    });

    logger.info("[DAMAGE_REPORT] Generated", {
      claimId,
      reportId,
      photoCount: photos.length,
      pageCount: pdfDoc.getPageCount(),
    });

    // ── Save to report_history so it appears on Reports History page ──
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
    logger.error("[DAMAGE_REPORT] Error", { error, claimId });
    return apiError(500, "INTERNAL_ERROR", "Failed to generate damage report");
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
