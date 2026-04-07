export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  getClientVisiblePhotos,
  getClientVisibleTimeline,
  verifyClientClaimAccess,
} from "@/lib/security";

/**
 * GET /api/client/claims/[claimId]
 * Get claim details for a client (only if CONNECTED)
 */
export const GET = withAuth(async (req, { userId, orgId }, routeParams) => {
  try {
    const { claimId } = await routeParams.params;

    // Security: Verify client has access to this claim
    const hasAccess = await verifyClientClaimAccess(userId, claimId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get claim details (claims uses 'properties' relation and 'dateOfLoss', 'damageType')
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        dateOfLoss: true,
        damageType: true,
        createdAt: true,
        updatedAt: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Get ONLY shared photos (using security helper)
    const photos = await getClientVisiblePhotos(claimId);

    // Get ONLY visible timeline events (using security helper)
    const timeline = await getClientVisibleTimeline(claimId);

    return NextResponse.json({
      success: true,
      claim,
      photos,
      timeline,
    });
  } catch (error) {
    logger.error("[CLIENT_CLAIM_DETAIL_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch claim details" }, { status: 500 });
  }
});
