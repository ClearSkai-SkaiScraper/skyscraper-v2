export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * POST /api/messages/client/create
 * Creates a new message thread from client to a connected pro
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const { proId, body: messageBody } = body;

    if (!proId || !messageBody) {
      return NextResponse.json({ error: "proId and message body are required" }, { status: 400 });
    }

    // Resilient client lookup: userId → email fallback → auto-create
    let client = await prisma.client.findFirst({
      where: { userId },
    });

    if (!client) {
      // Fallback: try by email
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
      if (email) {
        client = await prisma.client.findFirst({
          where: { email, userId: null },
        });
        if (client) {
          try {
            await prisma.client.update({
              where: { id: client.id },
              data: { userId },
            });
          } catch {
            /* userId unique constraint */
          }
        }
      }

      // Auto-create if still not found
      if (!client && clerkUser) {
        const slug = `client-${userId.slice(-8)}-${Date.now()}`;
        client = await prisma.client.create({
          data: {
            id: crypto.randomUUID(),
            userId,
            slug,
            email: email || null,
            firstName: clerkUser.firstName || null,
            lastName: clerkUser.lastName || null,
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Client",
            status: "active",
          },
        });
      }
    }

    if (!client) {
      return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
    }

    // Get the pro's org
    const proCompany = await prisma.tradesCompany.findUnique({
      where: { id: proId },
    });

    if (!proCompany) {
      return NextResponse.json({ error: "Professional not found" }, { status: 404 });
    }

    // Verify client has an active connection with this pro
    const connection = await prisma.clientProConnection.findFirst({
      where: {
        clientId: client.id,
        contractorId: proId,
        status: { in: ["accepted", "active", "connected"] },
      },
    });

    // Also check legacy ClientConnection as fallback
    let hasLegacyConnection = false;
    if (!connection) {
      const legacyConn = await prisma.clientConnection.findFirst({
        where: {
          clientId: client.id,
          status: { in: ["accepted", "active", "connected"] },
        },
      });
      hasLegacyConnection = !!legacyConn;
    }

    // Also allow if there's an existing thread (backward compat for pre-connection threads)
    const existingThread = await prisma.messageThread.findFirst({
      where: { clientId: client.id, tradePartnerId: proId },
      select: { id: true },
    });

    if (!connection && !hasLegacyConnection && !existingThread) {
      return NextResponse.json(
        { error: "You must be connected with this professional to send messages" },
        { status: 403 }
      );
    }

    // Check for existing thread between client and pro
    let thread = await prisma.messageThread.findFirst({
      where: {
        clientId: client.id,
        tradePartnerId: proId,
      },
      select: {
        id: true,
        orgId: true,
        clientId: true,
        tradePartnerId: true,
        participants: true,
        subject: true,
        isPortalThread: true,
        claimId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create thread if doesn't exist
    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          id: crypto.randomUUID(),
          orgId: proCompany.id, // Use verified proCompany.id as orgId for the thread
          clientId: client.id,
          tradePartnerId: proId,
          participants: [userId, client.id, proId],
          subject: `Message from ${client.name || "Client"}`,
          isPortalThread: true,
        },
      });
    } else if (!thread.participants || thread.participants.length === 0) {
      // Backfill participants on legacy threads missing them
      await prisma.messageThread.update({
        where: { id: thread.id },
        data: { participants: [userId, client.id, proId] },
      });
      thread = { ...thread, participants: [userId, client.id, proId] };
    }

    // Create the message
    await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        threadId: thread.id,
        senderUserId: userId,
        senderType: "client",
        body: messageBody,
        fromPortal: true,
      },
    });

    // Update thread timestamp
    await prisma.messageThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    // NOTE: Client→pro message notifications are handled by GET /api/notifications
    // which discovers unread messages and shows "Message from {clientName}".
    // No need to create a separate tradeNotification here (was causing duplicates).

    return NextResponse.json({
      success: true,
      threadId: thread.id,
    });
  } catch (error) {
    logger.error("[messages/client/create] Error:", error);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
});
