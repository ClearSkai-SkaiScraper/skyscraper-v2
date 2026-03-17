export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { generateClaimPacket } from "@/lib/claims/generator";
import { ClaimPacketData, PacketVersion } from "@/lib/claims/templates";
import { logger } from "@/lib/logger";

/**
 * POST /api/claims/generate-packet
 * 🔒 withAuth: org-scoped — generates claim packets for authenticated users only
 */
export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const { data, version, format, includeWeatherPage } = body as {
      data: ClaimPacketData;
      version: PacketVersion;
      format: "pdf" | "docx";
      includeWeatherPage?: boolean;
    };

    if (!data || !version || !format) {
      return NextResponse.json(
        { error: "Missing required fields: data, version, format" },
        { status: 400 }
      );
    }

    logger.info(`[API:CLAIM_PACKET] Generating ${version} packet for user ${userId}`);

    // Generate packet
    const blob = await generateClaimPacket({
      data,
      version,
      format,
      includeWeatherPage,
    });

    // Return as downloadable file
    const filename = `SkaiScraper_${version === "insurance" ? "Claim_Intelligence_Report" : "Property_Damage_Packet"}.${format}`;

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type":
          format === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("[API:CLAIM_PACKET] Generation failed:", error);
    Sentry.captureException(error, {
      tags: { component: "claim-packet-api", orgId },
    });
    return NextResponse.json(
      { error: "Failed to generate claim packet" },
      { status: 500 }
    );
  }
});
