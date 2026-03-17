/**
 * Final Payout Packet Generator — Real Implementation
 *
 * Generates a PDF packet with:
 *   1. Cover page with claim summary
 *   2. Depreciation line items table
 *   3. Supplement summary
 *   4. Financial summary (Amount Due from Carrier)
 *
 * Uses pdf-lib (already in the project) for PDF generation.
 */

import { PDFDocument, rgb,StandardFonts } from "pdf-lib";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface FinalPayoutPacketOptions {
  includePhotos?: boolean;
  includeSupplements?: boolean;
  includeWeather?: boolean;
  format?: "pdf" | "docx" | "html";
}

export interface FinalPayoutPacket {
  id: string;
  claimId: string;
  generatedAt: Date;
  totalPayout: number;
  url?: string;
  pdfBytes?: Uint8Array;
  breakdown: {
    baseAmount: number;
    supplements: number;
    deductible: number;
    depreciation: number;
    netPayout: number;
  };
  documents: Array<{
    type: string;
    name: string;
    url: string;
  }>;
}

export async function generateFinalPayoutPacket(
  claimId: string,
  _options?: FinalPayoutPacketOptions
): Promise<FinalPayoutPacket> {
  // Fetch all claim data
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    include: {
      properties: true,
      depreciation_items: true,
      supplements: {
        where: { status: { not: "deleted" } },
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!claim) {
    throw new Error(`Claim ${claimId} not found`);
  }

  // Calculate financials
  const depItems = claim.depreciation_items || [];
  const totalRCV = depItems.reduce((sum, item) => sum + item.rcv, 0) || claim.estimatedValue || 0;
  const totalACV = depItems.reduce((sum, item) => sum + item.acv, 0) || claim.approvedValue || 0;
  const totalDepreciation = depItems.reduce((sum, item) => sum + (item.rcv - item.acv), 0);
  const deductible = claim.deductible || 0;
  const approvedSupplements = (claim.supplements || [])
    .filter((s) => s.status === "approved")
    .reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const netPayout = totalDepreciation + approvedSupplements;

  // Build PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const blue = rgb(0.12, 0.46, 0.84);
  const green = rgb(0.05, 0.55, 0.28);
  const grayColor = rgb(0.4, 0.4, 0.4);
  const black = rgb(0, 0, 0);
  const lightGray = rgb(0.93, 0.93, 0.93);

  const address = claim.properties
    ? [
        claim.properties.street,
        claim.properties.city,
        claim.properties.state,
        claim.properties.zipCode,
      ]
        .filter(Boolean)
        .join(", ")
    : "Address not available";

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

  // ── PAGE 1: Cover / Summary ──
  const page1 = pdfDoc.addPage([612, 792]);
  let y = 740;

  // Header band
  page1.drawRectangle({ x: 0, y: 742, width: 612, height: 50, color: blue });
  page1.drawText("FINAL PAYOUT PACKET", {
    x: 40,
    y: 757,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page1.drawText("SkaiScraper Pro", {
    x: 440,
    y: 757,
    size: 12,
    font,
    color: rgb(0.8, 0.9, 1),
  });

  y = 720;
  page1.drawText("Claim Summary", { x: 40, y, size: 14, font: fontBold, color: blue });
  y -= 24;

  const infoLines: [string, string][] = [
    ["Claim #", claim.claimNumber || claim.id.slice(0, 8)],
    ["Insured", claim.insured_name || "—"],
    ["Property", address],
    ["Carrier", claim.carrier || "—"],
    ["Policy #", claim.policy_number || "—"],
    ["Damage Type", claim.damageType || "—"],
    ["Date of Loss", claim.dateOfLoss ? claim.dateOfLoss.toLocaleDateString() : "—"],
  ];

  for (const [label, value] of infoLines) {
    page1.drawText(`${label}:`, { x: 40, y, size: 10, font: fontBold, color: grayColor });
    page1.drawText(String(value), { x: 160, y, size: 10, font, color: black });
    y -= 18;
  }

  y -= 20;
  // Financial Summary Box
  page1.drawRectangle({
    x: 30,
    y: y - 150,
    width: 552,
    height: 170,
    borderColor: green,
    borderWidth: 1.5,
    color: rgb(0.96, 1, 0.96),
  });

  page1.drawText("Amount Due from Carrier", {
    x: 40,
    y: y - 5,
    size: 14,
    font: fontBold,
    color: green,
  });

  const finLines: [string, string][] = [
    ["Total RCV (Replacement Cost)", fmt(totalRCV)],
    ["Total ACV (Actual Cash Value)", fmt(totalACV)],
    ["Total Depreciation Withheld", fmt(totalDepreciation)],
    ["Recoverable Depreciation", fmt(totalDepreciation)],
    ["Approved Supplements", fmt(approvedSupplements)],
    ["Deductible (already applied)", `(${fmt(deductible)})`],
  ];

  let fy = y - 30;
  for (const [label, value] of finLines) {
    page1.drawText(label, { x: 50, y: fy, size: 10, font, color: grayColor });
    page1.drawText(value, { x: 430, y: fy, size: 10, font, color: black });
    fy -= 18;
  }

  fy -= 5;
  page1.drawLine({
    start: { x: 50, y: fy + 8 },
    end: { x: 572, y: fy + 8 },
    thickness: 1,
    color: green,
  });
  page1.drawText("NET AMOUNT DUE", { x: 50, y: fy - 5, size: 12, font: fontBold, color: green });
  page1.drawText(fmt(netPayout), { x: 430, y: fy - 5, size: 14, font: fontBold, color: green });

  // ── PAGE 2: Depreciation Line Items ──
  if (depItems.length > 0) {
    const page2 = pdfDoc.addPage([612, 792]);
    let dy = 740;

    page2.drawText("Depreciation Schedule", {
      x: 40,
      y: dy,
      size: 14,
      font: fontBold,
      color: blue,
    });
    dy -= 30;

    const cols = [
      { label: "Item", x: 40 },
      { label: "RCV", x: 250 },
      { label: "ACV", x: 340 },
      { label: "Depreciation", x: 430 },
    ];

    page2.drawRectangle({ x: 35, y: dy - 5, width: 542, height: 18, color: lightGray });
    for (const col of cols) {
      page2.drawText(col.label, { x: col.x, y: dy, size: 9, font: fontBold, color: grayColor });
    }
    dy -= 22;

    for (const item of depItems) {
      if (dy < 60) break;
      const label = item.label || "Line item";
      page2.drawText(label.slice(0, 40), { x: 40, y: dy, size: 9, font, color: black });
      page2.drawText(fmt(item.rcv), { x: 250, y: dy, size: 9, font, color: black });
      page2.drawText(fmt(item.acv), { x: 340, y: dy, size: 9, font, color: black });
      page2.drawText(fmt(item.rcv - item.acv), { x: 430, y: dy, size: 9, font, color: black });
      dy -= 16;
    }

    dy -= 5;
    page2.drawLine({
      start: { x: 40, y: dy + 8 },
      end: { x: 572, y: dy + 8 },
      thickness: 1,
      color: grayColor,
    });
    page2.drawText("TOTAL", { x: 40, y: dy - 2, size: 10, font: fontBold, color: black });
    page2.drawText(fmt(totalRCV), { x: 250, y: dy - 2, size: 10, font: fontBold, color: black });
    page2.drawText(fmt(totalACV), { x: 340, y: dy - 2, size: 10, font: fontBold, color: black });
    page2.drawText(fmt(totalDepreciation), {
      x: 430,
      y: dy - 2,
      size: 10,
      font: fontBold,
      color: black,
    });
  }

  // ── PAGE 3: Supplements (if any) ──
  if (claim.supplements && claim.supplements.length > 0) {
    const page3 = pdfDoc.addPage([612, 792]);
    let sy = 740;

    page3.drawText("Supplement Summary", { x: 40, y: sy, size: 14, font: fontBold, color: blue });
    sy -= 30;

    for (const supp of claim.supplements) {
      const title = supp.notes || supp.claim_number || "Supplement";
      const amount = Number(supp.total) || 0;
      const status = supp.status || "pending";

      page3.drawText(`• ${title}`, { x: 50, y: sy, size: 10, font: fontBold, color: black });
      page3.drawText(`${fmt(amount)}  (${status})`, {
        x: 350,
        y: sy,
        size: 10,
        font,
        color: grayColor,
      });
      sy -= 20;
      if (sy < 60) break;
    }

    sy -= 10;
    page3.drawText(`Total Approved Supplements: ${fmt(approvedSupplements)}`, {
      x: 50,
      y: sy,
      size: 11,
      font: fontBold,
      color: green,
    });
  }

  // Footer on all pages
  const pages = pdfDoc.getPages();
  const now = new Date();
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    pg.drawText(
      `Generated by SkaiScraper Pro • ${now.toLocaleDateString()} • Page ${i + 1} of ${pages.length}`,
      { x: 40, y: 25, size: 8, font, color: grayColor }
    );
  }

  const pdfBytes = await pdfDoc.save();
  const packetId = `fpkt_${claimId}_${Date.now()}`;

  logger.info(`[FinalPayoutPacket] Generated ${pdfBytes.length} bytes for claim ${claimId}`);

  return {
    id: packetId,
    claimId,
    generatedAt: now,
    totalPayout: netPayout,
    pdfBytes,
    url: undefined,
    breakdown: {
      baseAmount: totalRCV,
      supplements: approvedSupplements,
      deductible,
      depreciation: totalDepreciation,
      netPayout,
    },
    documents: [],
  };
}
