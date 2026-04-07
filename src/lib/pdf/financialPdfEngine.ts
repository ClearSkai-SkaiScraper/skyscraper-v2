// lib/pdf/financialPdfEngine.ts
import { PDFDocument, rgb as pdfRgb, StandardFonts } from "pdf-lib";

// Wrapper to handle pdf-lib's rgb return type
const rgb = (r: number, g: number, b: number) => pdfRgb(r, g, b);

interface CarrierContractorFinancials {
  rcv?: number;
  acv?: number;
}

interface DepreciationData {
  carrierApplied?: number;
  correctAmount?: number;
}

interface SettlementProjection {
  min?: number;
  max?: number;
  expected?: number;
  confidence?: number;
}

interface MathResult {
  carrier?: CarrierContractorFinancials;
  contractor?: CarrierContractorFinancials;
  underpayment?: number;
  deductible?: number;
  totalPaid?: number;
  depreciation?: DepreciationData;
}

interface AIResult {
  depreciationNarrative?: string;
  supplementSummary?: string;
  settlementProjection?: SettlementProjection;
  additionalNotes?: string;
  projectionNarrative?: string;
  reportRefs?: string[];
  summary?: string;
}

type FinancialPDFInput = {
  claimNumber?: string;
  insured_name?: string;
  propertyAddress?: string;
  dateOfLoss?: string;
  mathResult: MathResult | null;
  aiResult: AIResult | null;
};

export async function buildFinancialPDF(input: FinancialPDFInput) {
  const { claimNumber, insured_name, propertyAddress, dateOfLoss, mathResult, aiResult } = input;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // Letter 8.5 x 11

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = 750;

  // HEADER
  page.drawText("Financial Claim Audit Report", {
    x: 40,
    y,
    size: 20,
    font: bold,
    color: rgb(0.1, 0.1, 0.4),
  });
  y -= 24;

  if (claimNumber) {
    page.drawText(`Claim #: ${claimNumber}`, {
      x: 40,
      y,
      size: 11,
      font,
    });
    y -= 14;
  }

  if (insured_name) {
    page.drawText(`Insured: ${insured_name}`, {
      x: 40,
      y,
      size: 11,
      font,
    });
    y -= 14;
  }

  if (propertyAddress) {
    page.drawText(`Property: ${propertyAddress}`, {
      x: 40,
      y,
      size: 11,
      font,
    });
    y -= 14;
  }

  if (dateOfLoss) {
    page.drawText(`Date of Loss: ${dateOfLoss}`, {
      x: 40,
      y,
      size: 11,
      font,
    });
    y -= 20;
  }

  // Divider
  page.drawLine({
    start: { x: 40, y },
    end: { x: 572, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 24;

  const section = (label: string) => {
    y -= 8;
    page.drawText(label, {
      x: 40,
      y,
      size: 14,
      font: bold,
      color: rgb(0.1, 0.1, 0.4),
    });
    y -= 18;
  };

  const textLine = (label: string, value: string) => {
    page.drawText(`${label}: ${value}`, {
      x: 40,
      y,
      size: 11,
      font,
    });
    y -= 14;
  };

  // SUMMARY SECTION
  section("Summary Totals");

  const carrierRCV = mathResult?.carrier?.rcv ?? 0;
  const contractorRCV = mathResult?.contractor?.rcv ?? 0;
  const underpayment = mathResult?.underpayment ?? 0;
  const deductible = mathResult?.deductible ?? 0;
  const totalPaid = mathResult?.totalPaid ?? 0;

  textLine("Carrier RCV", `$${carrierRCV.toLocaleString()}`);
  textLine("Contractor RCV", `$${contractorRCV.toLocaleString()}`);
  textLine("Total Paid to Date", `$${totalPaid.toLocaleString()}`);
  textLine("Deductible", `$${deductible.toLocaleString()}`);
  textLine("Estimated Underpayment", `$${underpayment.toLocaleString()}`);

  // DEPRECIATION SECTION
  section("Depreciation Analysis");

  const dep = mathResult?.depreciation || {};
  const depCarrier = dep.carrierApplied ?? 0;
  const depCorrect = dep.correctAmount ?? depCarrier;
  const depDiff = depCorrect - depCarrier;

  textLine("Carrier Depreciation Applied", `$${depCarrier.toLocaleString()}`);
  textLine("Correct Depreciation (Estimated)", `$${depCorrect.toLocaleString()}`);
  textLine("Depreciation Delta", `${depDiff >= 0 ? "+" : ""}$${depDiff.toLocaleString()}`);

  if (aiResult?.depreciationNarrative) {
    y -= 4;
    wrapTextBlock(page, font, aiResult.depreciationNarrative, 40, y, (newY) => {
      y = newY;
    });
  }

  // LINE ITEM / SUPPLEMENT SUMMARY
  section("Line Item & Supplement Opportunities");

  if (aiResult?.supplementSummary) {
    wrapTextBlock(page, font, aiResult.supplementSummary, 40, y, (newY) => {
      y = newY;
    });
  } else {
    textLine("Summary", "See attached supplement packet for detailed line items.");
  }

  // SETTLEMENT PROJECTION
  section("Settlement Projection");

  const proj = aiResult?.settlementProjection || {};
  const projMin = proj.min ?? 0;
  const projMax = proj.max ?? 0;
  const projConf = proj.confidence ?? 0;

  textLine(
    "Expected Settlement Range",
    `$${projMin.toLocaleString()} – $${projMax.toLocaleString()}`
  );
  textLine("Confidence", `${Math.round(projConf * 100)}%`);

  if (aiResult?.projectionNarrative) {
    y -= 4;
    wrapTextBlock(page, font, aiResult.projectionNarrative, 40, y, (newY) => {
      y = newY;
    });
  }

  // LINKED REPORTS & SUPPLEMENTS
  if (aiResult?.reportRefs && aiResult.reportRefs.length > 0) {
    section("Linked Reports & Supplements");
    wrapTextBlock(page, font, aiResult.reportRefs.join("\n"), 40, y, (newY) => {
      y = newY;
    });
  }

  // FINAL SUMMARY
  section("Financial Conclusions");

  if (aiResult?.summary) {
    wrapTextBlock(page, font, aiResult.summary, 40, y, (newY) => {
      y = newY;
    });
  }

  const pdfBytes = await pdf.save();
  return pdfBytes;
}

import type { PDFFont, PDFPage } from "pdf-lib";

function wrapTextBlock(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  startY: number,
  setY: (newY: number) => void
) {
  const lines = wrapText(text, 90);
  let currentY = startY;

  for (const line of lines) {
    page.drawText(line, {
      x,
      y: currentY,
      size: 11,
      font,
    });
    currentY -= 14;
  }

  currentY -= 8; // Extra space after block
  setY(currentY);
}

function wrapText(text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if ((line + word).length > width) {
      lines.push(line.trim());
      line = "";
    }
    line += word + " ";
  }
  if (line.length > 0) lines.push(line.trim());
  return lines;
}
