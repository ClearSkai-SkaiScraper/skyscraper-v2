export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getClientFromAuth } from "@/lib/portal/getClientFromAuth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const client = await getClientFromAuth();
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    if (!client && !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      // 1. Mark all ProjectNotifications read for this client's claims
      // Scoped by client.id (from getClientFromAuth) + userId — no cross-tenant risk
      if (client) {
        const clientClaims = await prisma.claims.findMany({
          where: { clientId: client.id },
          select: { id: true },
        });
        const claimIds = clientClaims.map((c) => c.id);
        if (claimIds.length > 0) {
          await prisma.projectNotification.updateMany({
            where: { claimId: { in: claimIds }, read: false },
            data: { read: true, readAt: new Date() },
          });
        }
      }

      // 2. Mark all unread messages as read for this user
      if (userId) {
        const threads = await prisma.messageThread.findMany({
          where: {
            OR: [{ participants: { has: userId } }, ...(client ? [{ clientId: client.id }] : [])],
          },
          select: { id: true },
        });
        if (threads.length > 0) {
          await prisma.message.updateMany({
            where: {
              threadId: { in: threads.map((t) => t.id) },
              senderUserId: { not: userId },
              read: false,
            },
            data: { read: true },
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      // Handle message notifications (prefixed with msg-)
      if (notificationId.startsWith("msg-")) {
        const messageId = notificationId.replace("msg-", "");
        try {
          // Only mark read if user is a participant in the message's thread
          if (userId) {
            const user = await prisma.users.findUnique({
              where: { clerkUserId: userId },
              select: { id: true },
            });
            if (user) {
              const msg = await prisma.message.findFirst({
                where: {
                  id: messageId,
                  MessageThread: {
                    OR: [
                      { participants: { has: userId } },
                      { participants: { has: user.id } },
                      ...(client ? [{ clientId: client.id }] : []),
                    ],
                  },
                },
              });
              if (msg) {
                await prisma.message.update({
                  where: { id: messageId },
                  data: { read: true },
                });
              }
            }
          }
        } catch {
          // Message may not exist or already read
        }
        return NextResponse.json({ success: true });
      }

      // Handle ProjectNotification — verify ownership via claim
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: any = { id: notificationId };
        if (client) {
          whereClause.claim = { clientId: client.id };
        }
        const notification = await prisma.projectNotification.findFirst({
          where: whereClause,
        });
        if (notification) {
          await prisma.projectNotification.update({
            where: { id: notificationId },
            data: { read: true, readAt: new Date() },
          });
        }
      } catch {
        // Notification may not exist
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error marking notification as read:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
