/**
 * PDF Generation for Templates
 *
 * Generates PDF from template with company branding applied.
 * Uses jsPDF (serverless-compatible) as primary renderer.
 * Puppeteer/React-PDF used only when explicitly configured.
 */

import { jsPDF } from "jspdf";

import { logger } from "@/lib/logger";
import { type CoverPageData,drawCoverPage, fetchPropertyMapBase64 } from "@/lib/pdf/coverPage";
import prisma from "@/lib/prisma";

import { getMergedTemplate } from "./mergeTemplate";

interface PDFGenerationOptions {
  templateId: string;
  orgId: string;
  claimData?: {
    claimNumber?: string;
    lossDate?: string;
    propertyAddress?: string;
    insured_name?: string;
  };
}

/**
 * Generate PDF from template with branding
 *
 * Uses jsPDF for serverless-safe PDF generation (Vercel/Railway compatible).
 * Falls back gracefully if template merge fails.
 */
export async function generateTemplatePDF(options: PDFGenerationOptions): Promise<Buffer> {
  const { templateId, orgId, claimData } = options;

  logger.info(`[PDF_GENERATION] Starting PDF generation for template ${templateId}`, { orgId });

  try {
    // 1. Get merged template with branding
    const mergedTemplate = await getMergedTemplate(templateId, orgId);

    if (!mergedTemplate) {
      throw new Error("Template not found or branding merge failed");
    }

    logger.debug(`[PDF_GENERATION] Merged template loaded with branding`);

    // 2. Generate PDF using jsPDF (works in all environments)
    const pdfBuffer = await generatePDFWithJsPDF(mergedTemplate, orgId, claimData);

    logger.info(`[PDF_GENERATION] PDF generated successfully (${pdfBuffer.length} bytes)`);

    return pdfBuffer;
  } catch (error: any) {
    logger.error(`[PDF_GENERATION] Error generating PDF`, {
      templateId,
      orgId,
      error: error.message,
    });
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
}

/**
 * Generate PDF using jsPDF — serverless-safe, no Chromium required.
 */
async function generatePDFWithJsPDF(
  mergedTemplate: any,
  orgId: string,
  claimData?: any
): Promise<Buffer> {
  const doc = new jsPDF({ format: "letter" });

  const primaryColor = mergedTemplate?.styles?.primaryColor ?? "#0A1A2F";
  const companyName = mergedTemplate?.header?.companyName ?? "Report";

  // Parse primary color
  const pRgb = hexToRgb(primaryColor);

  // ── COVER PAGE ──
  try {
    // Fetch org branding for cover page
    const branding = await prisma.org_branding
      .findFirst({
        where: { orgId },
        select: {
          companyName: true,
          license: true,
          phone: true,
          email: true,
          website: true,
          logoUrl: true,
          colorPrimary: true,
          colorAccent: true,
          teamPhotoUrl: true,
        },
      })
      .catch(() => null);

    const mapBase64 = claimData?.propertyAddress
      ? await fetchPropertyMapBase64(claimData.propertyAddress)
      : undefined;

    const coverData: CoverPageData = {
      reportTitle: mergedTemplate?.header?.reportTitle || "Document Report",
      reportCategory: claimData?.claimNumber ? "insurance" : "retail",
      companyName: branding?.companyName || companyName,
      companyLicense: branding?.license || undefined,
      companyPhone: branding?.phone || undefined,
      companyEmail: branding?.email || undefined,
      companyWebsite: branding?.website || undefined,
      logoUrl: branding?.logoUrl || undefined,
      headshotUrl: branding?.teamPhotoUrl || undefined,
      brandColor: branding?.colorPrimary || primaryColor,
      accentColor: branding?.colorAccent || undefined,
      propertyAddress: claimData?.propertyAddress,
      propertyMapBase64: mapBase64,
      insuredName: claimData?.insured_name,
      claimNumber: claimData?.claimNumber,
      dateOfLoss: claimData?.lossDate,
      reportDate: new Date(),
    };

    await drawCoverPage(doc, coverData);
    doc.addPage();
  } catch (coverErr) {
    logger.warn("[PDF_GENERATION] Cover page failed, continuing:", coverErr);
  }

  let yPos = 20;

  // === HEADER ===
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(pRgb.r, pRgb.g, pRgb.b);
  doc.text(companyName, 105, yPos, { align: "center" });
  yPos += 10;

  // Header line
  doc.setDrawColor(pRgb.r, pRgb.g, pRgb.b);
  doc.setLineWidth(1);
  doc.line(20, yPos, 195, yPos);
  yPos += 15;

  // === CLAIM DATA (if provided) ===
  if (claimData) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    if (claimData.claimNumber) {
      doc.text(`Claim #: ${claimData.claimNumber}`, 20, yPos);
      yPos += 6;
    }
    if (claimData.insured_name) {
      doc.text(`Insured: ${claimData.insured_name}`, 20, yPos);
      yPos += 6;
    }
    if (claimData.propertyAddress) {
      doc.text(`Property: ${claimData.propertyAddress}`, 20, yPos);
      yPos += 6;
    }
    if (claimData.lossDate) {
      doc.text(`Loss Date: ${claimData.lossDate}`, 20, yPos);
      yPos += 6;
    }
    yPos += 10;
  }

  // === TEMPLATE SECTIONS ===
  const sections = mergedTemplate?.sections ?? [];
  doc.setTextColor(0, 0, 0);

  for (const section of sections) {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    // Section heading
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(pRgb.r, pRgb.g, pRgb.b);
    const title = section.title ?? section.type ?? "Section";
    doc.text(title, 20, yPos);
    yPos += 3;

    doc.setDrawColor(pRgb.r, pRgb.g, pRgb.b);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 80, yPos);
    yPos += 8;

    // Section content
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    const content = section.content ?? section.text ?? "";
    if (content) {
      const lines = doc.splitTextToSize(content, 175);
      doc.text(lines, 20, yPos);
      yPos += lines.length * 5 + 10;
    }
  }

  // === FOOTER ===
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`${companyName} — Page ${i} of ${pageCount}`, 105, 275, { align: "center" });
  }

  // Convert to Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 10, g: 26, b: 47 };
}

/**
 * Save generated PDF to storage
 *
 * @param pdfBuffer - PDF data buffer
 * @param filename - Desired filename
 * @returns URL to stored PDF
 */
export async function savePDFToStorage(pdfBuffer: Buffer, filename: string): Promise<string> {
  // TODO: Implement storage upload (Supabase Storage / Vercel Blob)
  logger.debug(`[PDF_STORAGE] Would save PDF: ${filename} (${pdfBuffer.length} bytes)`);
  return `/api/pdfs/${filename}`;
}
