import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/activity
 * Returns activity feed for the authenticated client (homeowner).
 * Aggregates recent messages, claim updates, notifications, and connection events.
 */
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the client record for this user
    const client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true, name: true },
    });

    if (!client) {
      // Return empty activity for users without client record
      return NextResponse.json({ activity: [], total: 0 });
    }

    const activities: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: Date;
      link?: string;
      metadata?: Record<string, unknown>;
    }> = [];

    // 1. Recent message threads (last 7 days)
    const recentThreads = await prisma.messageThread.findMany({
      where: {
        clientId: client.id,
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: {
        Message: {
          where: { senderUserId: { not: userId } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    for (const thread of recentThreads) {
      if (thread.Message.length > 0) {
        const msg = thread.Message[0];
        activities.push({
          id: `msg-${msg.id}`,
          type: "message",
          title: "New message",
          description: `${thread.subject || "Your contractor"} sent you a message`,
          timestamp: msg.createdAt,
          link: `/portal/messages/${thread.id}`,
          metadata: { threadId: thread.id, preview: msg.body?.slice(0, 100) },
        });
      }
    }

    // 2. Client notifications
    const notifications = await prisma.clientNotification.findMany({
      where: {
        clientId: client.id,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    for (const notif of notifications) {
      activities.push({
        id: `notif-${notif.id}`,
        type: "notification",
        title: notif.title,
        description: notif.message || "",
        timestamp: notif.createdAt,
        link: notif.actionUrl || undefined,
        metadata: { category: notif.type },
      });
    }

    // 3. Connection updates (accepted connections)
    const connections = await prisma.clientProConnection.findMany({
      where: {
        clientId: client.id,
        status: "accepted",
        connectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: {
        tradesCompany: { select: { name: true, slug: true } },
      },
      orderBy: { connectedAt: "desc" },
      take: 5,
    });

    for (const conn of connections) {
      if (conn.connectedAt) {
        activities.push({
          id: `conn-${conn.id}`,
          type: "connection",
          title: "New connection",
          description: `You're now connected with ${conn.tradesCompany.name}`,
          timestamp: conn.connectedAt,
          link: `/portal/company/${conn.tradesCompany.slug}`,
          metadata: { companyId: conn.contractorId },
        });
      }
    }

    // 4. Work request updates
    const workRequests = await prisma.clientWorkRequest.findMany({
      where: {
        clientId: client.id,
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    for (const wr of workRequests) {
      if (wr.status !== "pending") {
        activities.push({
          id: `wr-${wr.id}`,
          type: "work_request",
          title: `Work request ${wr.status}`,
          description: wr.title,
          timestamp: wr.updatedAt,
          link: `/portal/jobs`,
          metadata: { status: wr.status },
        });
      }
    }

    // Sort all activities by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      activity: activities.slice(0, 20),
      total: activities.length,
    });
  } catch (error) {
    logger.error("[PORTAL_ACTIVITY_ERROR]", error);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
