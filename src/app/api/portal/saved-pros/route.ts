// ORG-SCOPE: Scoped by userId/clientId — queries clientSavedPro by client.id (derived from auth userId). No cross-tenant risk.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/saved-pros
 * Get all saved contractors for the logged-in client
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get client record
    const client = await prisma.client.findFirst({
      where: { userId: userId },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ pros: [] });
    }

    // Get saved pros with company details
    const savedPros = await prisma.clientSavedPro.findMany({
      where: { clientId: client.id },
      include: {
        tradesCompany: {
          select: {
            id: true,
            name: true,
            logo: true,
            coverimage: true,
            specialties: true,
            city: true,
            state: true,
            isVerified: true,
            rating: true,
            reviewCount: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { savedAt: "desc" },
    });

    // Transform to match UI format
    const pros = (savedPros as any[]).map((sp) => ({
      id: sp.tradesCompany?.id,
      name: sp.tradesCompany?.name,
      logo: sp.tradesCompany?.logo,
      coverPhoto: sp.tradesCompany?.coverimage,
      specialties: sp.tradesCompany?.specialties || [],
      location: [sp.tradesCompany?.city, sp.tradesCompany?.state].filter(Boolean).join(", "),
      rating: sp.tradesCompany?.rating,
      reviewCount: sp.tradesCompany?.reviewCount,
      verified: sp.tradesCompany?.isVerified,
      phoneNumber: sp.tradesCompany?.phone,
      email: sp.tradesCompany?.email,
      savedAt: sp.savedAt.toISOString(),
    }));

    return NextResponse.json({ pros });
  } catch (error) {
    logger.error("Error fetching saved pros:", error);
    return NextResponse.json({ error: "Failed to fetch saved pros" }, { status: 500 });
  }
}
