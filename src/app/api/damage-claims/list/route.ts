/**
 * GET /api/damage-claims/list
 *
 * Proxy route — the PDF Builder page calls this endpoint.
 * Maps /api/claims data to the { ok, claims } format expected by the UI.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const claims = await prisma.claims.findMany({
      where: { orgId },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        description: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const mapped = claims.map((c) => ({
      id: c.id,
      claim_number: c.claimNumber || c.id.slice(0, 8),
      property_address: c.properties
        ? [c.properties.street, c.properties.city, c.properties.state].filter(Boolean).join(", ")
        : "No address",
      status: c.status || "unknown",
    }));

    return NextResponse.json({ ok: true, claims: mapped });
  } catch (error) {
    logger.error("[GET /api/damage-claims/list] Error:", error);
    return NextResponse.json({ ok: false, claims: [], error: "Failed to fetch claims" });
  }
});
