import { renderToStream } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";

import { generatePdfDocument } from "@/lib/artifacts/pdfGenerator";
import { verifyClaimAccess } from "@/lib/auth/apiAuth";
import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import { fetchBrandingData } from "@/lib/pdf/brandedHeader";
import prisma from "@/lib/prisma";

// React-PDF requires Node.js runtime
export const runtime = "nodejs";

/**
 * POST /api/artifacts/[id]/export-pdf
 * Generate and download PDF for any artifact
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const orgResult = await getActiveOrgContext();
    if (!orgResult.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch artifact
    const artifact = await prisma.ai_reports.findUnique({
      where: { id },
    });

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    // Verify access (org scoping)
    if (artifact.orgId !== orgResult.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If claim-specific, verify claim access
    if (artifact.claimId) {
      const accessResult = await verifyClaimAccess(
        artifact.claimId,
        orgResult.orgId,
        orgResult.userId
      );
      if (accessResult instanceof NextResponse) {
        return accessResult;
      }
    }

    // Fetch company branding for PDF header
    const branding = await fetchBrandingData(orgResult.orgId, orgResult.userId);

    // Generate PDF document using available fields
    const pdfDoc = generatePdfDocument({
      title: artifact.title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: artifact.type as any,
      version: 1, // No version field in schema, default to 1
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: artifact.status as any,
      createdAt: artifact.createdAt,
      contentText: artifact.content,
      contentJson: null,
      sourceTemplate: null,
      artifactId: artifact.id,
      companyName: branding.companyName,
      companyPhone: branding.companyPhone,
      companyEmail: branding.companyEmail,
      companyLicense: branding.companyLicense,
      employeeName: branding.employeeName,
    });

    // Render to buffer
    const stream = await renderToStream(pdfDoc);
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    const pdfBytes = Buffer.concat(chunks);

    // Return PDF for download
    const filename = sanitizeFilename(artifact.title);
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Content-Length": pdfBytes.length.toString(),
      },
    });
  } catch (error) {
    logger.error("Error exporting PDF:", error);
    return NextResponse.json({ error: "Failed to export PDF" }, { status: 500 });
  }
}

// Helper functions
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export const dynamic = "force-dynamic";
