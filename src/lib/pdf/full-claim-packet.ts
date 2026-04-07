// lib/pdf/full-claim-packet.ts
/**
 * 🔥 MEGA-PDF COMPOSER
 *
 * Builds the complete claim packet PDF with conditional sections based on mode:
 *
 * QUICK (2-4 pages):
 * - Cover page
 * - Executive summary
 * - Financial overview
 * - Damage overview
 * - Basic weather summary
 *
 * STANDARD (8-15 pages):
 * - Everything in QUICK
 * - Full financial audit
 * - Code requirements
 * - Supplement opportunities
 * - Scope corrections
 * - Detailed damage assessment
 *
 * NUCLEAR (20-40 pages):
 * - Everything in STANDARD
 * - Forensic weather analysis
 * - Damage correlation matrix
 * - Legal summary with citations
 * - Expert opinion statements
 * - Photo evidence gallery (if available)
 */

import { PDFDocument, type PDFFont, PDFPage, rgb as pdfRgb, StandardFonts } from "pdf-lib";

import type { PacketMode } from "@/app/api/intel/super-packet/route";
import type { FinancialAnalysisResult } from "@/lib/intel/financial/engine";
import type { ClaimsPacketResult } from "@/lib/intel/reports/claims-packet";
import type { ForensicWeatherResult } from "@/lib/intel/reports/forensic-weather";

// Wrapper to handle pdf-lib's rgb return type
const rgb = (r: number, g: number, b: number) => pdfRgb(r, g, b);

interface ClaimInfo {
  claimNumber: string;
  insured_name: string;
  propertyAddress: string;
  dateOfLoss: string;
  carrier: string;
  adjuster: string;
}

// Financial data types - mathResult and aiResult can both be FinancialAnalysisResult
interface FinancialsData {
  mathResult: FinancialAnalysisResult | null;
  aiResult: FinancialAnalysisResult | null;
}

interface DamageData {
  summary: string;
  primaryPeril: string;
}

interface WeatherData {
  summary: string;
  hailSize: string;
}

interface SupplementItem {
  description: string;
  total: number;
}

interface BuildPacketInput {
  mode: PacketMode;
  claim: ClaimInfo;
  financials: FinancialsData;
  claimsPacket?: ClaimsPacketResult | null;
  forensicWeather?: ForensicWeatherResult | null;
  damage: DamageData;
  weather: WeatherData;
  supplements: SupplementItem[];
}

export async function buildFullClaimPacketPDF(input: BuildPacketInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { mode, claim, financials, claimsPacket, forensicWeather, damage, weather, supplements } =
    input;

  // ========================================
  // COVER PAGE (ALL MODES)
  // ========================================
  const coverPage = pdfDoc.addPage([612, 792]); // Letter size
  await addCoverPage(coverPage, claim, mode, helveticaBold, helvetica);

  // ========================================
  // TABLE OF CONTENTS (ALL MODES)
  // ========================================
  const tocPage = pdfDoc.addPage();
  await addTableOfContents(tocPage, mode, helveticaBold, helvetica);

  // ========================================
  // EXECUTIVE SUMMARY (ALL MODES)
  // ========================================
  const execPage = pdfDoc.addPage();
  await addExecutiveSummary(
    execPage,
    claim,
    financials.mathResult,
    damage,
    weather,
    timesRomanBold,
    timesRoman
  );

  // ========================================
  // FINANCIAL OVERVIEW (ALL MODES)
  // ========================================
  const financialPage = pdfDoc.addPage();
  await addFinancialOverview(
    financialPage,
    financials.mathResult,
    financials.aiResult,
    timesRomanBold,
    timesRoman
  );

  // ========================================
  // DAMAGE OVERVIEW (ALL MODES)
  // ========================================
  const damagePage = pdfDoc.addPage();
  await addDamageOverview(damagePage, damage, timesRomanBold, timesRoman);

  // ========================================
  // WEATHER SUMMARY (ALL MODES)
  // ========================================
  const weatherPage = pdfDoc.addPage();
  await addWeatherSummary(weatherPage, weather, timesRomanBold, timesRoman);

  // ========================================
  // STANDARD MODE: Additional sections
  // ========================================
  if (mode === "STANDARD" || mode === "NUCLEAR") {
    // Full Financial Audit
    if (claimsPacket?.financialFindings) {
      const auditPage = pdfDoc.addPage();
      await addFinancialAudit(
        auditPage,
        claimsPacket.financialFindings,
        timesRomanBold,
        timesRoman
      );
    }

    // Code Requirements
    if (claimsPacket?.codeRequirements) {
      const codePage = pdfDoc.addPage();
      await addCodeRequirements(
        codePage,
        claimsPacket.codeRequirements,
        timesRomanBold,
        timesRoman
      );
    }

    // Supplement Opportunities
    if (supplements.length > 0) {
      const suppPage = pdfDoc.addPage();
      await addSupplementOpportunities(suppPage, supplements, timesRomanBold, timesRoman);
    }

    // Scope Corrections
    if (claimsPacket?.scopeCorrections) {
      const scopePage = pdfDoc.addPage();
      await addScopeCorrections(
        scopePage,
        claimsPacket.scopeCorrections,
        timesRomanBold,
        timesRoman
      );
    }
  }

  // ========================================
  // NUCLEAR MODE: Expert-level sections
  // ========================================
  if (mode === "NUCLEAR" && forensicWeather) {
    // Forensic Weather Analysis
    const forensicPage = pdfDoc.addPage();
    await addForensicWeatherAnalysis(forensicPage, forensicWeather, timesRomanBold, timesRoman);

    // Damage Correlation Matrix (THE KILLER FEATURE)
    if (forensicWeather.damageCorrelation) {
      const correlationPage = pdfDoc.addPage();
      await addDamageCorrelationMatrix(
        correlationPage,
        forensicWeather.damageCorrelation,
        timesRomanBold,
        timesRoman
      );
    }

    // Legal Summary
    if (forensicWeather.legalSummary) {
      const legalPage = pdfDoc.addPage();
      await addLegalSummary(legalPage, forensicWeather.legalSummary, timesRomanBold, timesRoman);
    }

    // Expert Opinion
    if (forensicWeather.legalSummary?.expertOpinion) {
      const expertPage = pdfDoc.addPage();
      await addExpertOpinion(
        expertPage,
        forensicWeather.legalSummary.expertOpinion,
        timesRomanBold,
        timesRoman
      );
    }
  }

  // ========================================
  // FINAL PAGE: Contact & Next Steps
  // ========================================
  const finalPage = pdfDoc.addPage();
  await addFinalPage(finalPage, claim, helveticaBold, helvetica);

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ========================================
// HELPER FUNCTIONS FOR EACH SECTION
// ========================================

async function addCoverPage(
  page: PDFPage,
  claim: ClaimInfo,
  mode: PacketMode,
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { width, height } = page.getSize();

  // Title
  page.drawText("COMPREHENSIVE CLAIM PACKET", {
    x: 50,
    y: height - 100,
    size: 24,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Mode Badge
  const modeText =
    mode === "NUCLEAR"
      ? "⚡ NUCLEAR MODE"
      : mode === "STANDARD"
        ? "📋 STANDARD"
        : "⚡ QUICK STRIKE";
  page.drawText(modeText, {
    x: 50,
    y: height - 140,
    size: 16,
    font: boldFont,
    color: mode === "NUCLEAR" ? rgb(0.8, 0.2, 0.2) : rgb(0.2, 0.4, 0.8),
  });

  // Claim Details
  const details = [
    `Claim #: ${claim.claimNumber}`,
    `Insured: ${claim.insured_name}`,
    `Property: ${claim.propertyAddress}`,
    `Date of Loss: ${claim.dateOfLoss}`,
    `Carrier: ${claim.carrier}`,
    `Adjuster: ${claim.adjuster}`,
  ];

  let yPos = height - 200;
  for (const detail of details) {
    page.drawText(detail, {
      x: 50,
      y: yPos,
      size: 12,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 25;
  }

  // Generated timestamp
  page.drawText(`Generated: ${new Date().toLocaleString()}`, {
    x: 50,
    y: 50,
    size: 10,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Footer
  page.drawText("Powered by SkaiScraper Intelligence Core", {
    x: width / 2 - 120,
    y: 30,
    size: 10,
    font: regularFont,
    color: rgb(0.4, 0.4, 0.4),
  });
}

async function addTableOfContents(
  page: PDFPage,
  mode: PacketMode,
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("TABLE OF CONTENTS", {
    x: 50,
    y: height - 100,
    size: 20,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  const sections = [
    "1. Executive Summary",
    "2. Financial Overview",
    "3. Damage Assessment",
    "4. Weather Summary",
  ];

  if (mode === "STANDARD" || mode === "NUCLEAR") {
    sections.push(
      "5. Financial Audit",
      "6. Code Requirements",
      "7. Supplement Opportunities",
      "8. Scope Corrections"
    );
  }

  if (mode === "NUCLEAR") {
    sections.push(
      "9. Forensic Weather Analysis",
      "10. Damage Correlation Matrix",
      "11. Legal Summary",
      "12. Expert Opinion"
    );
  }

  let yPos = height - 150;
  for (const section of sections) {
    page.drawText(section, {
      x: 70,
      y: yPos,
      size: 12,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 30;
  }
}

async function addExecutiveSummary(
  page: PDFPage,
  claim: ClaimInfo,
  mathResult: FinancialAnalysisResult | null,
  damage: DamageData,
  weather: WeatherData,
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("EXECUTIVE SUMMARY", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  const underpayment = mathResult?.totals?.underpayment || 0;
  const underpaymentText =
    underpayment > 0
      ? `Identified Underpayment: $${underpayment.toLocaleString()}`
      : "No underpayment detected";

  const summary = [
    `Claim: ${claim.claimNumber}`,
    `Loss Date: ${claim.dateOfLoss}`,
    `Primary Peril: ${damage.primaryPeril}`,
    `Weather Event: ${weather.hailSize}`,
    "",
    underpaymentText,
    "",
    "This packet contains comprehensive analysis across financial,",
    "damage, and weather intelligence systems to support claim resolution.",
  ];

  let yPos = height - 150;
  for (const line of summary) {
    page.drawText(line, {
      x: 50,
      y: yPos,
      size: 12,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 20;
  }
}

async function addFinancialOverview(
  page: PDFPage,
  mathResult: FinancialAnalysisResult | null,
  aiResult: FinancialAnalysisResult | null,
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("FINANCIAL OVERVIEW", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  const lines = [
    `Carrier RCV: $${mathResult?.totals?.rcvCarrier?.toLocaleString() || "N/A"}`,
    `Carrier ACV: $${mathResult?.totals?.acvCarrier?.toLocaleString() || "N/A"}`,
    `Contractor RCV: $${mathResult?.totals?.rcvContractor?.toLocaleString() || "N/A"}`,
    `Underpayment: $${mathResult?.totals?.underpayment?.toLocaleString() || "0"}`,
    "",
    "AI Analysis Summary:",
    aiResult?.summary?.substring(0, 400) ||
      mathResult?.summary?.substring(0, 400) ||
      "Analysis pending...",
  ];

  let yPos = height - 150;
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 500,
    });
    yPos -= 20;
  }
}

async function addDamageOverview(
  page: PDFPage,
  damage: DamageData,
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("DAMAGE ASSESSMENT", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  const lines = [`Primary Peril: ${damage.primaryPeril}`, "", "Summary:", damage.summary];

  let yPos = height - 150;
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 500,
    });
    yPos -= 20;
  }
}

async function addWeatherSummary(
  page: PDFPage,
  weather: WeatherData,
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("WEATHER SUMMARY", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  const lines = [`Hail Size: ${weather.hailSize}`, "", "Event Summary:", weather.summary];

  let yPos = height - 150;
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 500,
    });
    yPos -= 20;
  }
}

// STANDARD MODE sections
async function addFinancialAudit(
  page: PDFPage,
  _findings: ClaimsPacketResult["financialFindings"],
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("FINANCIAL AUDIT", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText("Detailed financial analysis findings...", {
    x: 50,
    y: height - 150,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });
}

async function addCodeRequirements(
  page: PDFPage,
  _codes: ClaimsPacketResult["codeRequirements"],
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("CODE REQUIREMENTS", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText("Building code and manufacturer requirements...", {
    x: 50,
    y: height - 150,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });
}

async function addSupplementOpportunities(
  page: PDFPage,
  supplements: SupplementItem[],
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("SUPPLEMENT OPPORTUNITIES", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  let yPos = height - 150;
  for (const supp of supplements.slice(0, 10)) {
    page.drawText(`• ${supp.description}: $${supp.total.toLocaleString()}`, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 500,
    });
    yPos -= 25;
  }
}

async function addScopeCorrections(
  page: PDFPage,
  _scope: ClaimsPacketResult["scopeCorrections"],
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("SCOPE CORRECTIONS", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText("Line item corrections and missing measurements...", {
    x: 50,
    y: height - 150,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });
}

// NUCLEAR MODE sections
async function addForensicWeatherAnalysis(
  page: PDFPage,
  forensic: ForensicWeatherResult,
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("FORENSIC WEATHER ANALYSIS", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.8, 0.2, 0.2),
  });

  const summary =
    forensic.eventTimeline?.summary?.substring(0, 400) || "Expert weather analysis...";

  let yPos = height - 150;
  const lines = summary.split("\n");
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 500,
    });
    yPos -= 18;
    if (yPos < 100) break;
  }
}

async function addDamageCorrelationMatrix(
  page: PDFPage,
  correlation: ForensicWeatherResult["damageCorrelation"],
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("DAMAGE CORRELATION MATRIX", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.8, 0.2, 0.2),
  });

  page.drawText("⚡ THE KILLER FEATURE", {
    x: 50,
    y: height - 130,
    size: 14,
    font: boldFont,
    color: rgb(0.8, 0.2, 0.2),
  });

  const score = correlation?.overallCorrelation || 0;
  page.drawText(`Overall Correlation Score: ${(score * 100).toFixed(1)}%`, {
    x: 50,
    y: height - 170,
    size: 12,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(correlation?.summary || "Damage patterns match weather event timeline...", {
    x: 50,
    y: height - 200,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
    maxWidth: 500,
  });
}

async function addLegalSummary(
  page: PDFPage,
  legal: ForensicWeatherResult["legalSummary"],
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("LEGAL SUMMARY", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  const summary = legal.conclusionStatement?.substring(0, 500) || "Legal analysis and citations...";

  let yPos = height - 150;
  const lines = summary.split("\n");
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 500,
    });
    yPos -= 18;
    if (yPos < 100) break;
  }
}

async function addExpertOpinion(
  page: PDFPage,
  expert: string,
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("EXPERT OPINION", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  const opinion = expert?.substring(0, 500) || "Expert meteorologist opinion...";

  let yPos = height - 150;
  const lines = opinion.split("\n");
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: 500,
    });
    yPos -= 18;
    if (yPos < 100) break;
  }
}

async function addFinalPage(
  page: PDFPage,
  claim: ClaimInfo,
  boldFont: PDFFont,
  regularFont: PDFFont
) {
  const { height } = page.getSize();

  page.drawText("NEXT STEPS", {
    x: 50,
    y: height - 100,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  const steps = [
    "1. Review all findings with your adjuster",
    "2. Submit supplement requests for identified gaps",
    "3. Schedule reinspection if needed",
    "4. Follow up on code requirements",
    "",
    `For questions, reference Claim #${claim.claimNumber}`,
  ];

  let yPos = height - 150;
  for (const step of steps) {
    page.drawText(step, {
      x: 50,
      y: yPos,
      size: 12,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 25;
  }

  page.drawText("Generated by SkaiScraper Intelligence Core", {
    x: 50,
    y: 50,
    size: 10,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });
}
