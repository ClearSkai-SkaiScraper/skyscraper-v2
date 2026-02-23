import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";

/**
 * Template sections are stored as JSON in report_templates (section_order, section_enabled).
 * Individual section editing is not yet implemented.
 */
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    // /api/templates/{templateId}/sections/{sectionId}
    const sectionId = segments[segments.length - 1] || "";
    const templateId = segments[segments.length - 3] || "";
    logger.debug(`[TemplateSections] PATCH stub for template ${templateId} section ${sectionId}`);

    // Sections are stored as JSON in report_templates.section_order / section_enabled
    // Individual section editing would require JSON manipulation
    return NextResponse.json({
      message: "Section editing stored in template JSON. Use template PATCH endpoint.",
      templateId,
      sectionId,
    });
  } catch (error) {
    logger.error("Failed to update section:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const sectionId = segments[segments.length - 1] || "";
    const templateId = segments[segments.length - 3] || "";
    logger.debug(`[TemplateSections] DELETE stub for template ${templateId} section ${sectionId}`);

    return NextResponse.json({
      message: "Section deletion stored in template JSON. Use template PATCH endpoint.",
      templateId,
      sectionId,
    });
  } catch (error) {
    logger.error("Failed to delete section:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
});
