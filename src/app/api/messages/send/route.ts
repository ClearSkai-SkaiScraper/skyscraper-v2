export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const sendMessageSchema = z.object({
  threadId: z.string(),
  body: z.string().min(1).max(5000),
  attachments: z.array(z.string().url()).optional().default([]),
});

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const validated = sendMessageSchema.parse(body);

    // Get thread
    const thread = await prisma.messageThread.findUnique({
      where: { id: validated.threadId },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Determine user role and verify access
    // IMPORTANT: Check client FIRST — a user may exist in both tables,
    // and if the thread has a clientId matching them, they are the client.
    let senderUserId: string = "";
    let senderType: string = "client";
    let resolved = false;

    // Check if this user is a client on this thread (with email fallback)
    let client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true },
    });

    // Email fallback for client lookup
    if (!client) {
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
      if (email) {
        // B-23: Scope client lookup to thread's org to prevent cross-tenant binding
        client = await prisma.client.findFirst({
          where: { email, userId: null, orgId: thread.orgId },
          select: { id: true },
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
    }

    if (client && (thread.clientId === client.id || thread.participants.includes(userId))) {
      senderUserId = userId;
      senderType = "client";
      resolved = true;
    }

    // If not resolved as client, check if they're a pro
    if (!resolved) {
      const [user, membership] = await Promise.all([
        prisma.users.findFirst({
          where: { clerkUserId: userId },
          select: { id: true, orgId: true, role: true },
        }),
        prisma.tradesCompanyMember.findFirst({
          where: { userId },
          select: { companyId: true },
        }),
      ]);

      if (user || membership) {
        // Pro user - check access via orgId OR tradesCompanyMember.companyId OR participants
        let hasAccess = false;

        if (user?.orgId && thread.orgId === user.orgId) {
          hasAccess = true;
        }

        if (!hasAccess && membership?.companyId) {
          if (
            thread.orgId === membership.companyId ||
            thread.tradePartnerId === membership.companyId
          ) {
            hasAccess = true;
          }
        }

        if (!hasAccess && thread.participants.includes(userId)) {
          hasAccess = true;
        }

        // Also allow if companyId matches any participant
        if (
          !hasAccess &&
          membership?.companyId &&
          thread.participants.includes(membership.companyId)
        ) {
          hasAccess = true;
        }

        if (!hasAccess) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        // Use Clerk userId (not DB id) for consistency with pro-to-client/create
        senderUserId = userId;
        senderType = "pro";
        resolved = true;
      }
    }

    if (!resolved) {
      // Last resort: legacy client_access (claims-based portal tokens)
      const clerkUser = await currentUser();
      const clientEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;

      if (!clientEmail) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const clientAccess = await prisma.client_access.findFirst({
        where: {
          email: clientEmail,
          claims: {
            orgId: thread.orgId,
          },
        },
        include: {
          claims: {
            select: { id: true, orgId: true },
          },
        },
      });

      if (!clientAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      senderUserId = clientAccess.id;
      senderType = "client";
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        threadId: validated.threadId,
        senderUserId: senderUserId!,
        senderType: senderType!,
        body: validated.body,
        attachments: validated.attachments,
      },
    });

    // Update thread timestamp
    const updatedThread = await prisma.messageThread.update({
      where: { id: validated.threadId },
      data: { updatedAt: new Date() },
    });

    // Create project notification when a pro sends a message to a client
    if (senderType === "pro" && updatedThread.claimId) {
      try {
        await prisma.projectNotification.create({
          data: {
            id: randomUUID(),
            orgId: thread.orgId,
            claimId: updatedThread.claimId,
            notificationType: "message",
            title: "New message",
            message: validated.body.slice(0, 160),
          },
        });
      } catch (notifError) {
        logger.debug("[messages/send] Notification skipped:", notifError);
      }
    }

    // NOTE: Client→pro message notifications are handled by GET /api/notifications
    // which discovers unread messages and shows "Message from {clientName}".
    // No need to create a separate tradeNotification here (was causing duplicates).

    return NextResponse.json(message);
  } catch (error) {
    logger.error("Message send error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
