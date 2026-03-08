export const dynamic = "force-dynamic";

// MODULE 2: Notifications - Mark as read (supports both client and pro)
import { auth, currentUser } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { markAllAsRead, markAsRead } from "@/lib/notifications";
import prisma from "@/lib/prisma";

const markReadSchema = z.object({
  notificationId: z.string().optional(),
  markAllAsRead: z.boolean().optional(),
  id: z.string().optional(), // Legacy support
  all: z.boolean().optional(), // Legacy support
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = markReadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { notificationId, markAllAsRead: markAll, id, all } = parsed.data;
    const notifId = notificationId || id;
    const shouldMarkAll = markAll || all;

    // Get user email to check for client portal access
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;

    // Check if this is a client portal user (via email in client_access)
    const clientAccess = userEmail
      ? await prisma.client_access.findFirst({
          where: { email: userEmail },
          include: { claims: { select: { orgId: true } } },
        })
      : null;

    if (clientAccess?.claims?.orgId) {
      const orgId = clientAccess.claims.orgId;
      // Client user - use Prisma-based notifications (scoped to org)
      if (shouldMarkAll) {
        const count = await markAllAsRead(orgId);
        return NextResponse.json({ success: true, count });
      }

      if (notifId) {
        // Handle message notifications (msg- prefix)
        if (notifId.startsWith("msg-")) {
          const msgId = notifId.replace("msg-", "");
          try {
            await prisma.message.update({ where: { id: msgId }, data: { read: true } });
          } catch {
            /* ignore if not found */
          }
          return NextResponse.json({ success: true });
        }
        // Handle trade notifications (tn- prefix)
        if (notifId.startsWith("tn-")) {
          const tnId = notifId.replace("tn-", "");
          try {
            await prisma.tradeNotification.update({
              where: { id: tnId },
              data: { isRead: true, readAt: new Date() },
            });
          } catch {
            /* ignore if not found */
          }
          return NextResponse.json({ success: true });
        }
        const success = await markAsRead(notifId, orgId);
        if (!success) {
          return NextResponse.json(
            { error: "Notification not found or unauthorized" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true });
      }
    } else {
      // Pro user - use raw SQL notifications table
      if (shouldMarkAll) {
        await db.query(
          `INSERT INTO notifications_reads (notification_id, clerk_user_id)
           SELECT n.id, $1 FROM notifications n
           WHERE n.clerk_user_id = $1 OR n.org_id = (
             SELECT org_id FROM users WHERE clerk_user_id = $1 LIMIT 1
           )
           ON CONFLICT DO NOTHING`,
          [userId]
        );
        return NextResponse.json({ success: true });
      }

      if (notifId) {
        // Handle message notifications (msg- prefix)
        if (notifId.startsWith("msg-")) {
          const msgId = notifId.replace("msg-", "");
          try {
            await prisma.message.update({ where: { id: msgId }, data: { read: true } });
          } catch {
            /* ignore if not found */
          }
          return NextResponse.json({ success: true });
        }
        // Handle trade notifications (tn- prefix)
        if (notifId.startsWith("tn-")) {
          const tnId = notifId.replace("tn-", "");
          try {
            await prisma.tradeNotification.update({
              where: { id: tnId },
              data: { isRead: true, readAt: new Date() },
            });
          } catch {
            /* ignore if not found */
          }
          return NextResponse.json({ success: true });
        }
        await db.query(
          `INSERT INTO notifications_reads (notification_id, clerk_user_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [notifId, userId]
        );
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json(
      { error: "Must provide 'notificationId' or 'markAllAsRead: true'" },
      { status: 400 }
    );
  } catch (error) {
    logger.error("[NOTIFICATIONS_MARK_READ]", error);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}
