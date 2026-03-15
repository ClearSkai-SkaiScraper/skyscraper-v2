export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const claims = await prisma.claims.findMany({
      where: { orgId },
      select: {
        id: true,
        claimNumber: true,
        insured_name: true,
        carrier: true,
        status: true,
        dateOfLoss: true,
        createdAt: true,
        properties: {
          select: { street: true, city: true, state: true, zipCode: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const claimsLite = claims.map((c: any) => {
      const street = c.properties?.street || null;
      const city = c.properties?.city || null;
      const state = c.properties?.state || null;
      const zip = c.properties?.zipCode || null;

      // Build a formatted address from structured parts
      let propertyAddress: string | null = null;
      if (street && city) {
        const stateZip = [state, zip].filter(Boolean).join(" ");
        propertyAddress = [street, city, stateZip].filter(Boolean).join(", ");
      } else if (street) {
        propertyAddress = street;
      } else if (city) {
        const stateZip = [state, zip].filter(Boolean).join(" ");
        propertyAddress = stateZip ? `${city}, ${stateZip}` : city;
      }

      return {
        id: c.id,
        claimNumber: c.claimNumber,
        insuredName: c.insured_name || null,
        carrier: c.carrier,
        status: c.status,
        dateOfLoss: c.dateOfLoss,
        createdAt: c.createdAt,
        // Formatted full address (used by ClaimJobSelect)
        propertyAddress,
        // Individual parts (for richer label building)
        address: street,
        city,
        state,
        zip,
      };
    });

    return NextResponse.json({ claims: claimsLite });
  } catch (error) {
    logger.error("Claims list-lite error:", error);
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
});
