// eslint-disable-next-line no-restricted-imports
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { logger } from "@/lib/logger";
import { getOrCreatePortalThread } from "@/lib/messages/getOrCreatePortalThread";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const sendMessageSchema = z.object({
  claimId: z.string().min(1, "claimId is required").max(100),
  message: z.string().min(1, "Message cannot be empty").max(5000, "Message too long"),
});

/**
 * Verify portal access to a claim using ALL access paths:
 * 1. client_access (email-based)
 * 2. ClaimClientLink (userId-based, status=ACCEPTED)
 * 3. claims.clientId (direct attachment by pro)
 *
 * Returns the claim's orgId if access is granted, null otherwise.
 */
async function resolveClaimAccess(
  claimId: string,
  userId: string,
  userEmail: string
): Promise<string | null> {
  // Path 1: client_access (email-based)
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
    // Path 2: ClaimClientLink
    const link = await prisma.claimClientLink.findFirst({
      where: {
        claimId,
        OR: [{ clientUserId: client.id }, { clientEmail: userEmail }],
        status: "ACCEPTED",
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
 * GET /api/portal/messages?claimId=xxx
 * Fetch messages for a portal user's claim thread
 */
export async function GET(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");

    if (!claimId) {
      return NextResponse.json({ error: "Missing claimId" }, { status: 400 });
    }

    // Get user email to check portal access
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    // Verify portal access using all access paths
    const claimOrgId = await resolveClaimAccess(claimId, userId, userEmail);
    if (!claimOrgId) {
      return NextResponse.json({ error: "You do not have access to this claim" }, { status: 403 });
    }

    // Get or create the portal thread
    const thread = await getOrCreatePortalThread({
      orgId: claimOrgId,
      claimId,
    });

    // Fetch messages for this thread
    const messages = await prisma.message.findMany({
      where: {
        threadId: thread.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        fromPortal: true,
        senderUserId: true,
        senderType: true,
      },
    });

    // Format messages with sender names
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      fromPortal: msg.fromPortal,
      senderName: msg.fromPortal ? "You" : "Your Contractor",
    }));

    return NextResponse.json({
      ok: true,
      messages: formattedMessages,
    });
  } catch (error) {
    logger.error("[GET /api/portal/messages] Error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

/**
 * POST /api/portal/messages
 * Send a message from portal user to pro team
 */
export async function POST(req: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json();
    let parsed: z.infer<typeof sendMessageSchema>;
    try {
      parsed = sendMessageSchema.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: err.errors[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }
      throw err;
    }

    const { claimId, message } = parsed;

    // Get user email to check portal access
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    // Verify portal access using all access paths
    const claimOrgId = await resolveClaimAccess(claimId, userId, userEmail);
    if (!claimOrgId) {
      return NextResponse.json({ error: "You do not have access to this claim" }, { status: 403 });
    }

    // Get or create the portal thread
    const thread = await getOrCreatePortalThread({
      orgId: claimOrgId,
      claimId,
    });

    // Create the message
    const newMessage = await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        threadId: thread.id,
        senderUserId: userId,
        senderType: "client",
        body: message.trim(),
        fromPortal: true,
        read: false,
      },
    });

    // Update thread timestamp and add sender to participants
    await prisma.messageThread.update({
      where: { id: thread.id },
      data: {
        updatedAt: new Date(),
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
            message.trim().length > 100 ? message.trim().slice(0, 100) + "…" : message.trim(),
          sentVia: ["in_app"],
          delivered: true,
          deliveredAt: new Date(),
        },
      });
    } catch (notifErr) {
      logger.error("[portal/messages] Notification creation error:", notifErr);
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
    logger.error("[POST /api/portal/messages] Error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
