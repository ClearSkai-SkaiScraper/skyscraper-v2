// ============================================================================
// HYBRID PDF EXPORT - LibreOffice Fallback to pdf-lib
// ============================================================================
// Strategy:
// 1. Detect if LibreOffice is available (check executable path)
// 2. If available: Use child_process to convert DOCX → PDF (best quality)
// 3. If not: Generate PDF directly using pdf-lib (fallback, full control)
// ============================================================================

import * as Sentry from "@sentry/nextjs";
import { exec } from "child_process";
import { readFile, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { PDFDocument, type PDFFont, rgb as pdfRgb, StandardFonts } from "pdf-lib";
import { promisify } from "util";

import { logger } from "@/lib/logger";

const execAsync = promisify(exec);

// Wrapper to handle pdf-lib's rgb return type
const rgb = (r: number, g: number, b: number) => pdfRgb(r, g, b);

// ========== LIBREOFFICE DETECTION ==========

/**
 * Check if LibreOffice is available on system
 */
export async function isLibreOfficeAvailable(): Promise<boolean> {
  try {
    // Try common paths for LibreOffice
    const { stdout } = await execAsync("which soffice || which libreoffice");
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Convert DOCX to PDF using LibreOffice
 * Requires LibreOffice installed on system
 */
export async function convertDocxToPdfWithLibreOffice(docxBuffer: Buffer): Promise<Buffer | null> {
  const tempDir = tmpdir();
  const inputPath = join(tempDir, `input-${Date.now()}.docx`);
  const outputDir = tempDir;

  try {
    // Write DOCX to temp file
    await writeFile(inputPath, docxBuffer);

    // Convert using LibreOffice headless mode
    // --headless: No GUI
    // --convert-to pdf: Output format
    // --outdir: Where to write PDF
    const command = `soffice --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;

    const { stdout: _stdout, stderr } = await execAsync(command, {
      timeout: 30000, // 30s timeout
    });

    if (stderr && !stderr.includes("convert")) {
      logger.warn("[LibreOffice] stderr:", stderr);
    }

    // Read generated PDF
    const pdfPath = inputPath.replace(".docx", ".pdf");
    const pdfBuffer = await readFile(pdfPath);

    // Cleanup temp files
    await unlink(inputPath).catch((e) =>
      logger.debug(`[LibreOffice] Cleanup failed: ${(e as Error)?.message}`)
    );
    await unlink(pdfPath).catch((e) =>
      logger.debug(`[LibreOffice] Cleanup failed: ${(e as Error)?.message}`)
    );

    return pdfBuffer;
  } catch (error) {
    logger.error(`[LibreOffice] Conversion failed: ${(error as Error).message}`);
    Sentry.captureException(error, {
      tags: { component: "libreoffice-export" },
    });

    // Cleanup on error
    await unlink(inputPath).catch((e) =>
      logger.debug(`[LibreOffice] Cleanup failed: ${(e as Error)?.message}`)
    );

    return null;
  }
}

// ========== PDF-LIB FALLBACK ==========

interface BrandingData {
  companyName?: string;
  logoUrl?: string;
}

interface PacketDataContent {
  propertyAddress?: string;
  insured_name?: string;
  branding?: BrandingData;
  roofType?: string;
  materialChoice?: string;
  financingAvailable?: boolean;
  financingPartners?: string[];
  companyBio?: string;
  claimNumber?: string;
  dateOfLoss?: string;
  carrier?: string;
  adjusterName?: string;
  damageType?: string;
  rcv?: number;
  acv?: number;
  underpayment?: number;
  weatherEvents?: string[];
  supplements?: Array<{ description: string; amount: number }>;
  [key: string]: unknown;
}

export type PacketData = {
  mode: "retail" | "claims";
  data: PacketDataContent;
};

/**
 * Generate PDF directly using pdf-lib
 * Used as fallback when LibreOffice is not available
 */
export async function generatePdfWithPdfLib(packetData: PacketData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const { mode, data } = packetData;

  // === COVER PAGE ===
  const coverPage = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = coverPage.getSize();

  // Title
  const title = mode === "retail" ? "Retail Estimate" : "Claims Report";
  const titleSize = 32;
  const titleWidth = timesRomanBold.widthOfTextAtSize(title, titleSize);

  coverPage.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 100,
    size: titleSize,
    font: timesRomanBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Property Address
  if (data.propertyAddress || data.insured_name) {
    const subtitle = data.propertyAddress ?? data.insured_name ?? "";
    const subtitleSize = 14;
    const subtitleWidth = timesRoman.widthOfTextAtSize(subtitle, subtitleSize);

    coverPage.drawText(subtitle, {
      x: (width - subtitleWidth) / 2,
      y: height - 140,
      size: subtitleSize,
      font: timesRoman,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  // Date
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dateSize = 12;
  const dateWidth = timesRoman.widthOfTextAtSize(date, dateSize);

  coverPage.drawText(date, {
    x: (width - dateWidth) / 2,
    y: height - 180,
    size: dateSize,
    font: timesRoman,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Branding footer (if present)
  if (data.branding) {
    try {
      const brandName = data.branding.companyName || "SkaiScraper";
      const brandTag = brandName + (data.branding.logoUrl ? "" : "");
      const footerSize = 10;
      const footerWidth = timesRoman.widthOfTextAtSize(brandTag, footerSize);
      coverPage.drawText(brandTag, {
        x: (width - footerWidth) / 2,
        y: 40,
        size: footerSize,
        font: timesRoman,
        color: rgb(0.3, 0.3, 0.3),
      });
    } catch (e) {
      logger.warn("[PDF_EXPORT] Branding draw skipped:", (e as Error)?.message);
    }
  }

  // === CONTENT PAGES ===
  if (mode === "retail") {
    await addRetailContentPages(pdfDoc, data, timesRoman, timesRomanBold);
  } else {
    await addClaimsContentPages(pdfDoc, data, timesRoman, timesRomanBold);
  }

  // Serialize to bytes
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Add Retail wizard content to PDF
 */
async function addRetailContentPages(
  pdfDoc: PDFDocument,
  data: PacketDataContent,
  font: PDFFont,
  boldFont: PDFFont
): Promise<void> {
  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();
  let yPos = height - 50;

  // Step 1: Client & Property
  if (data.insured_name || data.propertyAddress) {
    page.drawText("Client & Property Information", {
      x: 50,
      y: yPos,
      size: 18,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 25;

    if (data.insured_name) {
      page.drawText(`Client Name: ${data.insured_name}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
      });
      yPos -= 18;
    }

    if (data.propertyAddress) {
      const lines = wrapText(data.propertyAddress, 75);
      lines.forEach((line) => {
        page.drawText(`Address: ${line}`, {
          x: 50,
          y: yPos,
          size: 12,
          font: font,
        });
        yPos -= 18;
      });
    }

    yPos -= 20;
  }

  // Step 2: Materials & Upgrades
  if (data.roofType || data.materialChoice) {
    if (yPos < 100) {
      pdfDoc.addPage([612, 792]);
      yPos = height - 50;
    }

    page.drawText("Materials & Upgrades", {
      x: 50,
      y: yPos,
      size: 18,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 25;

    if (data.roofType) {
      page.drawText(`Roof Type: ${data.roofType}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
      });
      yPos -= 18;
    }

    if (data.materialChoice) {
      page.drawText(`Material: ${data.materialChoice}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
      });
      yPos -= 18;
    }

    yPos -= 20;
  }

  // Step 3: Financing
  if (data.financingAvailable) {
    if (yPos < 100) {
      pdfDoc.addPage([612, 792]);
      yPos = height - 50;
    }

    page.drawText("Financing Options", {
      x: 50,
      y: yPos,
      size: 18,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 25;

    page.drawText("Financing Available: Yes", {
      x: 50,
      y: yPos,
      size: 12,
      font: font,
    });
    yPos -= 18;

    if (data.financingPartners && data.financingPartners.length > 0) {
      page.drawText(`Partners: ${data.financingPartners.join(", ")}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
      });
      yPos -= 18;
    }

    yPos -= 20;
  }

  // Step 4: Why Choose Us
  if (data.companyBio) {
    if (yPos < 150) {
      pdfDoc.addPage([612, 792]);
      yPos = height - 50;
    }

    page.drawText("Why Choose Us", {
      x: 50,
      y: yPos,
      size: 18,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 25;

    const bioLines = wrapText(data.companyBio, 75);
    bioLines.forEach((line) => {
      if (yPos < 50) return; // Skip if page full
      page.drawText(line, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
      });
      yPos -= 18;
    });
  }

  // Add footer
  const footerPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  footerPage.drawText("Generated by SkaiScraper", {
    x: 50,
    y: 30,
    size: 10,
    font: font,
    color: rgb(0.6, 0.6, 0.6),
  });
}

/**
 * Add Claims wizard content to PDF
 */
async function addClaimsContentPages(
  pdfDoc: PDFDocument,
  data: PacketDataContent,
  font: PDFFont,
  boldFont: PDFFont
): Promise<void> {
  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();
  let yPos = height - 50;

  // Step 1: Carrier & Claim Info
  if (data.insuranceCarrier || data.claimNumber) {
    page.drawText("Carrier & Claim Information", {
      x: 50,
      y: yPos,
      size: 18,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 25;

    if (data.insuranceCarrier) {
      page.drawText(`Insurance Carrier: ${data.insuranceCarrier}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
      });
      yPos -= 18;
    }

    if (data.claimNumber) {
      page.drawText(`Claim Number: ${data.claimNumber}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
      });
      yPos -= 18;
    }

    yPos -= 20;
  }

  // Step 2: Insured & Property
  if (data.insured_name || data.propertyAddress) {
    if (yPos < 100) {
      pdfDoc.addPage([612, 792]);
      yPos = height - 50;
    }

    page.drawText("Insured & Property", {
      x: 50,
      y: yPos,
      size: 18,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 25;

    if (data.insured_name) {
      page.drawText(`Insured Name: ${data.insured_name}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
      });
      yPos -= 18;
    }

    if (data.propertyAddress) {
      const lines = wrapText(data.propertyAddress, 75);
      lines.forEach((line) => {
        page.drawText(`Address: ${line}`, {
          x: 50,
          y: yPos,
          size: 12,
          font: font,
        });
        yPos -= 18;
      });
    }

    yPos -= 20;
  }

  // Add footer
  const footerPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  footerPage.drawText("Generated by SkaiScraper - Claims Report", {
    x: 50,
    y: 30,
    size: 10,
    font: font,
    color: rgb(0.6, 0.6, 0.6),
  });
}

// ========== UTILITIES ==========

/**
 * Wrap text to fit within a specified character width
 */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    if ((currentLine + " " + word).length <= maxChars) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

// ========== MAIN EXPORT FUNCTION ==========

export type HybridExportOptions = {
  mode: "retail" | "claims";
  data: PacketDataContent;
  docxBuffer?: Buffer; // Optional: if you have a DOCX already
};

/**
 * Main export function - tries LibreOffice first, falls back to pdf-lib
 */
export async function exportToPdf(options: HybridExportOptions): Promise<Buffer> {
  const { mode, data, docxBuffer } = options;

  // Strategy 1: Use LibreOffice if DOCX provided and LibreOffice available
  if (docxBuffer) {
    const hasLibreOffice = await isLibreOfficeAvailable();

    if (hasLibreOffice) {
      logger.debug("[PDF_EXPORT] Using LibreOffice for conversion...");
      const pdfBuffer = await convertDocxToPdfWithLibreOffice(docxBuffer);

      if (pdfBuffer) {
        logger.debug("[PDF_EXPORT] LibreOffice conversion successful");
        return pdfBuffer;
      } else {
        logger.warn("[PDF_EXPORT] LibreOffice failed, falling back to pdf-lib");
      }
    } else {
      logger.debug("[PDF_EXPORT] LibreOffice not available, using pdf-lib fallback");
    }
  }

  // Strategy 2: Generate PDF directly with pdf-lib
  logger.debug("[PDF_EXPORT] Generating PDF with pdf-lib...");
  const pdfBuffer = await generatePdfWithPdfLib({ mode, data });
  logger.debug("[PDF_EXPORT] pdf-lib generation successful");

  return pdfBuffer;
}
