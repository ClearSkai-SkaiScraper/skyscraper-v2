export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getClientFromAuth } from "@/lib/portal/getClientFromAuth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const client = await getClientFromAuth();
    const { userId } = await auth();

    if (!client && !userId) {
      return NextResponse.json({ error: "Unauthorized - No client access" }, { status: 403 });
    }

    const allNotifications: any[] = [];

    // 1. Claim-based notifications (ProjectNotification)
    // Scoped by client.id (from getClientFromAuth) + userId — no cross-tenant risk
    try {
      if (client) {
        const clientClaims = await prisma.claims.findMany({
          where: { clientId: client.id },
          select: { id: true },
        });

        const claimIds = clientClaims.map((c) => c.id);

        if (claimIds.length > 0) {
          const claimNotifications = await prisma.projectNotification.findMany({
            where: { claimId: { in: claimIds } },
            orderBy: { createdAt: "desc" },
            take: 30,
          });

          for (const n of claimNotifications) {
            allNotifications.push({
              id: n.id,
              title: n.title || "Claim Update",
              body: n.message || "",
              type: n.notificationType || "claim",
              read: n.read ?? false,
              createdAt: n.createdAt?.toISOString() || new Date().toISOString(),
              url: `/portal/claims/${n.claimId}`,
            });
          }
        }
      }
    } catch (tableError) {
      if (tableError?.code !== "P2021") {
        logger.error("Error fetching claim notifications:", tableError);
      }
    }

    // 2. ClientNotification table (document forwards, report ready, etc.)
    try {
      if (client) {
        const clientNotifs = await prisma.clientNotification.findMany({
          where: { clientId: client.id },
          orderBy: { createdAt: "desc" },
          take: 30,
        });

        for (const n of clientNotifs) {
          allNotifications.push({
            id: `cn-${n.id}`,
            title: n.title || "Notification",
            body: n.message || "",
            type: n.type || "info",
            read: n.isRead ?? false,
            createdAt: n.createdAt?.toISOString() || new Date().toISOString(),
            url: n.actionUrl || "/portal",
          });
        }
      }
    } catch (cnError) {
      if ((cnError as any)?.code !== "P2021") {
        logger.error("Error fetching ClientNotification:", cnError);
      }
    }

    // 3. Unread messages — check for messages sent TO this user
    try {
      if (userId) {
        // Find threads where this user is a participant
        const threads = await prisma.messageThread.findMany({
          where: {
            OR: [{ participants: { has: userId } }, { clientId: client?.id }],
          },
          select: { id: true, subject: true },
        });

        if (threads.length > 0) {
          const threadIds = threads.map((t) => t.id);
          const threadMap = new Map(threads.map((t) => [t.id, t.subject]));

          // Get unread messages NOT sent by this user
          const unreadMessages = await prisma.message.findMany({
            where: {
              threadId: { in: threadIds },
              senderUserId: { not: userId },
              read: false,
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          });

          for (const msg of unreadMessages) {
            allNotifications.push({
              id: `msg-${msg.id}`,
              title: "New Message",
              body: msg.body.length > 80 ? msg.body.slice(0, 80) + "…" : msg.body,
              type: "message",
              read: false,
              createdAt: msg.createdAt.toISOString(),
              url: `/portal/messages/${msg.threadId}`,
            });
          }
        }
      }
    } catch (msgError) {
      logger.error("Error fetching message notifications:", msgError);
    }

    // Sort all notifications by date, newest first
    allNotifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const unreadCount = allNotifications.filter((n) => !n.read).length;

    return NextResponse.json({
      notifications: allNotifications.slice(0, 50),
      unreadCount,
    });
  } catch (error) {
    logger.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
