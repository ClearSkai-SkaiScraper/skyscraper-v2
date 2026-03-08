export const dynamic = "force-dynamic";

/**
 * POST /api/customer/trade-team/add
 * Add a contractor to the customer's trade team (saved pros)
 * REQUIRES AUTHENTICATION (Clerk)
 */

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { contractorSlug, trade, makePrimary } = body;

    if (!contractorSlug) {
      return NextResponse.json({ error: "Missing contractorSlug" }, { status: 400 });
    }

    // Find the contractor company by slug
    const company = await prisma.tradesCompany.findUnique({
      where: { slug: contractorSlug },
      select: { id: true, name: true, isActive: true },
    });

    if (!company || !company.isActive) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    // Find or create the client record for this user
    let client = await prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      // Create a basic client record
      client = await prisma.client.create({
        data: {
          id: `client-${userId}`,
          userId,
          slug: `user-${userId.substring(0, 12)}`,
          email: "",
          firstName: "",
          lastName: "",
        },
      });
    }

    // Upsert into ClientSavedPro
    await prisma.clientSavedPro.upsert({
      where: {
        clientId_companyId: {
          clientId: client.id,
          companyId: company.id,
        },
      },
      create: {
        id: `saved-${client.id}-${company.id}`,
        clientId: client.id,
        companyId: company.id,
        category: trade || "GENERAL",
        notes: makePrimary ? "Primary contractor" : null,
      },
      update: {
        category: trade || "GENERAL",
        notes: makePrimary ? "Primary contractor" : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${company.name} added to your trade team`,
    });
  } catch (error) {
    logger.error("❌ [POST /api/customer/trade-team/add] Error:", error);
    return NextResponse.json({ error: "Failed to add contractor" }, { status: 500 });
  }
}
