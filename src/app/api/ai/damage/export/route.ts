export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { jsPDF } from "jspdf";
import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { drawBrandedHeader, drawPageFooter, fetchBrandingData } from "@/lib/pdf/brandedHeader";
import { checkRateLimit } from "@/lib/rate-limit";
import { damageExportSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

interface PhotoCaption {
  damage: string;
  codeCompliance?: string;
  materialSpecs?: string;
}

interface PhotoData {
  id: string;
  caption?: PhotoCaption;
  findings?: DamageFinding[];
}

interface DamageFinding {
  type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  description: string;
  location: string;
  code?: string;
  materialSpec?: string;
}

export const POST = withAuth(async (req, { userId, orgId }) => {
  try {
    // Rate limit: AI tier
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated = validateAIRequest(damageExportSchema, body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error, details: validated.details },
        { status: 422 }
      );
    }

    const {
      photos: rawPhotos,
      findings: rawFindings,
      leadId,
      jobId,
      propertyAddress,
      includeCodeCompliance,
      includeMaterialSpecs,
    } = validated.data;

    const photos = (rawPhotos || []) as unknown as PhotoData[];
    const findings = (rawFindings || []) as unknown as DamageFinding[];

    // ── Fetch company branding for branded header ──
    const branding = await fetchBrandingData(orgId, userId);

    // Attach property info to branding for sub-header
    if (propertyAddress) (branding as any).clientAddress = propertyAddress;

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // ========== BRANDED HEADER ==========
    let y = await drawBrandedHeader(doc, branding as any, {
      reportType: "AI Damage Assessment",
      reportTitle: "Damage Assessment Report",
    });

    y += 4;

    // Property & reference details
    if (propertyAddress || leadId || jobId) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);

      if (propertyAddress) {
        doc.setFont("helvetica", "bold");
        doc.text("Property:", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(propertyAddress, margin + 25, y);
        y += 7;
      }

      if (leadId) {
        doc.text(`Lead ID: ${leadId}`, margin, y);
        y += 7;
      }

      if (jobId) {
        doc.text(`Job ID: ${jobId}`, margin, y);
        y += 7;
      }
      y += 4;
    }

    // Summary box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, contentWidth, 50, 3, 3, "F");
    y += 10;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 124, 255);
    doc.text("Summary", margin + 10, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Photos: ${photos.length}`, margin + 10, y);
    y += 7;
    doc.text(`Damage Findings: ${findings.length}`, margin + 10, y);
    y += 7;

    const criticalCount = findings.filter((f: DamageFinding) => f.severity === "Critical").length;
    const highCount = findings.filter((f: DamageFinding) => f.severity === "High").length;
    if (criticalCount > 0 || highCount > 0) {
      doc.setTextColor(220, 38, 38); // Red for critical
      doc.text(`⚠ ${criticalCount} Critical, ${highCount} High severity findings`, margin + 10, y);
    }
    doc.setTextColor(60, 60, 60);

    y += 30;

    // Options included
    const optionsIncluded: string[] = [];
    if (includeCodeCompliance) optionsIncluded.push("Code & Compliance");
    if (includeMaterialSpecs) optionsIncluded.push("Material Specifications");
    if (optionsIncluded.length > 0) {
      doc.setFontSize(10);
      doc.text(`Analysis Includes: ${optionsIncluded.join(", ")}`, margin, y);
      y += 15;
    }

    // ========== PHOTO PAGES (2 photos per page) ==========
    if (photos.length > 0) {
      // Each page holds 2 photos with captions
      const photosPerPage = 2;
      const photoHeight = 80; // Height allocated for each photo section
      const captionStartY = 10; // Offset for caption below photo area

      for (let i = 0; i < photos.length; i += photosPerPage) {
        doc.addPage();

        // Page header
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`Photo Analysis - Page ${Math.floor(i / photosPerPage) + 1}`, margin, 15);

        for (let j = 0; j < photosPerPage && i + j < photos.length; j++) {
          const photoIndex = i + j;
          const photo = photos[photoIndex] as PhotoData;
          const startY = 25 + j * 130; // Position for each photo section

          // Photo placeholder box
          doc.setFillColor(240, 240, 240);
          doc.setDrawColor(200, 200, 200);
          doc.roundedRect(margin, startY, contentWidth, photoHeight, 2, 2, "FD");

          // Photo number label
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(17, 124, 255);
          doc.text(`Photo ${photoIndex + 1}`, pageWidth / 2, startY + photoHeight / 2, {
            align: "center",
          });

          // Caption section below photo
          const captionY = startY + photoHeight + captionStartY;

          if (photo.caption) {
            doc.setFontSize(10);
            let cy = captionY;

            // A. Damage Visible
            doc.setFont("helvetica", "bold");
            doc.setTextColor(60, 60, 60);
            doc.text("A. Damage Visible:", margin, cy);
            cy += 5;
            doc.setFont("helvetica", "normal");
            const damageLines = doc.splitTextToSize(
              photo.caption.damage || "No damage detected",
              contentWidth - 5
            );
            doc.text(damageLines.slice(0, 3), margin + 3, cy); // Limit to 3 lines
            cy += Math.min(damageLines.length, 3) * 4.5 + 3;

            // B. Code & Compliance
            if (photo.caption.codeCompliance) {
              doc.setFont("helvetica", "bold");
              doc.text("B. Code & Compliance:", margin, cy);
              cy += 5;
              doc.setFont("helvetica", "normal");
              const codeLines = doc.splitTextToSize(photo.caption.codeCompliance, contentWidth - 5);
              doc.text(codeLines.slice(0, 2), margin + 3, cy);
              cy += Math.min(codeLines.length, 2) * 4.5 + 3;
            }

            // C. Material Specifications
            if (photo.caption.materialSpecs) {
              doc.setFont("helvetica", "bold");
              doc.text("C. Material Specs:", margin, cy);
              cy += 5;
              doc.setFont("helvetica", "normal");
              const specLines = doc.splitTextToSize(photo.caption.materialSpecs, contentWidth - 5);
              doc.text(specLines.slice(0, 2), margin + 3, cy);
            }
          } else {
            doc.setFontSize(10);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(150, 150, 150);
            doc.text("Analysis pending", margin, captionY);
          }
        }
      }
    }

    // ========== FINDINGS DETAIL PAGE ==========
    if (findings.length > 0) {
      doc.addPage();
      y = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 124, 255);
      doc.text("Detailed Findings", margin, y);
      y += 15;

      findings.forEach((finding: DamageFinding, idx: number) => {
        // Check if we need a new page
        if (y > pageHeight - 50) {
          doc.addPage();
          y = 20;
        }

        // Finding card background
        const cardHeight = 40 + (finding.code ? 6 : 0) + (finding.materialSpec ? 6 : 0);
        doc.setFillColor(250, 250, 252);
        doc.roundedRect(margin, y - 3, contentWidth, cardHeight, 2, 2, "F");

        // Severity badge
        const severityColors: Record<string, [number, number, number]> = {
          Low: [59, 130, 246], // Blue
          Medium: [234, 179, 8], // Yellow
          High: [249, 115, 22], // Orange
          Critical: [239, 68, 68], // Red
        };
        const [r, g, b] = severityColors[finding.severity] || [100, 100, 100];
        doc.setFillColor(r, g, b);
        doc.roundedRect(pageWidth - margin - 25, y - 1, 22, 8, 2, 2, "F");
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(finding.severity, pageWidth - margin - 14, y + 4.5, { align: "center" });

        // Finding title
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(`${idx + 1}. ${finding.type}`, margin + 3, y + 5);
        y += 12;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);

        // Description
        const descLines = doc.splitTextToSize(finding.description, contentWidth - 10);
        doc.text(descLines.slice(0, 2), margin + 3, y);
        y += Math.min(descLines.length, 2) * 5 + 3;

        // Location
        doc.setFontSize(9);
        doc.text(`📍 ${finding.location}`, margin + 3, y);
        y += 7;

        // Code reference
        if (finding.code) {
          doc.setTextColor(17, 124, 255);
          doc.text(`📋 ${finding.code}`, margin + 3, y);
          y += 6;
        }

        // Material spec
        if (finding.materialSpec) {
          doc.setTextColor(147, 51, 234); // Purple
          doc.text(`🔧 ${finding.materialSpec}`, margin + 3, y);
          y += 6;
        }

        y += 10; // Space between findings
      });
    }

    // ========== BRANDED FOOTER ON ALL PAGES ==========
    drawPageFooter(doc, {
      showAiDisclaimer: true,
      companyName: branding.companyName,
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="damage-report-${Date.now()}.pdf"`,
      },
    });
  } catch (error: unknown) {
    logger.error("PDF export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
});
