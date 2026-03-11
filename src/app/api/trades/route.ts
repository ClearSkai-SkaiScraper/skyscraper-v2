export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Scope to current user's contractors — never return all
    const trades = await prisma.contractors.findMany({
      where: { user_id: userId },
      orderBy: { user_id: "asc" },
    });

    return NextResponse.json({ success: true, trades });
  } catch (error) {
    logger.error("[TRADES_LIST]", error);
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { businessName, licenseNumber, phone, email, specialties } = body;

    if (!businessName) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }

    const trade = await prisma.contractors.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        trade: specialties?.[0] || "general",
        region: "default",
        company_name: businessName,
        website: null,
        contact_email: email,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, trade });
  } catch (error) {
    logger.error("[TRADES_CREATE]", error);
    return NextResponse.json({ error: "Failed to create trade" }, { status: 500 });
  }
}
