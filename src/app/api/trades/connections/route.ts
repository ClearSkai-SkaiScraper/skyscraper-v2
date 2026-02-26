// ORG-SCOPE: Scoped by userId — no cross-tenant risk
// GET returns only connections where authenticated userId is requester or addressee.
// POST/PATCH/DELETE all verify userId ownership. Connections are intentionally cross-org
// (pros from different orgs connect). tradesConnection has no orgId column.

/**
 * Trades Connections API
 * Handles connection requests between trades professionals (friend-like system)
 */

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { isValidationError, validateBody } from "@/lib/validation/middleware";
import { connectionActionSchema, connectionRequestSchema } from "@/lib/validation/trades-schemas";

// Use any cast for tradesConnection due to dual model naming conflict in schema
// (TradesConnection PascalCase has different fields than tradesConnection lowercase)
const tradesConnectionModel = prisma.tradesConnection as any;

// GET - Get all connections for current user
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "accepted";

    // Get connections where user is either requester or addressee
    const connections = await tradesConnectionModel.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
        status: status,
      },
      orderBy: { connectedAt: "desc" },
    });

    // Fetch member profiles for all connected users
    const connectedUserIds = connections.map((c) =>
      c.requesterId === userId ? c.addresseeId : c.requesterId
    );

    const members = await prisma.tradesCompanyMember.findMany({
      where: { userId: { in: connectedUserIds } },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        avatar: true,
        tradeType: true,
        companyName: true,
        city: true,
        state: true,
      },
    });

    // Map connections with member data
    const connectionsWithProfiles = connections.map((c) => {
      const otherUserId = c.requesterId === userId ? c.addresseeId : c.requesterId;
      const member = members.find((m) => m.userId === otherUserId);
      return {
        ...c,
        isRequester: c.requesterId === userId,
        connectedMember: member || null,
      };
    });

    return NextResponse.json({ connections: connectionsWithProfiles });
  } catch (error) {
    logger.error("GET /api/trades/connections error:", error);
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 });
  }
}

// POST - Send a connection request
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await validateBody(req, connectionRequestSchema);
    if (isValidationError(body)) return body;
    const { addresseeId, message } = body;

    if (addresseeId === userId) {
      return NextResponse.json({ error: "Cannot connect with yourself" }, { status: 400 });
    }

    // Check if connection already exists (in either direction)
    const existing = await tradesConnectionModel.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: addresseeId },
          { requesterId: addresseeId, addresseeId: userId },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Connection already exists", connection: existing },
        { status: 409 }
      );
    }

    // Create new connection request
    const connection = await tradesConnectionModel.create({
      data: {
        requesterId: userId,
        addresseeId: addresseeId,
        message: message || null,
        status: "pending",
      },
    });

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    logger.error("POST /api/trades/connections error:", error);
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }
}

// PATCH - Accept/decline a connection request
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await validateBody(req, connectionActionSchema);
    if (isValidationError(body)) return body;
    const { connectionId, action } = body;

    // Find the connection
    const connection = await tradesConnectionModel.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Only the addressee can accept/decline
    if (connection.addresseeId !== userId) {
      return NextResponse.json(
        { error: "Only the recipient can respond to this request" },
        { status: 403 }
      );
    }

    // Update the connection
    const updated = await tradesConnectionModel.update({
      where: { id: connectionId },
      data: {
        status: action === "accept" ? "accepted" : action === "decline" ? "declined" : "blocked",
        connectedAt: action === "accept" ? new Date() : null,
      },
    });

    return NextResponse.json({ connection: updated });
  } catch (error) {
    logger.error("PATCH /api/trades/connections error:", error);
    return NextResponse.json({ error: "Failed to update connection" }, { status: 500 });
  }
}

// DELETE - Remove a connection
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get("id");

    if (!connectionId) {
      return NextResponse.json({ error: "Connection ID is required" }, { status: 400 });
    }

    // Find the connection
    const connection = await tradesConnectionModel.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Only participants can delete
    if (connection.requesterId !== userId && connection.addresseeId !== userId) {
      return NextResponse.json(
        { error: "Not authorized to delete this connection" },
        { status: 403 }
      );
    }

    await tradesConnectionModel.delete({
      where: { id: connectionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/trades/connections error:", error);
    return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 });
  }
}
