/**
 * Portal Claim Messages API
 *
 * GET  /api/portal/claims/[claimId]/messages — Fetch messages for this claim
 * POST /api/portal/claims/[claimId]/messages — Send a message from client to pro
 *
 * This endpoint is used by the portal claim detail page (ClientWorkspace).
 * Access is verified via client_access, ClaimClientLink, OR claims.clientId.
 */

// eslint-disable-next-line no-restricted-imports
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getOrCreatePortalThread } from "@/lib/messages/getOrCreatePortalThread";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ claimId: string }>;
};

/**
 * Resolve claim orgId using all three access paths:
 * 1. client_access (email-based)
 * 2. ClaimClientLink (userId-based, status=ACCEPTED)
 * 3. claims.clientId (direct attachment by pro)
 */
async function resolveClaimOrgId(
  claimId: string,
  userId: string,
  userEmail: string
): Promise<string | null> {
  // Path 1: client_access
  const portalAccess = await prisma.client_access.findFirst({
    where: { claimId, email: userEmail },
    include: { claims: { select: { orgId: true } } },
  });
  if (portalAccess) return portalAccess.claims.orgId;

  // Path 2 & 3: need the Client record
  const client = await prisma.client.findFirst({
    where: { OR: [{ userId }, { email: userEmail }] },
    select: { id: true },
  });

  if (client) {
    const link = await prisma.claimClientLink.findFirst({
      where: {
        claimId,
        OR: [{ clientUserId: client.id }, { clientEmail: userEmail }],
        status: { in: ["accepted", "connected", "pending"] },
      },
      include: { claims: { select: { orgId: true } } },
    });
    if (link) return link.claims.orgId;

    // Path 3: claims.clientId
    const claimByClientId = await prisma.claims.findFirst({
      where: { id: claimId, clientId: client.id },
      select: { orgId: true },
    });
    if (claimByClientId) return claimByClientId.orgId;
  }

  return null;
}

/**
 * GET /api/portal/claims/[claimId]/messages
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { claimId } = await context.params;

    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const claimOrgId = await resolveClaimOrgId(claimId, userId, userEmail);
    if (!claimOrgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const thread = await getOrCreatePortalThread({
      orgId: claimOrgId,
      claimId,
    });

    const messages = await prisma.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        body: true,
        createdAt: true,
        fromPortal: true,
        senderUserId: true,
        senderType: true,
      },
    });

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      fromPortal: msg.fromPortal,
      senderName: msg.fromPortal ? "You" : "Your Contractor",
    }));

    return NextResponse.json({ ok: true, messages: formattedMessages });
  } catch (error) {
    logger.error("[GET /api/portal/claims/[claimId]/messages] Error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

/**
 * POST /api/portal/claims/[claimId]/messages
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { claimId } = await context.params;
    const body = await req.json();
    const messageContent = body.content || body.message;

    if (
      !messageContent ||
      typeof messageContent !== "string" ||
      messageContent.trim().length === 0
    ) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const claimOrgId = await resolveClaimOrgId(claimId, userId, userEmail);
    if (!claimOrgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const thread = await getOrCreatePortalThread({
      orgId: claimOrgId,
      claimId,
    });

    const newMessage = await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        threadId: thread.id,
        senderUserId: userId,
        senderType: "client",
        body: messageContent.trim(),
        fromPortal: true,
        read: false,
      },
    });

    await prisma.messageThread.update({
      where: { id: thread.id },
      data: {
        updatedAt: new Date(),
        // Ensure sender is in participants list for notification lookups
        participants: { push: userId },
      },
    });

    // Deduplicate participants
    try {
      const updatedThread = await prisma.messageThread.findUnique({
        where: { id: thread.id },
        select: { participants: true },
      });
      if (updatedThread) {
        const unique = [...new Set(updatedThread.participants)];
        await prisma.messageThread.update({
          where: { id: thread.id },
          data: { participants: { set: unique } },
        });
      }
    } catch {
      /* dedup non-critical */
    }
    try {
      await prisma.projectNotification.create({
        data: {
          id: crypto.randomUUID(),
          orgId: claimOrgId,
          claimId,
          notificationType: "client_message",
          title: "New Client Message",
          message:
            messageContent.trim().length > 100
              ? messageContent.trim().slice(0, 100) + "…"
              : messageContent.trim(),
          sentVia: ["in_app"],
          delivered: true,
          deliveredAt: new Date(),
        },
      });
    } catch (notifErr) {
      logger.error("[portal/claims/messages] Notification creation error:", notifErr);
    }

    return NextResponse.json({
      ok: true,
      message: {
        id: newMessage.id,
        body: newMessage.body,
        createdAt: newMessage.createdAt.toISOString(),
        fromPortal: newMessage.fromPortal,
        senderName: "You",
      },
    });
  } catch (error) {
    logger.error("[POST /api/portal/claims/[claimId]/messages] Error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
