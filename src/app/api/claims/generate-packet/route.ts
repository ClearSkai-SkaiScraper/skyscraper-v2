export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { generateClaimPacket } from "@/lib/claims/generator";
import { ClaimPacketData, PacketVersion } from "@/lib/claims/templates";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const GeneratePacketSchema = z.object({
  data: z.record(z.unknown()),
  version: z.string().min(1),
  format: z.enum(["pdf", "docx"]),
  includeWeatherPage: z.boolean().optional(),
  claimId: z.string().optional(),
});

/**
 * POST /api/claims/generate-packet
 * 🔒 withAuth: org-scoped — generates claim packets for authenticated users only
 */
export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const raw = await req.json();
    const parsed = GeneratePacketSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { data, version, format, includeWeatherPage, claimId } = parsed.data;

    // Cast runtime-validated data to typed interfaces
    const typedData = data as unknown as ClaimPacketData;
    const typedVersion = version as PacketVersion;

    // B-17: Verify claim belongs to caller's org if claimId is provided
    if (claimId) {
      const claim = await prisma.claims.findFirst({
        where: { id: claimId, orgId },
        select: { id: true },
      });
      if (!claim) {
        return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 });
      }
    }

    logger.info(`[API:CLAIM_PACKET] Generating ${typedVersion} packet for user ${userId}`);

    // Generate packet
    const blob = await generateClaimPacket({
      data: typedData,
      version: typedVersion,
      format,
      includeWeatherPage,
    });

    // Return as downloadable file
    const filename = `SkaiScraper_${typedVersion === "insurance" ? "Claim_Intelligence_Report" : "Property_Damage_Packet"}.${format}`;

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
    return NextResponse.json({ error: "Failed to generate claim packet" }, { status: 500 });
  }
});
