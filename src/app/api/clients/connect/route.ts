export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { resolveOrg } from "@/lib/org/resolveOrg";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve org server-side
    let orgId: string | null = null;
    try {
      const org = await resolveOrg();
      orgId = org.orgId;
    } catch {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Client ID required" }, { status: 400 });
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Check if connection already exists
    const existing = await prisma.clientConnection.findFirst({
      where: { orgId, clientId },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Connection already exists",
        connection: existing,
      });
    }

    // Create the connection record
    const connection = await prisma.clientConnection.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        clientId,
        status: "active",
        invitedBy: userId,
        invitedAt: new Date(),
        connectedAt: new Date(),
      },
    });

    logger.info("[CLIENTS_CONNECT] Connection created", { orgId, clientId });

    return NextResponse.json({
      success: true,
      message: "Connection created successfully",
      connection,
    });
  } catch (error) {
    logger.error("Error creating connection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
