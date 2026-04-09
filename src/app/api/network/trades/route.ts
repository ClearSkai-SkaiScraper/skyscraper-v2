export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/network/trades
 * Returns all trade profiles for the authenticated org
 */
export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    // @ts-ignore - Prisma client types
    const trades = await prisma.tradesCompanyMember.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ trades });
  } catch (error) {
    logger.error("[GET /api/network/trades]", error);
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 });
  }
});

/**
 * POST /api/network/trades
 * Creates a new trade profile
 */
export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const { companyName, tradeType, phone, email, website, serviceAreas } = body;

    if (!companyName || !tradeType) {
      return NextResponse.json(
        { error: "companyName and tradeType are required" },
        { status: 400 }
      );
    }

    // tradesCompanyMember uses companyWebsite not website, serviceArea not serviceAreas
    // @ts-ignore - Prisma client types
    const trade = await prisma.tradesCompanyMember.create({
      data: {
        userId: userId, // Required unique field
        orgId,
        companyName,
        tradeType,
        phone,
        email,
        companyWebsite: website,
        serviceArea: serviceAreas ? serviceAreas.join(", ") : null,
      },
    });

    return NextResponse.json({ trade }, { status: 201 });
  } catch (error) {
    logger.error("[POST /api/network/trades]", error);
    return NextResponse.json({ error: "Failed to create trade" }, { status: 500 });
  }
});
