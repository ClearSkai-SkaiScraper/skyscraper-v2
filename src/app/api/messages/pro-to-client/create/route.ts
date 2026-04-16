import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { generateContactSlug } from "@/lib/generateContactSlug";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/messages/pro-to-client/create
 *
 * Creates a new message thread from a Pro to a Client.
 * Supports both Trades Network members (via tradesCompanyMember)
 * AND regular CRM pro users (via user_organizations + Org).
 *
 * Body:
 *  - clientId: string  (Client.id from the clients table)
 *  - body: string      (initial message content)
 *  - subject?: string  (optional thread subject)
 *  - claimId?: string  (optional claim to attach to thread)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const { clientId, body: messageBody, subject, claimId } = body;

    if (!clientId || !messageBody) {
      return NextResponse.json(
        { error: "clientId and message body are required" },
        { status: 400 }
      );
    }

    // ── Resolve the pro's identity ─────────────────────────────────────
    // Try trades network membership first, then fall back to CRM org membership
    let companyId: string | null = null;
    let companyName = "Your Contractor";
    let proOrgId: string | null = null;

    // Path 1: Trades Network member
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

    if (membership?.companyId) {
      companyId = membership.companyId;
      companyName = membership.company?.name || membership.companyName || "Your Contractor";
    }

    // Path 2: Regular CRM pro user (user_organizations → Org)
    if (!companyId) {
      const orgMembership = await prisma.user_organizations.findFirst({
        where: { userId },
        include: { Org: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      });

      if (orgMembership?.organizationId && orgMembership.Org) {
        companyId = orgMembership.organizationId;
        proOrgId = orgMembership.organizationId;
        companyName = orgMembership.Org.name || "Your Contractor";
      }
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "No organization found. Please complete your profile first." },
        { status: 404 }
      );
    }

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

    // Check 1: ClientProConnection (new portal system) — only if companyId is a UUID (trades system)
    try {
      const connection = await prisma.clientProConnection.findFirst({
        where: {
          clientId: client.id,
          contractorId: companyId,
          status: { in: ["accepted", "connected", "pending"] },
        },
      });
      if (connection) hasConnection = true;
    } catch {
      // contractorId requires UUID — if companyId isn't UUID format, skip
    }

    // Check 2: Legacy ClientConnection
    if (!hasConnection) {
      const resolvedOrgId = proOrgId || companyId;
      if (resolvedOrgId && client.id) {
        const legacyConn = await prisma.clientConnection.findFirst({
          where: {
            orgId: resolvedOrgId,
            clientId: client.id,
          },
        });
        if (legacyConn) hasConnection = true;

        // Check 3: Client was created in the pro's org
        if (!hasConnection) {
          const clientInOrg = await prisma.client.findFirst({
            where: { id: clientId, orgId: resolvedOrgId },
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

    // Check for existing thread between pro and client (optionally scoped to claim)
    let thread = await prisma.messageThread.findFirst({
      where: {
        clientId: client.id,
        OR: [
          { tradePartnerId: companyId },
          { orgId: companyId },
          ...(proOrgId ? [{ orgId: proOrgId }] : []),
        ],
        ...(claimId ? { claimId } : {}),
      },
    });

    // Create thread if doesn't exist
    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          id: crypto.randomUUID(),
          orgId: proOrgId || companyId,
          claimId: claimId || null,
          clientId: client.id,
          tradePartnerId: membership?.companyId || null,
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

    // Create a ClientNotification so the client's bell shows the new message
    try {
      await prisma.clientNotification.create({
        data: {
          clientId: client.id,
          type: "new_message",
          title: `Message from ${companyName}`,
          message: messageBody.length > 100 ? messageBody.slice(0, 100) + "…" : messageBody,
          actionUrl: `/portal/messages`,
        },
      });
    } catch (notifErr) {
      logger.error("[pro-to-client/create] ClientNotification creation error:", notifErr);
    }

    // ── Auto-create a Contact card if one doesn't exist ──
    try {
      const resolvedOrgId = proOrgId || companyId;

      if (resolvedOrgId) {
        const existingContact = client.email
          ? await prisma.contacts.findFirst({
              where: { orgId: resolvedOrgId, email: client.email },
            })
          : null;

        if (!existingContact) {
          const nameParts = (client.name || "Client").split(" ");
          await prisma.contacts.create({
            data: {
              id: crypto.randomUUID(),
              orgId: resolvedOrgId,
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
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("[messages/pro-to-client/create] Error:", {
      error: errMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: `Failed to create message: ${errMsg}` }, { status: 500 });
  }
});
