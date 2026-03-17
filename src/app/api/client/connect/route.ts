export const dynamic = "force-dynamic";

/**
 * Client Connect API
 * POST /api/client/connect - Create a ClientProConnection from client side
 *
 * Allows clients to initiate connection requests to trades companies.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { notifyConnectionRequest } from "@/lib/services/tradesNotifications";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, contractorId, claimId, notes } = body;

    if (!clientId || !contractorId) {
      return NextResponse.json(
        { error: "Client ID and Contractor ID are required" },
        { status: 400 }
      );
    }

    // Verify the client belongs to the authenticated user
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, userId: true, name: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (client.userId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify the contractor exists (tradesCompany uses 'isActive' not 'isPublic')
    const contractor = await prisma.tradesCompany.findUnique({
      where: { id: contractorId },
      select: { id: true, name: true, isActive: true },
    });

    if (!contractor) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    if (!contractor.isActive) {
      return NextResponse.json(
        { error: "This contractor is not accepting connections" },
        { status: 400 }
      );
    }

    // Check for existing connection
    const existingConnection = await prisma.clientProConnection.findUnique({
      where: {
        clientId_contractorId: {
          clientId,
          contractorId,
        },
      },
    });

    if (existingConnection) {
      // If already connected or pending, return the existing connection
      if (existingConnection.status === "connected" || existingConnection.status === "pending") {
        return NextResponse.json({
          success: true,
          connection: existingConnection,
          message:
            existingConnection.status === "connected"
              ? "Already connected"
              : "Connection request already pending",
        });
      }

      // If declined, allow re-requesting
      if (existingConnection.status === "DECLINED" || existingConnection.status === "declined") {
        const updatedConnection = await prisma.clientProConnection.update({
          where: { id: existingConnection.id },
          data: {
            status: "pending",
            invitedAt: new Date(),
            notes: notes || null,
          },
        });

        return NextResponse.json({
          success: true,
          connection: updatedConnection,
          message: "Connection re-requested",
        });
      }
    }

    // Create new connection (ClientProConnection doesn't have claimId)
    const connection = await prisma.clientProConnection.create({
      data: {
        id: crypto.randomUUID(),
        clientId,
        contractorId,
        status: "pending",
        invitedBy: userId,
        notes: notes || null,
        invitedAt: new Date(),
      },
    });

    // Send notification to contractor team
    try {
      const members = await prisma.tradesCompanyMember.findMany({
        where: { companyId: contractorId },
        select: { userId: true },
      });
      const clientName = client.name || "A client";
      for (const m of members) {
        if (m.userId) {
          await notifyConnectionRequest({
            proClerkId: m.userId,
            clientName,
            connectionId: connection.id,
          });
        }
      }
    } catch (notifErr) {
      logger.error("[client/connect] Notification error:", notifErr);
    }

    return NextResponse.json({
      success: true,
      connection,
      message: "Connection request sent",
    });
  } catch (error) {
    logger.error("[POST /api/client/connect] Error:", error);
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }
}

// GET /api/client/connect - Get client's connections
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");

    if (!clientId) {
      return NextResponse.json({ error: "Client ID required" }, { status: 400 });
    }

    // Verify the client belongs to the authenticated user
    // Scoped by userId — ownership check prevents cross-tenant access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, userId: true },
    });

    if (!client || client.userId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Build query
    const where: any = { clientId };
    if (status) {
      where.status = status;
    }

    const connections = await prisma.clientProConnection.findMany({
      where,
      include: {
        tradesCompany: {
          select: {
            id: true,
            slug: true,
            name: true,
            logo: true,
            specialties: true,
            rating: true,
            reviewCount: true,
            isVerified: true,
            city: true,
            state: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { invitedAt: "desc" },
    });

    return NextResponse.json({ success: true, connections });
  } catch (error) {
    logger.error("[GET /api/client/connect] Error:", error);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }
}
