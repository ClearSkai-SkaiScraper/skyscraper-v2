export const dynamic = "force-dynamic";

/**
 * GET /api/claims/[claimId]/weather-attachments
 *
 * Returns weather evidence attachments for carrier packets,
 * supplements, or damage reports with appropriate documentation.
 */

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  getCarrierPacketAttachments,
  getCarrierSpecificAttachments,
  getDamageReportAttachments,
  getSupplementAttachments,
} from "@/lib/weather/attachmentRules";
import { NextRequest, NextResponse } from "next/server";

export const GET = withAuth(
  async (req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;
      const url = new URL(req.url);
      const packetType = url.searchParams.get("type") || "carrier_packet";

      // Verify claim belongs to org
      const claim = await prisma.claims.findFirst({
        where: { id: claimId, orgId },
        select: {
          id: true,
          claimNumber: true,
          carrier: true,
        },
      });

      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      let result;

      switch (packetType) {
        case "supplement":
          result = await getSupplementAttachments(claimId);
          break;
        case "damage_report":
          result = await getDamageReportAttachments(claimId);
          break;
        case "carrier_specific":
          if (!claim.carrier) {
            return NextResponse.json({ error: "Claim has no carrier specified" }, { status: 400 });
          }
          result = await getCarrierSpecificAttachments(claimId, claim.carrier);
          break;
        case "carrier_packet":
        default:
          result = await getCarrierPacketAttachments(claimId);
          break;
      }

      return NextResponse.json({
        claimId,
        claimNumber: claim.claimNumber,
        packetType,
        carrier: claim.carrier,
        ...result,
      });
    } catch (error) {
      logger.error("[WeatherAttachments] Error fetching attachments", { error });
      return NextResponse.json({ error: "Failed to fetch weather attachments" }, { status: 500 });
    }
  }
);
