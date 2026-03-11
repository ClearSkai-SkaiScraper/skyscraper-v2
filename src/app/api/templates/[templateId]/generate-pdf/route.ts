import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { generateTemplatePDF } from "@/lib/templates/generateTemplatePDF";

export const dynamic = "force-dynamic";

/**
 * POST /api/templates/[templateId]/generate-pdf
 *
 * Generates PDF from template with company branding
 * Returns PDF buffer for download
 */
export const POST = withOrgScope(
  async (req, { orgId }, { params }: { params: { templateId: string } }) => {
    try {
      const templateId = params.templateId;
      const body = await req.json();
      const claimData = body.claimData || {};

      logger.debug(`[PDF_GENERATION_API] Generating PDF for template ${templateId}, org ${orgId}`);

      // Generate PDF with branding
      const pdfBuffer = await generateTemplatePDF({
        templateId,
        orgId,
        claimData,
      });

      // Return PDF as downloadable file
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="template-${templateId}.pdf"`,
        },
      });
    } catch (error) {
      logger.error(`[PDF_GENERATION_API] Error:`, error);

      Sentry.captureException(error, {
        tags: {
          subsystem: "templates",
          action: "generate-pdf",
        },
      });

      // Check if this is a "not implemented" error
      if (error.message?.includes("Puppeteer") || error.message?.includes("React-PDF")) {
        return NextResponse.json(
          {
            success: false,
            error: "PDF generation setup required",
            message: "Internal server error",
            instructions: {
              puppeteer: "Run: pnpm add puppeteer",
              reactPDF: "Run: pnpm add @react-pdf/renderer",
              note: "Puppeteer is recommended for exact preview match",
            },
          },
          { status: 501 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate PDF",
        },
        { status: 500 }
      );
    }
  }
);
