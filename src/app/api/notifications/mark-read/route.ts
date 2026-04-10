export const dynamic = "force-dynamic";

// MODULE 2: Notifications - Mark as read (supports both client and pro)
// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { markAllAsRead, markAsRead } from "@/lib/notifications";
import { resolveOrgSafe } from "@/lib/org/resolveOrg";
import prisma from "@/lib/prisma";

const markReadSchema = z.object({
  notificationId: z.string().optional(),
  markAllAsRead: z.boolean().optional(),
  id: z.string().optional(), // Legacy support
  all: z.boolean().optional(), // Legacy support
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
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
            // Ownership check: only mark if user is a participant in the message thread
            const msg = await prisma.message.findUnique({
              where: { id: msgId },
              select: { threadId: true },
            });
            if (msg) {
              const thread = await prisma.messageThread.findFirst({
                where: { id: msg.threadId, participants: { has: userId } },
              });
              if (thread) {
                await prisma.message.update({ where: { id: msgId }, data: { read: true } });
              }
            }
          } catch (err) {
            logger.warn("[NOTIFICATIONS_MARK_READ] msg mark-read failed", {
              msgId,
              error: String(err),
            });
          }
          return NextResponse.json({ success: true });
        }
        // Handle trade notifications (tn- prefix)
        if (notifId.startsWith("tn-")) {
          const tnId = notifId.replace("tn-", "");
          try {
            // Ownership check: only mark if recipient matches the caller
            await prisma.tradeNotification.updateMany({
              where: { id: tnId, recipientId: userId },
              data: { isRead: true, readAt: new Date() },
            });
          } catch (err) {
            logger.warn("[NOTIFICATIONS_MARK_READ] trade notif mark-read failed", {
              tnId,
              error: String(err),
            });
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
        // Mark all raw notifications as read
        await db.query(
          `INSERT INTO notifications_reads (notification_id, clerk_user_id)
           SELECT n.id, $1 FROM notifications n
           WHERE n.clerk_user_id = $1 OR n.org_id = (
             SELECT org_id FROM users WHERE clerk_user_id = $1 LIMIT 1
           )
           ON CONFLICT DO NOTHING`,
          [userId]
        );
        // Also mark all ProjectNotifications as read for this org
        const orgCtx = await resolveOrgSafe();
        if (orgCtx?.orgId) {
          await prisma.projectNotification.updateMany({
            where: { orgId: orgCtx.orgId, read: false },
            data: { read: true, readAt: new Date() },
          });
        }
        // Also mark all trade notifications as read
        const recipientIds = [userId];
        if (orgCtx?.orgId) recipientIds.push(orgCtx.orgId);
        const membership = await prisma.tradesCompanyMember
          .findUnique({ where: { userId }, select: { companyId: true } })
          .catch(() => null);
        if (membership?.companyId) recipientIds.push(membership.companyId);
        await prisma.tradeNotification.updateMany({
          where: { recipientId: { in: recipientIds }, isRead: false },
          data: { isRead: true, readAt: new Date() },
        });
        return NextResponse.json({ success: true });
      }

      if (notifId) {
        // Handle ProjectNotification marks (pn- prefix)
        if (notifId.startsWith("pn-")) {
          const pnId = notifId.replace("pn-", "");
          try {
            await prisma.projectNotification.update({
              where: { id: pnId },
              data: { read: true, readAt: new Date() },
            });
          } catch (err) {
            logger.warn("[NOTIFICATIONS_MARK_READ] pro pn mark-read failed", {
              pnId,
              error: String(err),
            });
          }
          return NextResponse.json({ success: true });
        }
        // Handle message notifications (msg- prefix)
        if (notifId.startsWith("msg-")) {
          const msgId = notifId.replace("msg-", "");
          try {
            // Ownership check: only mark if user is a participant in the message thread
            const msg = await prisma.message.findUnique({
              where: { id: msgId },
              select: { threadId: true },
            });
            if (msg) {
              const thread = await prisma.messageThread.findFirst({
                where: { id: msg.threadId, participants: { has: userId } },
              });
              if (thread) {
                await prisma.message.update({ where: { id: msgId }, data: { read: true } });
              }
            }
          } catch (err) {
            logger.warn("[NOTIFICATIONS_MARK_READ] pro msg mark-read failed", {
              msgId,
              error: String(err),
            });
          }
          return NextResponse.json({ success: true });
        }
        // Handle trade notifications (tn- prefix)
        if (notifId.startsWith("tn-")) {
          const tnId = notifId.replace("tn-", "");
          try {
            // Match by any of the user's recipient identifiers (userId, orgId, companyId)
            const recipientIds = [userId];
            const orgCtx = await resolveOrgSafe();
            if (orgCtx?.orgId) recipientIds.push(orgCtx.orgId);
            const membership = await prisma.tradesCompanyMember
              .findUnique({ where: { userId }, select: { companyId: true } })
              .catch(() => null);
            if (membership?.companyId) recipientIds.push(membership.companyId);
            await prisma.tradeNotification.updateMany({
              where: { id: tnId, recipientId: { in: recipientIds } },
              data: { isRead: true, readAt: new Date() },
            });
          } catch (err) {
            logger.warn("[NOTIFICATIONS_MARK_READ] pro trade notif mark-read failed", {
              tnId,
              error: String(err),
            });
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
  } catch (error: unknown) {
    logger.error("[NOTIFICATIONS_MARK_READ]", error);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
});
