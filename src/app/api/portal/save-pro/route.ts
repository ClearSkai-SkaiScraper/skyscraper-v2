export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/portal/save-pro
 * Save or unsave a trades company to the client's "My Pros" collection
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { proId, action } = body;

    if (!proId) {
      return NextResponse.json({ error: "Pro ID is required" }, { status: 400 });
    }

    if (!["save", "unsave"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'save' or 'unsave'" }, { status: 400 });
    }

    // Get or create client
    let client = await prisma.client.findUnique({
      where: { userId },
    });

    if (!client) {
      // Auto-create client if they don't exist yet
      const { nanoid } = await import("nanoid");
      client = await prisma.client.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          slug: nanoid(10),
          category: "Homeowner",
        },
      });
    }

    // Verify the company exists in tradesCompany
    const company = await prisma.tradesCompany.findUnique({
      where: { id: proId },
    });

    if (!company) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    if (action === "save") {
      // Check if already saved
      const existing = await prisma.clientSavedPro.findUnique({
        where: {
          clientId_companyId: {
            clientId: client.id,
            companyId: proId,
          },
        },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          message: "Already saved",
          saved: true,
        });
      }

      // Save the pro
      await prisma.clientSavedPro.create({
        data: {
          id: crypto.randomUUID(),
          clientId: client.id,
          companyId: proId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Pro saved to My Pros",
        saved: true,
      });
    } else {
      // Unsave the pro
      await prisma.clientSavedPro.deleteMany({
        where: {
          clientId: client.id,
          companyId: proId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Pro removed from My Pros",
        saved: false,
      });
    }
  } catch (error) {
    logger.error("Save pro error:", error);
    return NextResponse.json({ error: "Failed to save pro" }, { status: 500 });
  }
}

/**
 * GET /api/portal/save-pro
 * Get all saved pros for the current client
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await prisma.client.findUnique({
      where: { userId },
      include: {
        ClientSavedPro: {
          include: {
            tradesCompany: true,
          },
          orderBy: {
            savedAt: "desc",
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({
        savedPros: [],
        savedProIds: [],
      });
    }

    const savedPros = client.ClientSavedPro.map((sp) => ({
      id: sp.tradesCompany.id,
      companyName: sp.tradesCompany.name,
      tradeType: sp.tradesCompany.specialties?.[0] || "General Contractor",
      city: sp.tradesCompany.city,
      state: sp.tradesCompany.state,
      phone: sp.tradesCompany.phone,
      verified: sp.tradesCompany.isVerified,
      rating: sp.tradesCompany.rating ? parseFloat(sp.tradesCompany.rating.toString()) : null,
      reviewCount: sp.tradesCompany.reviewCount,
      savedAt: sp.savedAt,
    }));

    return NextResponse.json({
      savedPros,
      savedProIds: savedPros.map((p) => p.id),
    });
  } catch (error) {
    logger.error("Get saved pros error:", error);
    return NextResponse.json({ error: "Failed to get saved pros" }, { status: 500 });
  }
}
