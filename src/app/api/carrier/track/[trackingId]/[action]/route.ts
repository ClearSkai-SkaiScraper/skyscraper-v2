export const dynamic = "force-dynamic";
/**
 * PHASE 13.5 — CARRIER TRACKING API
 * GET /api/carrier/track/[trackingId]/[action]
 *
 * Tracks email opens and link clicks
 */

import { NextRequest, NextResponse } from "next/server";

import { recordEmailOpen, recordLinkClick } from "@/lib/intel/emailDeliveryChannel";
import { logger } from "@/lib/logger";

// ============================================
// TRACKING PIXEL - EMAIL OPEN
// ============================================

export async function GET(
  req: NextRequest,
  { params }: { params: { trackingId: string; action: string } }
) {
  try {
    const { trackingId, action } = params;
    logger.info("[CARRIER_TRACK]", { trackingId, action });

    if (action === "pixel.gif") {
      // Record email open
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await recordEmailOpen(trackingId);

      // Return 1x1 transparent GIF
      const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

      return new NextResponse(gif, {
        status: 200,
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    if (action === "click") {
      // Record link click
      const { searchParams } = new URL(req.url);
      const linkUrl = searchParams.get("url") || "";

      // eslint-disable-next-line @typescript-eslint/await-thenable
      await recordLinkClick(trackingId, linkUrl);

      // Redirect to actual URL
      if (linkUrl) {
        return NextResponse.redirect(linkUrl);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("[CARRIER_TRACK_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
