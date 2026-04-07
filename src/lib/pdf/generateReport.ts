import { jsPDF } from "jspdf";

import type { OrgBranding } from "@/lib/branding/fetchBranding";
import { applyBrandingToJsPDF } from "@/lib/pdf/components/PDFHeader";

export type ReportData = {
  executiveSummary: string;
  damageAssessment: Array<{
    photo: number;
    findings: string;
    severity: string;
    affected_area: string;
  }>;
  materialList: Array<{
    item: string;
    quantity: number;
    unit: string;
    cost: number;
  }>;
  costEstimate: {
    materials: number;
    labor: number;
    total: number;
    breakdown?: string;
  };
  recommendations: string[];
};

export type ReportMetadata = {
  flow: "insurance" | "retail";
  lossType?: string;
  financingType?: string;
  financingTerm?: number;
  addOns: string[];
  photos: { url: string; name: string }[];
  generatedAt: string;
  reportId: string;
  organizationName?: string;
  propertyAddress?: string;
};

/**
 * Generate Insurance Claim Report PDF
 * Formal, carrier-focused template with technical details
 */
export function generateInsuranceReport(
  report: ReportData,
  metadata: ReportMetadata,
  branding: OrgBranding | null
): Blob {
  const doc = new jsPDF();

  // ===============================
  // BRANDING INJECTION
  // ===============================
  const logo = branding?.logoUrl ?? null;
  const primaryColor = branding?.colorPrimary ?? "#0A1A2F";
  const secondaryColor = branding?.colorAccent ?? "#117CFF";
  const businessName = branding?.companyName ?? "SkaiScraper";
  const phone = branding?.phone ?? "";
  const email = branding?.email ?? "";
  const website = branding?.website ?? "";
  const license = branding?.license ?? "";

  // Apply branding colors
  const { primaryRgb, secondaryRgb: _secondaryRgb } = applyBrandingToJsPDF(doc, {
    logo,
    businessName,
    phone,
    email,
    website,
    license,
    primaryColor,
    secondaryColor,
  });

  let yPos = 20;

  // === BRANDED HEADER ===
  if (logo) {
    // Add logo (note: jsPDF requires base64 or proper image loading)
    // For now, we'll add company name prominently
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.text(businessName, 105, yPos, { align: "center" });
    yPos += 8;
  } else {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
    doc.text(businessName, 105, yPos, { align: "center" });
    yPos += 8;
  }

  // Contact info line
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const contactLine = [phone, email, website].filter(Boolean).join(" | ");
  if (contactLine) {
    doc.text(contactLine, 105, yPos, { align: "center" });
    yPos += 6;
  }
  if (license) {
    doc.text(`License: ${license}`, 105, yPos, { align: "center" });
    yPos += 8;
  }

  // Header divider line
  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.setLineWidth(1);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;

  // === COVER PAGE ===
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("PROPERTY DAMAGE CLAIM REPORT", 105, yPos, { align: "center" });
  yPos += 15;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text(`Loss Type: ${metadata.lossType?.toUpperCase() || "UNKNOWN"}`, 105, yPos, {
    align: "center",
  });
  yPos += 10;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Report ID: ${metadata.reportId}`, 105, yPos, { align: "center" });
  yPos += 6;
  doc.text(`Generated: ${metadata.generatedAt}`, 105, yPos, {
    align: "center",
  });
  yPos += 20;

  // Property details box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 248, 248);
  doc.rect(20, yPos, 170, 30, "FD");
  yPos += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Property Information", 25, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.text(`Address: ${metadata.propertyAddress || "Not Provided"}`, 25, yPos);
  yPos += 6;
  doc.text(`Organization: ${metadata.organizationName || "SkaiScraper User"}`, 25, yPos);
  yPos += 6;
  doc.text(`Photos Submitted: ${metadata.photos.length}`, 25, yPos);
  yPos += 20;

  // Add-ons section
  if (metadata.addOns.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Included Services:", 20, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    metadata.addOns.forEach((addon) => {
      doc.text(`• ${addon}`, 25, yPos);
      yPos += 6;
    });
    yPos += 10;
  }

  // === EXECUTIVE SUMMARY ===
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text("EXECUTIVE SUMMARY", 20, yPos);
  yPos += 3;

  // Section underline with brand color
  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 100, yPos);
  yPos += 8;

  doc.setTextColor(0, 0, 0);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summaryLines = doc.splitTextToSize(report.executiveSummary, 170) as string[];
  doc.text(summaryLines, 20, yPos);
  yPos += summaryLines.length * 6 + 10;

  // === DAMAGE ASSESSMENT ===
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text("DAMAGE ASSESSMENT", 20, yPos);
  yPos += 3;

  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 100, yPos);
  yPos += 8;

  doc.setTextColor(0, 0, 0);

  report.damageAssessment.forEach((item, _index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Photo ${item.photo}: ${item.severity.toUpperCase()}`, 20, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Area: ${item.affected_area}`, 20, yPos);
    yPos += 6;

    doc.setTextColor(0, 0, 0);
    const findingsLines = doc.splitTextToSize(item.findings, 170) as string[];
    doc.text(findingsLines, 20, yPos);
    yPos += findingsLines.length * 6 + 8;
  });

  // === MATERIAL LIST ===
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text("MATERIAL LIST", 20, yPos);
  yPos += 3;

  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 80, yPos);
  yPos += 8;

  doc.setTextColor(0, 0, 0);

  // Table header
  doc.setFontSize(10);
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos, 170, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Item", 25, yPos + 5);
  doc.text("Quantity", 100, yPos + 5);
  doc.text("Unit", 130, yPos + 5);
  doc.text("Cost", 160, yPos + 5);
  yPos += 12;

  // Table rows
  doc.setFont("helvetica", "normal");
  report.materialList.forEach((item) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(item.item, 25, yPos);
    doc.text(item.quantity.toString(), 100, yPos);
    doc.text(item.unit, 130, yPos);
    doc.text(`$${item.cost.toLocaleString()}`, 160, yPos);
    yPos += 7;
  });

  // === COST ESTIMATE ===
  yPos += 10;
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("COST ESTIMATE", 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Materials: $${report.costEstimate.materials.toLocaleString()}`, 20, yPos);
  yPos += 7;
  doc.text(`Labor: $${report.costEstimate.labor.toLocaleString()}`, 20, yPos);
  yPos += 7;

  doc.setDrawColor(0, 0, 0);
  doc.line(20, yPos, 100, yPos);
  yPos += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`TOTAL ESTIMATE: $${report.costEstimate.total.toLocaleString()}`, 20, yPos);
  yPos += 15;

  if (report.costEstimate.breakdown) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const breakdownLines = doc.splitTextToSize(report.costEstimate.breakdown, 170) as string[];
    doc.text(breakdownLines, 20, yPos);
    yPos += breakdownLines.length * 6;
  }

  // === RECOMMENDATIONS ===
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text("RECOMMENDATIONS", 20, yPos);
  yPos += 3;

  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 95, yPos);
  yPos += 8;

  doc.setTextColor(0, 0, 0);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  report.recommendations.forEach((rec, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(`${index + 1}. ${rec}`, 20, yPos);
    yPos += 7;
  });

  // === BRANDED FOOTER on last page ===
  const footerY = 280;

  // Footer divider line
  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.setLineWidth(0.5);
  doc.line(20, footerY - 5, 190, footerY - 5);

  // Company info
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text(businessName, 105, footerY, { align: "center" });

  // Contact details
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const footerContactLine = [phone, email, website].filter(Boolean).join(" | ");
  if (footerContactLine) {
    doc.text(footerContactLine, 105, footerY + 5, { align: "center" });
  }

  // License info
  if (license) {
    doc.text(`License: ${license}`, 105, footerY + 9, { align: "center" });
  }

  // Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "This report was generated using AI-powered analysis. Professional inspection recommended.",
    105,
    footerY + 14,
    { align: "center" }
  );

  return doc.output("blob");
}

/**
 * Generate Retail Estimate Report PDF
 * Customer-friendly template with financing options
 */
export function generateRetailReport(
  report: ReportData,
  metadata: ReportMetadata,
  branding: OrgBranding | null
): Blob {
  const doc = new jsPDF();

  // ===============================
  // BRANDING INJECTION
  // ===============================
  const logo = branding?.logoUrl ?? null;
  const primaryColor = branding?.colorPrimary ?? "#10B981"; // Emerald-500 default
  const secondaryColor = branding?.colorAccent ?? "#FFC838";
  const businessName = branding?.companyName ?? "SkaiScraper";
  const phone = branding?.phone ?? "";
  const email = branding?.email ?? "";
  const website = branding?.website ?? "";
  const license = branding?.license ?? "";

  const { primaryRgb, secondaryRgb: _secondaryRgb } = applyBrandingToJsPDF(doc, {
    logo,
    businessName,
    phone,
    email,
    website,
    license,
    primaryColor,
    secondaryColor,
  });

  let yPos = 20;

  // === BRANDED HEADER ===
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text(businessName, 105, yPos, { align: "center" });
  yPos += 6;

  const contactLine = [phone, email, website].filter(Boolean).join(" | ");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  if (contactLine) {
    doc.text(contactLine, 105, yPos, { align: "center" });
    yPos += 5;
  }
  if (license) {
    doc.text(`License: ${license}`, 105, yPos, { align: "center" });
    yPos += 7;
  }

  doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.setLineWidth(1);
  doc.line(20, yPos, 190, yPos);
  yPos += 12;

  // === COVER PAGE ===
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
  doc.text("PROJECT ESTIMATE", 105, yPos, { align: "center" });
  yPos += 12;

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Your Dream Project, Simplified", 105, yPos, { align: "center" });
  yPos += 20;

  // Decorative line
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.line(50, yPos, 160, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Estimate ID: ${metadata.reportId}`, 105, yPos, { align: "center" });
  yPos += 6;
  doc.text(`Date: ${metadata.generatedAt}`, 105, yPos, { align: "center" });
  yPos += 20;

  // Property details box (styled differently)
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.roundedRect(20, yPos, 170, 35, 3, 3, "FD");
  yPos += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("📍 Project Details", 25, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Location: ${metadata.propertyAddress || "Your Property"}`, 25, yPos);
  yPos += 6;
  doc.text(`Prepared for: ${metadata.organizationName || "Valued Customer"}`, 25, yPos);
  yPos += 6;
  doc.text(`Photos Reviewed: ${metadata.photos.length}`, 25, yPos);
  yPos += 20;

  // Financing info (if applicable)
  if (metadata.financingType === "financing" && metadata.financingTerm) {
    const monthlyPayment = (report.costEstimate.total / metadata.financingTerm).toFixed(2);

    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(251, 191, 36); // Amber-400
    doc.roundedRect(20, yPos, 170, 25, 3, 3, "FD");
    yPos += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("💳 Financing Option Available", 25, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${metadata.financingTerm} monthly payments of $${monthlyPayment}`, 25, yPos);
    yPos += 6;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("(Subject to credit approval)", 25, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;
  }

  // Add-ons section (if any)
  if (metadata.addOns.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("✨ Premium Services Included:", 20, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    metadata.addOns.forEach((addon) => {
      doc.text(`✓ ${addon}`, 25, yPos);
      yPos += 6;
    });
    yPos += 10;
  }

  // === PROJECT OVERVIEW ===
  doc.addPage();
  yPos = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("📋 Project Overview", 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const summaryLines2 = doc.splitTextToSize(report.executiveSummary, 170) as string[];
  doc.text(summaryLines2, 20, yPos);
  yPos += summaryLines2.length * 6 + 15;

  // === WHAT WE FOUND ===
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("🔍 What We Found", 20, yPos);
  yPos += 10;

  report.damageAssessment.forEach((item, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`Area ${index + 1}: ${item.affected_area}`, 20, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const findingsLines2 = doc.splitTextToSize(item.findings, 170) as string[];
    doc.text(findingsLines2, 20, yPos);
    yPos += findingsLines2.length * 6 + 8;
  });

  // === MATERIALS & PRICING ===
  doc.addPage();
  yPos = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("💰 Investment Breakdown", 20, yPos);
  yPos += 12;

  // Styled table header
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(20, yPos, 170, 10, 2, 2, "FD");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Item", 25, yPos + 6);
  doc.text("Qty", 100, yPos + 6);
  doc.text("Unit", 125, yPos + 6);
  doc.text("Price", 160, yPos + 6);
  yPos += 14;

  // Table rows with alternating colors
  doc.setFont("helvetica", "normal");
  report.materialList.forEach((item, index) => {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251); // Gray-50
      doc.rect(20, yPos - 4, 170, 8, "F");
    }

    doc.text(item.item, 25, yPos);
    doc.text(item.quantity.toString(), 100, yPos);
    doc.text(item.unit, 125, yPos);
    doc.text(`$${item.cost.toLocaleString()}`, 160, yPos);
    yPos += 8;
  });

  // === TOTAL INVESTMENT ===
  yPos += 10;
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFillColor(16, 185, 129);
  doc.roundedRect(20, yPos, 170, 30, 3, 3, "F");
  yPos += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text(`Materials:`, 25, yPos);
  doc.text(`$${report.costEstimate.materials.toLocaleString()}`, 160, yPos, {
    align: "right",
  });
  yPos += 7;
  doc.text(`Professional Installation:`, 25, yPos);
  doc.text(`$${report.costEstimate.labor.toLocaleString()}`, 160, yPos, {
    align: "right",
  });
  yPos += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`TOTAL INVESTMENT:`, 25, yPos);
  doc.text(`$${report.costEstimate.total.toLocaleString()}`, 160, yPos, {
    align: "right",
  });

  // === NEXT STEPS ===
  doc.addPage();
  yPos = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("🚀 Next Steps", 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  report.recommendations.forEach((rec, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    const stepNum = `${index + 1}.`;
    doc.setFont("helvetica", "bold");
    doc.text(stepNum, 20, yPos);
    doc.setFont("helvetica", "normal");
    const recLines = doc.splitTextToSize(rec, 160) as string[];
    doc.text(recLines, 30, yPos);
    yPos += recLines.length * 6 + 3;
  });

  // Footer with branding
  yPos = 270;
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.setFont("helvetica", "bold");
  doc.text("Thank you for choosing us!", 105, yPos, { align: "center" });
  yPos += 6;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text("This estimate is powered by AI analysis and professional expertise.", 105, yPos, {
    align: "center",
  });

  return doc.output("blob");
}

/**
 * Main entry point - generates PDF based on flow type
 * NOW WITH FULL BRANDING SUPPORT
 */
export function generateReportPDF(
  report: ReportData,
  metadata: ReportMetadata,
  branding: OrgBranding | null = null
): Blob {
  if (metadata.flow === "insurance") {
    return generateInsuranceReport(report, metadata, branding);
  } else {
    return generateRetailReport(report, metadata, branding);
  }
}
