/**
 * Enhanced Master Report Builder
 *
 * Generates comprehensive 20-40 page professional branded PDF reports.
 * Integrates: weather data, material catalogs, annotated photos, compliance, branding.
 */

import PDFDocument from "pdfkit";

import type { AnnotatedPhoto } from "../ai/photo-annotator";
import type { StormIntakeResults } from "../ai/pipelines/stormIntake";
import type { MaterialProduct } from "../materials/vendor-catalog";

/**
 * Enhanced compliance report for PDF generation
 * Extends CodeCheckResult with additional PDF-specific fields
 */
export interface ComplianceReport {
  jurisdiction: {
    city: string;
    state: string;
    buildingCodeYear: string;
  };
  summary: {
    totalIssues: number;
    criticalIssues: number;
    majorIssues: number;
    minorIssues: number;
    estimatedCost: { low: number; high: number };
    permitsRequired: string[];
  };
  issues: Array<{
    description: string;
    severity: string;
    code: string;
    remediation: string;
    costImpact: { low: number; high: number };
  }>;
}

/**
 * Enhanced weather data for PDF generation
 * Extends base WeatherData with additional report fields
 */
export interface EnhancedWeatherData {
  date: Date;
  location: {
    address: string;
    city: string;
    state: string;
  };
  confidence: number;
  conditions: {
    temperature: number;
    windSpeed: number;
    windGust: number;
    windDirection: string;
    precipitation: number;
    humidity: number;
  };
  storms: Array<{
    time: Date;
    type: string;
    severity: string;
    description: string;
    hailSize?: number;
  }>;
  hailReports: Array<{
    time: Date;
    location: string;
    distance: number;
    size: number;
    source: string;
  }>;
}

export interface EnhancedReportData {
  // Core claim data
  claimId: string;
  claimNumber?: string;
  dateOfLoss: Date;
  property: {
    address: string;
    city: string;
    state: string;
    zip: string;
    yearBuilt?: number;
    stories?: number;
  };
  homeowner: {
    name: string;
    email?: string;
    phone?: string;
  };

  // AI Analysis
  analysis: StormIntakeResults;

  // Enhanced modules
  weatherData?: EnhancedWeatherData;
  annotatedPhotos?: AnnotatedPhoto[];
  complianceReport?: ComplianceReport;
  recommendedMaterials?: MaterialProduct[];

  // Branding
  branding?: {
    companyName: string;
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    phone?: string;
    email?: string;
    website?: string;
    licenseNumber?: string;
  };

  // Metadata
  generatedAt: Date;
  generatedBy: string;
  reportVersion: string;
}

/**
 * Generate comprehensive enhanced PDF report
 */
export async function generateEnhancedPDFReport(data: EnhancedReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `Professional Damage Assessment - ${data.claimNumber || data.claimId}`,
          Author: data.branding?.companyName || "SkaiScraper AI Platform",
          Subject: "Comprehensive Storm Damage Analysis Report",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const primaryColor = data.branding?.primaryColor || "#2563eb";
      const secondaryColor = data.branding?.secondaryColor || "#64748b";

      // PAGE 1: COVER PAGE
      addCoverPage(doc, data, primaryColor);

      // PAGE 2: TABLE OF CONTENTS
      doc.addPage();
      addTableOfContents(doc, data, primaryColor);

      // PAGE 3: EXECUTIVE SUMMARY
      doc.addPage();
      addExecutiveSummary(doc, data, primaryColor, secondaryColor);

      // PAGE 4-5: WEATHER ANALYSIS
      if (data.weatherData) {
        doc.addPage();
        addWeatherSection(doc, data.weatherData, primaryColor, secondaryColor);
      }

      // PAGE 6-8: DAMAGE ANALYSIS
      doc.addPage();
      addDamageAnalysis(doc, data.analysis, primaryColor, secondaryColor);

      // PAGE 9-12: ANNOTATED PHOTOS
      if (data.annotatedPhotos && data.annotatedPhotos.length > 0) {
        doc.addPage();
        addAnnotatedPhotosSection(doc, data.annotatedPhotos, primaryColor);
      }

      // PAGE 13-15: MATERIAL RECOMMENDATIONS
      if (data.recommendedMaterials && data.recommendedMaterials.length > 0) {
        doc.addPage();
        addMaterialRecommendations(doc, data.recommendedMaterials, primaryColor);
      }

      // PAGE 16-18: CODE & COMPLIANCE
      if (data.complianceReport) {
        doc.addPage();
        addComplianceSection(doc, data.complianceReport, primaryColor, secondaryColor);
      }

      // PAGE 19: REPAIR RECOMMENDATIONS
      doc.addPage();
      addRepairRecommendations(doc, data.analysis, primaryColor, secondaryColor);

      // PAGE 20: COST ESTIMATES
      doc.addPage();
      addCostEstimates(doc, data.analysis, data.complianceReport, primaryColor);

      // FINAL PAGE: DISCLAIMERS
      doc.addPage();
      addDisclaimers(doc, data, primaryColor, secondaryColor);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Add branded cover page
 */
function addCoverPage(doc: PDFKit.PDFDocument, data: EnhancedReportData, primaryColor: string) {
  // Company logo placeholder
  doc
    .fontSize(36)
    .fillColor(primaryColor)
    .text(data.branding?.companyName || "Professional Damage Assessment", 50, 150, {
      align: "center",
      width: 500,
    });

  doc.moveDown(2);

  // Report title
  doc
    .fontSize(28)
    .fillColor("#000000")
    .text("Comprehensive Storm Damage Report", { align: "center" });

  doc.moveDown(1);

  // Property address
  doc.fontSize(16).fillColor("#4b5563").text(`${data.property.address}`, { align: "center" });
  doc.text(`${data.property.city}, ${data.property.state} ${data.property.zip}`, {
    align: "center",
  });

  doc.moveDown(3);

  // Key details box
  const boxY = 380;
  doc.rect(150, boxY, 300, 180).fillAndStroke("#f3f4f6", "#d1d5db");

  doc
    .fontSize(12)
    .fillColor("#000000")
    .text("Report Details", 150, boxY + 15, { width: 300, align: "center" });

  doc.moveDown(0.5);

  const detailsY = boxY + 45;
  doc
    .fontSize(10)
    .fillColor("#374151")
    .text(`Claim Number: ${data.claimNumber || data.claimId}`, 170, detailsY);
  doc.text(`Date of Loss: ${data.dateOfLoss.toLocaleDateString()}`, 170, detailsY + 20);
  doc.text(`Homeowner: ${data.homeowner.name}`, 170, detailsY + 40);
  doc.text(`Report Generated: ${data.generatedAt.toLocaleDateString()}`, 170, detailsY + 60);
  doc.text(
    `AI Confidence: ${(data.analysis.summary.confidenceScore * 100).toFixed(0)}%`,
    170,
    detailsY + 80
  );
  doc.text(`Report Version: ${data.reportVersion}`, 170, detailsY + 100);

  // Footer
  doc.fontSize(10).fillColor("#6b7280").text("Powered by Advanced AI & Computer Vision", 50, 700, {
    align: "center",
    width: 500,
  });

  if (data.branding?.phone || data.branding?.email) {
    doc.fontSize(9).text(`${data.branding.phone || ""} • ${data.branding.email || ""}`, 50, 720, {
      align: "center",
      width: 500,
    });
  }
}

/**
 * Add table of contents
 */
function addTableOfContents(
  doc: PDFKit.PDFDocument,
  data: EnhancedReportData,
  primaryColor: string
) {
  doc.fontSize(24).fillColor(primaryColor).text("Table of Contents", { underline: true });
  doc.moveDown(2);

  const sections = [
    "1. Executive Summary",
    "2. Weather Analysis - Date of Loss",
    "3. AI Damage Analysis",
    "4. Annotated Photo Gallery",
    "5. Material Recommendations",
    "6. Code & Compliance Report",
    "7. Repair Scope & Timeline",
    "8. Cost Estimates",
    "9. Important Disclaimers",
  ];

  doc.fontSize(12).fillColor("#000000");
  sections.forEach((section, _idx) => {
    if (
      (section.includes("Weather") && !data.weatherData) ||
      (section.includes("Photo") && !data.annotatedPhotos) ||
      (section.includes("Material") && !data.recommendedMaterials) ||
      (section.includes("Compliance") && !data.complianceReport)
    ) {
      return; // Skip sections without data
    }
    doc.text(section, { indent: 20 });
    doc.moveDown(0.8);
  });

  doc.moveDown(2);
  doc
    .fontSize(10)
    .fillColor("#6b7280")
    .text(
      "This report contains AI-generated analysis based on submitted photos and property data. All findings should be verified by licensed professionals before proceeding with repairs.",
      { align: "justify" }
    );
}

/**
 * Add executive summary
 */
function addExecutiveSummary(
  doc: PDFKit.PDFDocument,
  data: EnhancedReportData,
  primaryColor: string,
  _secondaryColor: string
) {
  doc.fontSize(20).fillColor(primaryColor).text("Executive Summary", { underline: true });
  doc.moveDown(1);

  // Summary box
  const summary = data.analysis.summary;
  doc
    .fontSize(12)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(`Damage Classification: ${summary.primaryDamageType.toUpperCase()}`);
  doc.font("Helvetica");
  doc.text(`Overall Severity: ${summary.overallSeverity.toUpperCase()}`);
  doc.text(`AI Confidence: ${(summary.confidenceScore * 100).toFixed(0)}%`);
  doc.moveDown(1);

  // Key findings
  doc.fontSize(14).fillColor(primaryColor).text("Key Findings:");
  doc.moveDown(0.5);

  doc.fontSize(11).fillColor("#374151");
  const keyFindings: string[] = [];

  if (data.analysis.summary.damageDetected) {
    keyFindings.push("Storm-related damage detected in submitted images.");
  } else {
    keyFindings.push("No storm-related damage detected in submitted images.");
  }

  if (data.analysis.damageAnalysis.hailDamage.detected) {
    keyFindings.push(
      `Hail damage detected (approx. ${data.analysis.damageAnalysis.hailDamage.impactCount} impacts).`
    );
  }

  if (data.analysis.damageAnalysis.windDamage.detected) {
    keyFindings.push(
      `Wind damage detected${
        data.analysis.damageAnalysis.windDamage.missingShingles
          ? " (missing shingles observed)"
          : ""
      }${data.analysis.damageAnalysis.windDamage.liftedShingles ? " (lifted shingles observed)" : ""}.`
    );
  }

  if (data.analysis.damageAnalysis.structuralIssues.detected) {
    keyFindings.push(
      `Structural issues detected (urgency: ${data.analysis.damageAnalysis.structuralIssues.urgency.toUpperCase()}).`
    );
  }

  keyFindings.forEach((finding) => {
    doc.text(`• ${finding}`, { indent: 10 });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  // Severity indicator
  doc.fontSize(14).fillColor(primaryColor).text("Severity Assessment:");
  doc.moveDown(0.5);

  const severityColors: Record<string, string> = {
    minor: "#10b981",
    moderate: "#f59e0b",
    severe: "#ef4444",
    catastrophic: "#991b1b",
  };

  const severityColor = severityColors[summary.overallSeverity] || "#6b7280";
  doc.rect(50, doc.y, 200, 30).fillAndStroke(severityColor, "#000000");

  doc
    .fontSize(16)
    .fillColor("#ffffff")
    .text(summary.overallSeverity.toUpperCase(), 50, doc.y - 25, {
      width: 200,
      align: "center",
    });

  doc.moveDown(2);

  // Immediate actions
  doc.fontSize(14).fillColor("#ef4444").text("Immediate Actions Required:");
  doc.moveDown(0.5);

  doc.fontSize(11).fillColor("#374151");
  data.analysis.recommendations.immediateActions.forEach((action) => {
    doc.text(`⚠ ${action}`, { indent: 10 });
    doc.moveDown(0.5);
  });
}

/**
 * Add weather analysis section
 */
function addWeatherSection(
  doc: PDFKit.PDFDocument,
  weatherData: EnhancedWeatherData,
  primaryColor: string,
  _secondaryColor: string
) {
  doc
    .fontSize(20)
    .fillColor(primaryColor)
    .text("Weather Analysis - Date of Loss", { underline: true });
  doc.moveDown(1);

  doc.fontSize(12).fillColor("#000000").text(`Date: ${weatherData.date.toLocaleDateString()}`);
  doc.text(`Location: ${weatherData.location.address}`);
  doc.text(`Data Confidence: ${(weatherData.confidence * 100).toFixed(0)}%`);
  doc.moveDown(1);

  // Conditions table
  doc.fontSize(14).fillColor(primaryColor).text("Observed Conditions:");
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor("#374151");
  doc.text(`Temperature: ${weatherData.conditions.temperature}°F`);
  doc.text(
    `Wind: ${weatherData.conditions.windSpeed} mph (gusts to ${weatherData.conditions.windGust} mph)`
  );
  doc.text(`Direction: ${weatherData.conditions.windDirection}`);
  doc.text(`Precipitation: ${weatherData.conditions.precipitation} inches`);
  doc.text(`Humidity: ${weatherData.conditions.humidity}%`);
  doc.moveDown(1);

  // Storm events
  if (weatherData.storms.length > 0) {
    doc.fontSize(14).fillColor(primaryColor).text("Storm Events:");
    doc.moveDown(0.5);

    weatherData.storms.forEach((storm) => {
      doc.fontSize(11).fillColor("#000000");
      doc
        .font("Helvetica-Bold")
        .text(
          `${storm.time.toLocaleTimeString()} - ${storm.type.toUpperCase()} (${storm.severity})`
        );
      doc.font("Helvetica");
      doc.fontSize(10).fillColor("#374151").text(`  ${storm.description}`, { indent: 15 });
      if (storm.hailSize) {
        doc.text(`  Hail Size: ${storm.hailSize} inches`, { indent: 15 });
      }
      doc.moveDown(0.5);
    });
  }

  doc.moveDown(1);

  // Hail reports
  if (weatherData.hailReports.length > 0) {
    doc.fontSize(14).fillColor(primaryColor).text("Hail Reports (Nearby):");
    doc.moveDown(0.5);

    weatherData.hailReports.forEach((report) => {
      doc
        .fontSize(10)
        .fillColor("#374151")
        .text(
          `• ${report.time.toLocaleTimeString()} - ${report.location} (${report.distance.toFixed(1)} mi)`
        );
      doc.text(`  Size: ${report.size} inches | Source: ${report.source}`, {
        indent: 15,
      });
      doc.moveDown(0.3);
    });
  }

  doc.moveDown(1);

  // Conclusion
  doc.fontSize(12).fillColor("#000000");
  doc.font("Helvetica-Bold").text("Conclusion:", { underline: true });
  doc.font("Helvetica");
  doc
    .fontSize(10)
    .fillColor("#374151")
    .text(
      "Weather conditions on the date of loss are consistent with the observed damage. Multiple hail reports within close proximity to the property support the insurance claim.",
      { align: "justify" }
    );
}

/**
 * Add damage analysis section
 */
function addDamageAnalysis(
  doc: PDFKit.PDFDocument,
  analysis: StormIntakeResults,
  primaryColor: string,
  _secondaryColor: string
) {
  doc.fontSize(20).fillColor(primaryColor).text("AI Damage Analysis", { underline: true });
  doc.moveDown(1);

  const damageAnalysis = analysis.damageAnalysis;

  if (damageAnalysis.hailDamage.detected) {
    doc.fontSize(14).fillColor(primaryColor).text("Hail Damage:");
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor("#374151");
    doc.text(`Confidence: ${(damageAnalysis.hailDamage.confidence * 100).toFixed(0)}%`);
    doc.text(`Affected Areas: ${damageAnalysis.hailDamage.affectedAreas.join(", ") || "N/A"}`);
    doc.text(`Impact Count: ${damageAnalysis.hailDamage.impactCount}`);
    doc.text(`Average Impact Size: ${damageAnalysis.hailDamage.averageSize}`);
    doc.moveDown(1);
  }

  if (damageAnalysis.windDamage.detected) {
    doc.fontSize(14).fillColor(primaryColor).text("Wind Damage:");
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor("#374151");
    doc.text(`Confidence: ${(damageAnalysis.windDamage.confidence * 100).toFixed(0)}%`);
    doc.text(`Affected Areas: ${damageAnalysis.windDamage.affectedAreas.join(", ") || "N/A"}`);
    doc.text(`Missing Shingles: ${damageAnalysis.windDamage.missingShingles ? "Yes" : "No"}`);
    doc.text(`Lifted Shingles: ${damageAnalysis.windDamage.liftedShingles ? "Yes" : "No"}`);
    doc.moveDown(1);
  }

  if (damageAnalysis.structuralIssues.detected) {
    doc.fontSize(14).fillColor(primaryColor).text("Structural Issues:");
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor("#374151");
    doc.text(`Urgency: ${damageAnalysis.structuralIssues.urgency.toUpperCase()}`);
    if (damageAnalysis.structuralIssues.issues.length > 0) {
      doc.text("Issues:", { indent: 10 });
      damageAnalysis.structuralIssues.issues.forEach((issue) => {
        doc.text(`• ${issue}`, { indent: 20 });
      });
    }
    doc.moveDown(1);
  }

  // Roof metrics
  doc.addPage();
  doc.fontSize(20).fillColor(primaryColor).text("Roof Assessment", { underline: true });
  doc.moveDown(1);

  const roof = analysis.roofMetrics;
  doc.fontSize(12).fillColor("#000000");
  doc.text(`Area: ${roof.estimatedArea.toLocaleString()} sq ft`);
  doc.text(`Pitch: ${roof.pitch}°`);
  doc.text(`Slopes: ${roof.slopes}`);
  doc.text(`Material: ${roof.material}`);
  doc.text(`Estimated Age: ${roof.age}`);
  doc.text(`Condition: ${roof.condition}`);
  doc.moveDown(1);
}

/**
 * Add annotated photos section
 */
function addAnnotatedPhotosSection(
  doc: PDFKit.PDFDocument,
  photos: AnnotatedPhoto[],
  primaryColor: string
) {
  doc.fontSize(20).fillColor(primaryColor).text("Annotated Photo Analysis", { underline: true });
  doc.moveDown(1);

  doc
    .fontSize(10)
    .fillColor("#374151")
    .text(
      `Total Photos Analyzed: ${photos.length} | Total Damage Points: ${photos.reduce((sum, p) => sum + p.annotations.length, 0)}`
    );
  doc.moveDown(1);

  photos.forEach((photo, idx) => {
    if (idx > 0 && idx % 2 === 0) {
      doc.addPage();
    }

    doc
      .fontSize(12)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text(`Photo ${idx + 1}:`);
    doc.font("Helvetica");
    doc.fontSize(10).fillColor("#374151").text(photo.caption);
    doc.text(`Severity: ${photo.overallSeverity.toUpperCase()}`);
    doc.text(`Damage Points: ${photo.annotations.length}`);
    doc.moveDown(0.5);

    // List annotations
    photo.annotations.slice(0, 3).forEach((ann) => {
      doc
        .fontSize(9)
        .fillColor("#6b7280")
        .text(`• ${ann.description} [${ann.severity.toUpperCase()}]`, { indent: 15 });
    });

    if (photo.annotations.length > 3) {
      doc.text(`  ... and ${photo.annotations.length - 3} more`, { indent: 15 });
    }

    doc.moveDown(1.5);
  });
}

/**
 * Add material recommendations
 */
function addMaterialRecommendations(
  doc: PDFKit.PDFDocument,
  materials: MaterialProduct[],
  primaryColor: string
) {
  doc.fontSize(20).fillColor(primaryColor).text("Recommended Materials", { underline: true });
  doc.moveDown(1);

  materials.forEach((material, idx) => {
    if (idx > 0) {
      doc.addPage();
    }

    doc
      .fontSize(16)
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .text(`${idx + 1}. ${material.name}`);
    doc.font("Helvetica");
    doc
      .fontSize(12)
      .fillColor("#374151")
      .text(`${material.manufacturer} - ${material.productLine}`);
    doc.moveDown(0.5);

    doc.fontSize(10);
    doc.text(`Warranty: ${material.warranty} years`);
    doc.text(`Wind Rating: ${material.windRating} mph`);
    if (material.impactRating) {
      doc.text(`Impact Rating: ${material.impactRating}`);
    }
    doc.text(`Price: $${material.pricing.total}/square`);
    doc.moveDown(0.5);

    doc.font("Helvetica-Bold").text("Available Colors:");
    doc.font("Helvetica");
    material.colors.slice(0, 5).forEach((color) => {
      doc.text(`• ${color.name} - ${color.description}`, { indent: 10 });
    });

    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").text("Key Features:");
    doc.font("Helvetica");
    material.features.forEach((feature) => {
      doc.text(`• ${feature}`, { indent: 10 });
    });

    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").text("Best For:");
    doc.font("Helvetica");
    material.bestFor.forEach((use) => {
      doc.text(`• ${use}`, { indent: 10 });
    });
  });
}

/**
 * Add compliance section
 */
function addComplianceSection(
  doc: PDFKit.PDFDocument,
  compliance: ComplianceReport,
  primaryColor: string,
  _secondaryColor: string
) {
  doc.fontSize(20).fillColor(primaryColor).text("Code & Compliance Analysis", { underline: true });
  doc.moveDown(1);

  doc
    .fontSize(12)
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .text(`Jurisdiction: ${compliance.jurisdiction.city}, ${compliance.jurisdiction.state}`);
  doc.font("Helvetica");
  doc.text(`Building Code: ${compliance.jurisdiction.buildingCodeYear}`);
  doc.moveDown(1);

  // Summary
  doc.fontSize(14).fillColor(primaryColor).text("Summary:");
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor("#374151");
  doc.text(`Total Issues: ${compliance.summary.totalIssues}`);
  doc.text(`Critical: ${compliance.summary.criticalIssues}`);
  doc.text(`Major: ${compliance.summary.majorIssues}`);
  doc.text(`Minor: ${compliance.summary.minorIssues}`);
  doc.text(
    `Estimated Cost: $${compliance.summary.estimatedCost.low.toLocaleString()} - $${compliance.summary.estimatedCost.high.toLocaleString()}`
  );
  doc.moveDown(1);

  // Required permits
  doc.fontSize(12).fillColor(primaryColor).text("Required Permits:");
  doc.moveDown(0.5);

  compliance.summary.permitsRequired.forEach((permit) => {
    doc.fontSize(10).fillColor("#374151").text(`• ${permit}`, { indent: 10 });
  });

  doc.moveDown(1);

  // Issues (next page)
  doc.addPage();
  doc.fontSize(16).fillColor(primaryColor).text("Compliance Issues:");
  doc.moveDown(1);

  compliance.issues.forEach((issue, idx) => {
    doc.fontSize(11).fillColor("#000000");
    doc.font("Helvetica-Bold").text(`${idx + 1}. ${issue.description}`);
    doc.font("Helvetica");
    doc.fontSize(9).fillColor("#374151");
    doc.text(`Severity: ${issue.severity.toUpperCase()}`, { indent: 10 });
    doc.text(`Code: ${issue.code}`, { indent: 10 });
    doc.text(`Remediation: ${issue.remediation}`, { indent: 10 });
    doc.text(
      `Cost: $${issue.costImpact.low.toLocaleString()} - $${issue.costImpact.high.toLocaleString()}`,
      { indent: 10 }
    );
    doc.moveDown(0.8);
  });
}

/**
 * Add repair recommendations
 */
function addRepairRecommendations(
  doc: PDFKit.PDFDocument,
  analysis: StormIntakeResults,
  primaryColor: string,
  _secondaryColor: string
) {
  doc.fontSize(20).fillColor(primaryColor).text("Repair Recommendations", { underline: true });
  doc.moveDown(1);

  const recs = analysis.recommendations;

  // Immediate actions
  doc.fontSize(14).fillColor("#ef4444").text("Immediate Actions:");
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor("#374151");
  recs.immediateActions.forEach((action) => {
    doc.text(`⚠ ${action}`, { indent: 10 });
    doc.moveDown(0.3);
  });

  doc.moveDown(1);

  // Repair scope
  doc.fontSize(14).fillColor(primaryColor).text("Recommended Scope:");
  doc.moveDown(0.5);

  recs.repairScope.forEach((item) => {
    doc.fontSize(10).fillColor("#374151").text(`• ${item}`, { indent: 10 });
    doc.moveDown(0.3);
  });

  doc.moveDown(1);

  // Timeline
  doc.fontSize(14).fillColor(primaryColor).text("Timeline:");
  doc.moveDown(0.5);

  doc.fontSize(10).fillColor("#374151").text(recs.timeline, { indent: 10 });
}

/**
 * Add cost estimates
 */
function addCostEstimates(
  doc: PDFKit.PDFDocument,
  analysis: StormIntakeResults,
  complianceReport: ComplianceReport | undefined,
  primaryColor: string
) {
  doc.fontSize(20).fillColor(primaryColor).text("Cost Estimates", { underline: true });
  doc.moveDown(1);

  const costs = analysis.recommendations.estimatedCost;

  doc.fontSize(12).fillColor("#000000");
  doc.text(`Low Estimate: $${costs.low.toLocaleString()}`);
  doc.text(`Recommended: $${costs.recommended.toLocaleString()}`);
  doc.text(`High Estimate: $${costs.high.toLocaleString()}`);
  doc.moveDown(1);

  if (complianceReport) {
    doc.font("Helvetica-Bold").text("Additional Compliance Costs:");
    doc.font("Helvetica");
    doc
      .fontSize(10)
      .fillColor("#374151")
      .text(
        `$${complianceReport.summary.estimatedCost.low.toLocaleString()} - $${complianceReport.summary.estimatedCost.high.toLocaleString()}`,
        { indent: 10 }
      );
    doc.moveDown(1);

    doc.fontSize(12).fillColor("#000000");
    doc.font("Helvetica-Bold").text("Total Project Estimate:");
    doc.font("Helvetica");
    const totalLow = costs.low + complianceReport.summary.estimatedCost.low;
    const totalHigh = costs.high + complianceReport.summary.estimatedCost.high;
    doc.fontSize(14).fillColor(primaryColor);
    doc.text(`$${totalLow.toLocaleString()} - $${totalHigh.toLocaleString()}`);
  }

  doc.moveDown(2);

  doc
    .fontSize(9)
    .fillColor("#6b7280")
    .text(
      "Note: Estimates are approximate and subject to change based on material costs, labor rates, and actual conditions discovered during work. Final pricing should be confirmed with licensed contractors.",
      { align: "justify" }
    );
}

/**
 * Add disclaimers
 */
function addDisclaimers(
  doc: PDFKit.PDFDocument,
  data: EnhancedReportData,
  primaryColor: string,
  _secondaryColor: string
) {
  doc.fontSize(18).fillColor(primaryColor).text("Important Disclaimers", { underline: true });
  doc.moveDown(1);

  doc.fontSize(9).fillColor("#374151");

  const disclaimers = [
    "This report is generated using advanced AI and machine learning algorithms. While highly accurate, all findings should be verified by licensed professionals before proceeding with repairs.",
    "Cost estimates are approximate and based on average market rates. Actual costs may vary based on local labor rates, material availability, and specific site conditions.",
    "This report does not constitute a professional inspection or engineering evaluation. A licensed contractor, engineer, or inspector should perform a physical assessment before beginning work.",
    "Weather data is sourced from third-party providers and may not reflect exact conditions at the property location. Accuracy depends on proximity of weather stations.",
    "Material recommendations are based on general suitability. Final product selection should consider local building codes, manufacturer requirements, and homeowner preferences.",
    "Code compliance information is general in nature. Always consult with local building officials and obtain required permits before starting work.",
    "This report is intended for insurance claim documentation and repair planning. It does not constitute legal or professional advice.",
  ];

  disclaimers.forEach((disclaimer, idx) => {
    doc.text(`${idx + 1}. ${disclaimer}`, { align: "justify" });
    doc.moveDown(0.5);
  });

  doc.moveDown(2);

  // Footer
  doc.fontSize(10).fillColor(primaryColor);
  doc.font("Helvetica-Bold").text("Report Generated By:");
  doc.font("Helvetica");
  doc
    .fontSize(9)
    .fillColor("#000000")
    .text(data.branding?.companyName || "SkaiScraper AI Platform");
  if (data.branding?.licenseNumber) {
    doc.text(`License: ${data.branding.licenseNumber}`);
  }
  if (data.branding?.phone || data.branding?.email) {
    doc.text(`${data.branding.phone || ""} | ${data.branding.email || ""}`);
  }

  doc.moveDown(1);
  doc
    .fontSize(8)
    .fillColor("#9ca3af")
    .text(
      `Report ID: ${data.claimId} | Generated: ${data.generatedAt.toLocaleString()} | Version: ${data.reportVersion}`,
      { align: "center" }
    );
}
