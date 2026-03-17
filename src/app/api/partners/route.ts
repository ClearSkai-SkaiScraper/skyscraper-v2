export const dynamic = "force-dynamic";

// app/api/partners/route.ts
import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withOrgScope(async (req: Request, { orgId }) => {
  try {
    // Parse query params
    const { searchParams } = new URL(req.url);
    const trade = searchParams.get("trade");

    // Build query
    const where: any = { orgId };
    if (trade) {
      where.trade = trade;
    }

    const partners = await prisma.partner.findMany({
      where,
      orderBy: [{ trade: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(partners);
  } catch (error) {
    logger.error("Failed to fetch partners:", error);
    return NextResponse.json({ error: "Failed to fetch partners" }, { status: 500 });
  }
});

export const POST = withOrgScope(async (req: Request, { orgId }) => {
  try {
    const body = await req.json();
    const { name, trade, email, phone, website, address, notes } = body;

    if (!name || !trade) {
      return NextResponse.json({ error: "Name and trade are required" }, { status: 400 });
    }

    const newPartner = await prisma.partner.create({
      data: {
        orgId,
        name,
        trade,
        email: email || null,
        phone: phone || null,
        website: website || null,
        address: address || null,
        notes: notes || null,
      } as any,
    });

    return NextResponse.json(newPartner, { status: 201 });
  } catch (error) {
    logger.error("Failed to create Partner:", error);
    return NextResponse.json({ error: "Failed to create Partner" }, { status: 500 });
  }
});
