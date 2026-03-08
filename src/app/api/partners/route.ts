export const dynamic = "force-dynamic";

// app/api/partners/route.ts
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's org
    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { orgId: true },
    });

    if (!user?.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const trade = searchParams.get("trade");

    // Build query
    const where: any = { orgId: user.orgId };
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
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { orgId: true },
    });

    if (!user?.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, trade, email, phone, website, address, notes } = body;

    if (!name || !trade) {
      return NextResponse.json({ error: "Name and trade are required" }, { status: 400 });
    }

    const newPartner = await prisma.partner.create({
      data: {
        orgId: user.orgId,
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
}
