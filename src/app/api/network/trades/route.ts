export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/network/trades
 * Returns all trade profiles for the authenticated org
 */
export async function GET(req: NextRequest) {
  const authData = await auth();
  const { userId } = authData;
  let orgId = authData.orgId as string | null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // B-21: DB-first org resolution — never fall back to companyId (cross-tenant risk)
  if (!orgId) {
    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { orgId: true },
    });
    orgId = user?.orgId || null;
  }
  if (!orgId) {
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { orgId: true },
    });
    orgId = membership?.orgId || null;
  }

  if (!orgId) {
    logger.warn("[GET /api/network/trades] No orgId resolved", { userId });
    return NextResponse.json({ trades: [] });
  }

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
}

/**
 * POST /api/network/trades
 * Creates a new trade profile
 */
export async function POST(req: NextRequest) {
  const authData = await auth();
  const { userId, orgId } = authData;
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
}
