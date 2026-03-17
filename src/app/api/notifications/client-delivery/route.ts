import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/client-delivery — List client delivery notifications
 * POST /api/notifications/client-delivery — Send a new delivery notification to a client
 */
export async function GET() {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get recent notifications sent to clients from this org
    const notifications = await prisma.notification.findMany({
      where: {
        orgId: ctx.orgId,
        type: {
          in: [
            "job_update",
            "schedule_update",
            "completion_notice",
            "delivery_update",
            "client_delivery",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        channel: true,
        status: true,
        createdAt: true,
        readAt: true,
        userId: true,
      },
    });

    return NextResponse.json({ success: true, notifications });
  } catch (err) {
    logger.error("[API] client-delivery GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId || !ctx.userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { clientId, claimId, type, title, message, channel } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    // Create the notification
    const notification = await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        orgId: ctx.orgId,
        userId: clientId || ctx.userId,
        type: type || "client_delivery",
        title,
        body: message,
        channel: channel || "in_app",
        status: "sent",
        metadata: {
          claimId: claimId || null,
          sentBy: ctx.userId,
          sentAt: new Date().toISOString(),
          deliveryType: type || "general",
        },
        createdAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      notification: { id: notification.id, title: notification.title },
    });
  } catch (err) {
    logger.error("[API] client-delivery POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
