export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/client/claims
 * Get all claims a client is connected to
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all CONNECTED claim links for this client
    // Scoped by userId (clientUserId) — no cross-tenant risk
    const links = await prisma.claimClientLink.findMany({
      where: {
        clientUserId: userId,
        status: "CONNECTED",
      },
      orderBy: { acceptedAt: "desc" },
    });

    // Get claim details for each link (claims uses 'properties' relation, not propertyAddress etc)
    const claimIds = links.map((link) => link.claimId);
    const claims = await prisma.claims.findMany({
      where: { id: { in: claimIds } },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        dateOfLoss: true,
        createdAt: true,
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

    // Combine links with claim data
    const result = links.map((link) => {
      const claim = claims.find((c) => c.id === link.claimId);
      return {
        linkId: link.id,
        claimId: link.claimId,
        acceptedAt: link.acceptedAt,
        claim,
      };
    });

    return NextResponse.json({
      success: true,
      claims: result,
    });
  } catch (error) {
    logger.error("[CLIENT_CLAIMS_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}
