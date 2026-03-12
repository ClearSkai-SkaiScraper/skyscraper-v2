export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { previewTemplateOptions } from "@/lib/reports/recommendation-engine";
import { PreviewOptionsRequestSchema } from "@/lib/reports/recommendation-schema";
import type { StyleCategory, TradeType } from "@/lib/templates/templateRegistry";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/reports/preview-template-options
 *
 * Quick-preview of available templates for a given style + optional trade.
 * Lighter than full recommendation — no scoring, just a filtered list
 * with thumbnails and metadata for rapid UI rendering.
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = PreviewOptionsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { styleCategory, trade, limit } = parsed.data;
    const options = previewTemplateOptions(
      styleCategory as StyleCategory,
      trade as TradeType | undefined,
      limit
    );

    logger.info("[PREVIEW_TEMPLATE_OPTIONS]", {
      style: styleCategory,
      trade: trade ?? "all",
      returned: options.length,
    });

    return NextResponse.json({
      ok: true,
      options,
      total: options.length,
      styleCategory,
    });
  } catch (error) {
    logger.error("[PREVIEW_TEMPLATE_OPTIONS] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to preview template options" },
      { status: 500 }
    );
  }
});
