import { auth, currentUser } from "@clerk/nextjs/server";
import { jsPDF } from "jspdf";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { drawBrandedHeader, drawPageFooter, fetchBrandingData } from "@/lib/pdf/brandedHeader";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/plan/export
 * Converts a markdown project plan to a professional branded PDF
 */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: AI tier
    const rl = await checkRateLimit(user.id, "AI");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const { orgId } = await auth();

    const body = await req.json();
    const { plan, title, clientName, clientAddress, claimNumber } = body;

    if (!plan) {
      return NextResponse.json({ error: "Plan content is required" }, { status: 400 });
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // ── Fetch company branding from org_branding table ──
    const branding = orgId
      ? await fetchBrandingData(orgId, user.id)
      : {
          companyName: "SkaiScraper",
          brandColor: "#1e40af",
          employeeName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        };

    // Attach optional client info
    if (clientName) (branding as any).clientName = clientName;
    if (clientAddress) (branding as any).clientAddress = clientAddress;
    if (claimNumber) (branding as any).claimNumber = claimNumber;

    // ── Branded Header ──
    let y = await drawBrandedHeader(doc, branding as any, {
      reportType: "Project Plan",
      reportTitle: title || "Professional Project Plan",
    });

    y += 5;

    const addPageIfNeeded = (neededSpace: number = 20) => {
      if (y + neededSpace > pageHeight - 25) {
        doc.addPage();
        y = margin;
      }
    };

    // ── Parse Markdown to PDF ──────────────────────────────────
    const lines = plan.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        y += 4;
        continue;
      }

      // H1
      if (trimmed.startsWith("# ")) {
        addPageIfNeeded(20);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 124, 255);
        const text = trimmed.replace(/^#\s+/, "").replace(/\*\*/g, "");
        const split = doc.splitTextToSize(text, contentWidth);
        doc.text(split, margin, y);
        y += split.length * 8 + 4;
        // Underline
        doc.setDrawColor(17, 124, 255);
        doc.line(margin, y - 2, pageWidth - margin, y - 2);
        y += 6;
        continue;
      }

      // H2
      if (trimmed.startsWith("## ")) {
        addPageIfNeeded(16);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        const text = trimmed.replace(/^##\s+/, "").replace(/\*\*/g, "");
        const split = doc.splitTextToSize(text, contentWidth);
        doc.text(split, margin, y);
        y += split.length * 7 + 3;
        continue;
      }

      // H3
      if (trimmed.startsWith("### ")) {
        addPageIfNeeded(14);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        const text = trimmed.replace(/^###\s+/, "").replace(/\*\*/g, "");
        const split = doc.splitTextToSize(text, contentWidth);
        doc.text(split, margin, y);
        y += split.length * 6 + 2;
        continue;
      }

      // Horizontal rule
      if (/^-{3,}$|^\*{3,}$/.test(trimmed)) {
        addPageIfNeeded(10);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
        continue;
      }

      // Bullet list
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        addPageIfNeeded(10);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        const text = trimmed.replace(/^[-*]\s+/, "").replace(/\*\*/g, "");
        const split = doc.splitTextToSize(text, contentWidth - 8);
        doc.text("•", margin + 2, y);
        doc.text(split, margin + 8, y);
        y += split.length * 5 + 2;
        continue;
      }

      // Numbered list
      if (/^\d+\.\s/.test(trimmed)) {
        addPageIfNeeded(10);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        const num = trimmed.match(/^(\d+)\./)?.[1] || "";
        const text = trimmed.replace(/^\d+\.\s+/, "").replace(/\*\*/g, "");
        const split = doc.splitTextToSize(text, contentWidth - 10);
        doc.text(`${num}.`, margin + 1, y);
        doc.text(split, margin + 10, y);
        y += split.length * 5 + 2;
        continue;
      }

      // Bold line (starts with **)
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        addPageIfNeeded(10);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        const text = trimmed.replace(/\*\*/g, "");
        const split = doc.splitTextToSize(text, contentWidth);
        doc.text(split, margin, y);
        y += split.length * 5.5 + 2;
        continue;
      }

      // Table row (|)
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        // Skip separator rows
        if (/^\|[\s\-:]+\|/.test(trimmed) && !trimmed.match(/[a-zA-Z]/)) continue;
        addPageIfNeeded(10);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        const cells = trimmed
          .split("|")
          .filter(Boolean)
          .map((c) => c.trim());
        const cellWidth = contentWidth / cells.length;
        cells.forEach((cell, i) => {
          const text = cell.replace(/\*\*/g, "");
          doc.text(text, margin + i * cellWidth, y, { maxWidth: cellWidth - 4 });
        });
        y += 6;
        continue;
      }

      // Regular paragraph
      addPageIfNeeded(10);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const text = trimmed.replace(/\*\*/g, "");
      const split = doc.splitTextToSize(text, contentWidth);
      doc.text(split, margin, y);
      y += split.length * 5 + 3;
    }

    // ── Unified page footer with AI disclaimer ──
    drawPageFooter(doc, {
      showAiDisclaimer: true,
      companyName: branding.companyName,
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="project-plan.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    logger.error("Plan PDF export failed:", error);
    return NextResponse.json({ error: "Failed to export PDF" }, { status: 500 });
  }
}
