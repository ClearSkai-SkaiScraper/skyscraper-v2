export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  const { id } = await routeParams.params;
  try {
    // Verify user has access to this company via membership
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: {
        userId,
        companyId: id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    const trade = await prisma.tradesCompany.findUnique({
      where: { id },
    });

    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, trade });
  } catch (error) {
    logger.error("[TRADE_GET]", error);
    return NextResponse.json({ error: "Failed to fetch trade" }, { status: 500 });
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const PATCH = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  const { id } = await routeParams.params;
  try {
    // Verify user has edit access to this company
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: {
        userId,
        companyId: id,
        OR: [{ isOwner: true }, { canEditCompany: true }],
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized to edit this trade" }, { status: 403 });
    }

    const body = await req.json();
    const { name, licenseNumber, phone, email, specialties } = body;

    if (!name) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }

    const trade = await prisma.tradesCompany.update({
      where: { id },
      data: {
        name,
        licenseNumber,
        phone,
        email,
        specialties: specialties || [],
      },
    });

    return NextResponse.json({ success: true, trade });
  } catch (error) {
    logger.error("[TRADE_UPDATE]", error);
    return NextResponse.json({ error: "Failed to update trade" }, { status: 500 });
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const DELETE = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  const { id } = await routeParams.params;
  try {
    // Verify user is owner of this company
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: {
        userId,
        companyId: id,
        isOwner: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized to delete this trade" }, { status: 403 });
    }

    // SAFETY: Detach all members FIRST so they aren't lost
    // (Even with SET NULL FK, be explicit to prevent data loss)
    const detached = await prisma.tradesCompanyMember.updateMany({
      where: { companyId: id },
      data: { companyId: null },
    });

    logger.info(
      `[TRADE_DELETE] \u26a0\ufe0f Detached ${detached.count} members from company ${id} before deletion`
    );

    await prisma.tradesCompany.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[TRADE_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete trade" }, { status: 500 });
  }
});
