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

    const claimsLite = claims.map((c: any) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      insuredName: c.insured_name,
      carrier: c.carrier,
      status: c.status,
      dateOfLoss: c.dateOfLoss,
      createdAt: c.createdAt,
      address: c.properties?.street || null,
      city: c.properties?.city || null,
      state: c.properties?.state || null,
      zip: c.properties?.zipCode || null,
    }));

    return NextResponse.json({ claims: claimsLite });
  } catch (error) {
    logger.error("Claims list-lite error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch claims" },
      { status: 500 }
    );
  }
});
