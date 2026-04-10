// ORG-SCOPE: Scoped by userId/clientId — all queries filter by client.id (derived from auth userId). No cross-tenant risk.
/**
 * Network Connections API
 * Manages connections between clients and pros (tradesCompany)
 *
 * When a client accepts an invitation or vice versa, they become "connected"
 * and can message each other directly.
 */

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/network
 * Get all connections for the current client
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get client from auth
    const client = await prisma.client.findFirst({
      where: { userId: userId },
    });

    if (!client) {
      return NextResponse.json({ connections: [], error: "Client not found" }, { status: 200 });
    }

    // Get all connections for this client
    const connections = await prisma.clientProConnection.findMany({
      where: { clientId: client.id },
      include: {
        tradesCompany: {
          select: {
            id: true,
            name: true,
            logo: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            zip: true,
            specialties: true,
            rating: true,
            reviewCount: true,
            isVerified: true,
            description: true,
          },
        },
      },
      orderBy: { connectedAt: "desc" },
    });

    return NextResponse.json({
      connections: connections.map((c) => {
        const contractor = c.tradesCompany;
        const normalizedStatus = (c.status || "").toLowerCase();
        const isActive = normalizedStatus === "connected" || normalizedStatus === "accepted";
        return {
          id: c.id,
          status: normalizedStatus,
          invitedAt: c.invitedAt,
          connectedAt: c.connectedAt,
          notes: c.notes,
          contractorId: c.contractorId,
          pro: {
            id: contractor.id,
            name: contractor.name,
            logo: contractor.logo,
            phone: isActive ? contractor.phone : null, // PRIVACY: Only if connected/accepted
            email: isActive ? contractor.email : null,
            address: isActive ? contractor.address : null,
            zip: contractor.zip,
            location:
              contractor.city && contractor.state
                ? `${contractor.city}, ${contractor.state}`
                : null,
            specialties: contractor.specialties,
            rating: contractor.rating ? parseFloat(contractor.rating.toString()) : null,
            reviewCount: contractor.reviewCount,
            verified: contractor.isVerified,
            bio: contractor.description,
          },
        };
      }),
    });
  } catch (error) {
    logger.error("[Network GET] Error:", error);
    return NextResponse.json(
      { connections: [], error: "Failed to fetch connections" },
      { status: 200 }
    );
  }
}

/**
 * POST /api/portal/network
 * Create or update a connection
 */
export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await prisma.client.findFirst({
      where: { userId: userId },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await req.json();
    const { contractorId, action } = body;

    if (!contractorId) {
      return NextResponse.json({ error: "Contractor ID required" }, { status: 400 });
    }

    // Check if connection already exists
    const existing = await prisma.clientProConnection.findUnique({
      where: {
        clientId_contractorId: {
          clientId: client.id,
          contractorId: contractorId,
        },
      },
    });

    if (action === "connect") {
      if (existing) {
        // Update existing to connected
        await prisma.clientProConnection.update({
          where: { id: existing.id },
          data: {
            status: "connected",
            connectedAt: new Date(),
          },
        });
      } else {
        // Create new connection
        await prisma.clientProConnection.create({
          data: {
            id: crypto.randomUUID(),
            clientId: client.id,
            contractorId: contractorId,
            status: "connected",
            invitedAt: new Date(),
            connectedAt: new Date(),
            invitedBy: userId,
          },
        });
      }
      return NextResponse.json({ success: true, status: "connected" });
    }

    if (action === "disconnect") {
      if (existing) {
        await prisma.clientProConnection.update({
          where: { id: existing.id },
          data: { status: "declined" },
        });
      }
      return NextResponse.json({ success: true, status: "disconnected" });
    }

    if (action === "pending") {
      if (!existing) {
        await prisma.clientProConnection.create({
          data: {
            id: crypto.randomUUID(),
            clientId: client.id,
            contractorId: contractorId,
            status: "pending",
            invitedAt: new Date(),
            invitedBy: userId,
          },
        });
      }
      return NextResponse.json({ success: true, status: "pending" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("[Network POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to update connection" },
      { status: 500 }
    );
  }
}
