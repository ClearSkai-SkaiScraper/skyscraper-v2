import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { generateContactSlug } from "@/lib/generateContactSlug";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/messages/pro-to-client/create
 *
 * Creates a new message thread from a Pro to a Client.
 * Uses the ClientProConnection system to verify the relationship.
 *
 * Body:
 *  - clientId: string  (Client.id from the clients table)
 *  - body: string      (initial message content)
 *  - subject?: string  (optional thread subject)
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, body: messageBody, subject } = body;

    if (!clientId || !messageBody) {
      return NextResponse.json(
        { error: "clientId and message body are required" },
        { status: 400 }
      );
    }

    // Get the pro's company membership
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: {
        id: true,
        companyId: true,
        firstName: true,
        lastName: true,
        companyName: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!membership?.companyId) {
      return NextResponse.json(
        { error: "Professional profile not found. Complete your profile first." },
        { status: 404 }
      );
    }

    const companyId = membership.companyId;
    const companyName = membership.company?.name || membership.companyName || "Your Contractor";

    // Get the client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        userId: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Verify there's a connection between this pro and client
    // Multiple checks for maximum compatibility across legacy and new systems
    let hasConnection = false;

    // Check 1: ClientProConnection (new portal system)
    const connection = await prisma.clientProConnection.findFirst({
      where: {
        clientId: client.id,
        contractorId: companyId,
        status: { in: ["accepted", "ACCEPTED", "connected", "pending", "PENDING"] },
      },
    });
    if (connection) hasConnection = true;

    // Check 2: Legacy ClientConnection
    if (!hasConnection) {
      const proUser = await prisma.users.findFirst({
        where: { clerkUserId: userId },
        select: { orgId: true },
      });

      if (proUser?.orgId && client.id) {
        const legacyConn = await prisma.clientConnection.findFirst({
          where: {
            orgId: proUser.orgId,
            clientId: client.id,
          },
        });
        if (legacyConn) hasConnection = true;

        // Check 3: Client was created in the pro's org
        if (!hasConnection) {
          const clientInOrg = await prisma.client.findFirst({
            where: { id: clientId, orgId: proUser.orgId },
          });
          if (clientInOrg) hasConnection = true;
        }
      }
    }

    // Check 4: Existing message thread already exists (they've communicated before)
    if (!hasConnection) {
      const existingThread = await prisma.messageThread.findFirst({
        where: {
          clientId: client.id,
          tradePartnerId: companyId,
        },
        select: { id: true },
      });
      if (existingThread) hasConnection = true;
    }

    // Check 5: Client has the pro's companyId as orgId (added via portal)
    if (!hasConnection && client.id) {
      const clientWithCompanyOrg = await prisma.client.findFirst({
        where: { id: clientId, orgId: companyId },
      });
      if (clientWithCompanyOrg) hasConnection = true;
    }

    if (!hasConnection) {
      return NextResponse.json(
        { error: "You must be connected with this client to message them" },
        { status: 403 }
      );
    }

    // Check for existing thread between pro and client
    let thread = await prisma.messageThread.findFirst({
      where: {
        clientId: client.id,
        tradePartnerId: companyId,
      },
    });

    // Create thread if doesn't exist
    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          id: crypto.randomUUID(),
          orgId: companyId,
          clientId: client.id,
          tradePartnerId: companyId,
          participants: [userId, client.userId || client.id],
          subject: subject || `Message from ${companyName}`,
          isPortalThread: true,
        },
      });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        threadId: thread.id,
        senderUserId: userId,
        senderType: "pro",
        body: messageBody,
        fromPortal: false,
      },
    });

    // Update thread timestamp
    await prisma.messageThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    // ── Auto-create a Contact card if one doesn't exist ──
    try {
      const proUser = await prisma.users.findFirst({
        where: { clerkUserId: userId },
        select: { orgId: true },
      });

      if (proUser?.orgId) {
        const existingContact = client.email
          ? await prisma.contacts.findFirst({
              where: { orgId: proUser.orgId, email: client.email },
            })
          : null;

        if (!existingContact) {
          const nameParts = (client.name || "Client").split(" ");
          await prisma.contacts.create({
            data: {
              id: crypto.randomUUID(),
              orgId: proUser.orgId,
              firstName: nameParts[0] || "Client",
              lastName: nameParts.slice(1).join(" ") || "",
              slug: generateContactSlug(
                nameParts[0] || "Client",
                nameParts.slice(1).join(" ") || ""
              ),
              email: client.email || null,
              source: "messaging",
              tags: ["client", "portal"],
              updatedAt: new Date(),
            },
          });
          logger.debug(`[pro-to-client/create] Auto-created contact card for client ${client.id}`);
        }
      }
    } catch (contactErr) {
      logger.error("[pro-to-client/create] Contact creation error:", contactErr);
    }

    logger.info(
      `[pro-to-client/create] Pro ${userId} sent message to client ${clientId} in thread ${thread.id}`
    );

    return NextResponse.json({
      success: true,
      threadId: thread.id,
      messageId: message.id,
      clientName: client.name,
    });
  } catch (error) {
    logger.error("[messages/pro-to-client/create] Error:", error);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}
