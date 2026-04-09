export const dynamic = "force-dynamic";

// ORG-SCOPE: Public marketplace data — cross-org by design
// Lists all active tradesCompany records for marketplace discovery.
// tradesCompany has no orgId column; companies exist across the cross-org trades network.

/*
 * PHASE 3: Trades Companies API
 * Returns list of active trades companies
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get("specialty");

    const companies = await prisma.tradesCompany.findMany({
      where: {
        isActive: true,
        ...(specialty && { specialties: { has: specialty } }),
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        specialties: c.specialties || [],
        licenseNumber: c.licenseNumber,
        city: c.city,
        state: c.state,
        phone: c.phone,
        verified: c.isVerified ?? false,
        memberCount: c._count?.members ?? 0,
      })),
    });
  } catch (error: unknown) {
    logger.error("Error fetching trades companies:", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
});
