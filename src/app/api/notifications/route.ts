export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import prisma from "@/lib/prisma";

import { logger } from "@/lib/logger";
import { resolveOrgSafe } from "@/lib/org/resolveOrg";
import { markNotificationReadSchema } from "@/lib/validation/message-schemas";
import { validateBody } from "@/lib/validation/middleware";

export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Use DB-backed org resolver instead of Clerk publicMetadata (which may be stale/empty)
  const orgCtx = await resolveOrgSafe();
  const orgId = orgCtx?.orgId || (user.publicMetadata?.orgId as string | undefined) || null;

  // ── Parallel fetch: raw notifications + membership (shared) ──
  // NOTE: The raw `notifications` table may not exist in all environments.
  // We wrap in try/catch to avoid crashing the entire route if it's missing.
  const [rawResult, membership] = await Promise.all([
    db
      .query(
        `select n.id, n.level, n.title, n.body, n.link, n.created_at,
                (select 1 from notifications_reads r where r.notification_id = n.id and r.clerk_user_id = $2) as is_read
         from notifications n
         where (n.clerk_user_id = $2 or (n.org_id = $1 and n.clerk_user_id is null))
         order by n.created_at desc
         limit 20`,
        [orgId ?? null, user.id]
      )
      .catch((err: Error) => {
        // Silently handle missing notifications table — use TradeNotification instead
        if (!err.message?.includes("does not exist")) {
          logger.error("[notifications] Raw SQL error:", err.message);
        }
        return { rows: [] };
      }),
    prisma.tradesCompanyMember
      .findUnique({
        where: { userId: user.id },
        select: { companyId: true },
      })
      .catch(() => null),
  ]);

  // Transform to format expected by NotificationBell component
  const notifications: any[] = (rawResult?.rows || []).map((row: any) => ({
    id: row.id,
    type: row.level === "error" ? "warning" : row.level === "success" ? "success" : "info",
    title: row.title || "Notification",
    message: row.body || "",
    createdAt: row.created_at,
    read: !!row.is_read,
    link: row.link,
  }));

  // ── Fetch ProjectNotifications for claims in this org ──
  if (orgId) {
    try {
      const projectNotifs = await prisma.projectNotification.findMany({
        where: { orgId, read: false },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      for (const pn of projectNotifs) {
        notifications.push({
          id: `pn-${pn.id}`,
          type: pn.notificationType === "alert" ? "warning" : "info",
          title: pn.title || "Claim Update",
          message: pn.message || "",
          createdAt: pn.createdAt.toISOString(),
          read: pn.read,
          link: `/claims/${pn.claimId}`,
        });
      }
    } catch (pnError) {
      // ProjectNotification table may not exist in all environments
      if ((pnError as any)?.code !== "P2021") {
        logger.error("[notifications] ProjectNotification error:", pnError);
      }
    }
  }

  // ── Parallel fetch: trade notifications + message threads ──
  const recipientIds: string[] = [user.id];
  if (orgId) recipientIds.push(orgId);
  if (membership?.companyId) recipientIds.push(membership.companyId);

  const [tradeNotifsResult, threadsResult] = await Promise.allSettled([
    prisma.tradeNotification.findMany({
      where: { recipientId: { in: recipientIds }, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Fetch message threads in parallel too
    (async () => {
      const orConditions: any[] = [{ participants: { has: user.id } }];
      if (orgId) orConditions.push({ orgId });
      if (membership?.companyId) orConditions.push({ tradePartnerId: membership.companyId });
      return prisma.messageThread.findMany({
        where: { OR: orConditions },
        select: { id: true, subject: true, clientId: true },
      });
    })(),
  ]);

  // Process trade notifications
  if (tradeNotifsResult.status === "fulfilled") {
    for (const tn of tradeNotifsResult.value) {
      notifications.push({
        id: `tn-${tn.id}`,
        type: tn.type === "new_message" ? "info" : "success",
        title: tn.title,
        message: tn.message || "",
        createdAt: tn.createdAt.toISOString(),
        read: tn.isRead,
        link: tn.actionUrl || "/trades/messages",
      });
    }
  }

  // ── Process unread client→pro messages ──
  try {
    const threads = threadsResult.status === "fulfilled" ? threadsResult.value : [];

    if (threads.length > 0) {
      const threadIds = threads.map((t) => t.id);
      const threadMap = new Map(threads.map((t) => [t.id, t]));

      // Get client names for display
      const clientIds = threads.filter((t) => t.clientId).map((t) => t.clientId as string);
      const clients =
        clientIds.length > 0
          ? await prisma.client.findMany({
              where: { id: { in: clientIds } },
              select: { id: true, name: true },
            })
          : [];
      const clientMap = new Map(clients.map((c) => [c.id, c.name]));

      // Unread messages NOT sent by this user
      const unreadMessages = await prisma.message.findMany({
        where: {
          threadId: { in: threadIds },
          senderUserId: { not: user.id },
          read: false,
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      });

      for (const msg of unreadMessages) {
        const thread = threadMap.get(msg.threadId);
        const clientName = thread?.clientId ? clientMap.get(thread.clientId) : null;
        notifications.push({
          id: `msg-${msg.id}`,
          type: "info",
          title: `💬 Message from ${clientName || "Client"}`,
          message: msg.body.length > 80 ? msg.body.slice(0, 80) + "…" : msg.body,
          createdAt: msg.createdAt.toISOString(),
          read: false,
          link: `/trades/messages?thread=${msg.threadId}`,
        });
      }
    }
  } catch (msgError) {
    logger.error("[notifications] Error fetching message notifications:", msgError);
  }

  // Sort by date, newest first
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json({
    notifications: notifications.slice(0, 30),
    unreadCount: notifications.filter((n: any) => !n.read).length,
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await validateBody(req, markNotificationReadSchema);
  if (body instanceof NextResponse) return body;
  const { notificationId } = body;

  // Handle TradeNotification marks (prefixed with tn-)
  if (notificationId?.startsWith("tn-")) {
    const tnId = notificationId.replace("tn-", "");
    try {
      await prisma.tradeNotification.update({
        where: { id: tnId },
        data: { isRead: true, readAt: new Date() },
      });
    } catch {
      // Ignore if not found
    }
    return Response.json({ ok: true });
  }

  // Handle ProjectNotification marks (prefixed with pn-)
  if (notificationId?.startsWith("pn-")) {
    const pnId = notificationId.replace("pn-", "");
    try {
      await prisma.projectNotification.update({
        where: { id: pnId },
        data: { read: true, readAt: new Date() },
      });
    } catch {
      // Ignore if not found
    }
    return Response.json({ ok: true });
  }

  // Handle Message marks (prefixed with msg-)
  if (notificationId?.startsWith("msg-")) {
    const msgId = notificationId.replace("msg-", "");
    try {
      await prisma.message.update({
        where: { id: msgId },
        data: { read: true },
      });
    } catch {
      // Ignore if not found
    }
    return Response.json({ ok: true });
  }

  try {
    await db.query(
      `insert into notifications_reads (notification_id, clerk_user_id)
       values ($1,$2) on conflict do nothing`,
      [notificationId, user.id]
    );
  } catch {
    // notifications_reads table may not exist — silently ignore
  }

  return Response.json({ ok: true });
}
