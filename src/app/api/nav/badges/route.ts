import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  const ctx = await safeOrgContext();

  if ((ctx.status as string) !== "success" && (ctx.status as string) !== "ok") {
    return NextResponse.json(
      { success: false, error: ctx.status },
      { status: (ctx.status as string) === "unauthenticated" ? 401 : 500 }
    );
  }

  try {
    // Client/portal users have no orgId — return empty badge counts
    // This prevents Prisma errors from querying pro-only tables
    if (!ctx.orgId) {
      return NextResponse.json({
        success: true,
        data: {
          unreadMessages: 0,
          upcomingAppointments: 0,
          unreadNotifications: 0,
          pendingInvitations: 0,
        },
      });
    }

    // Build thread query conditions for this user
    const membership = await prisma.tradesCompanyMember
      .findUnique({
        where: { userId: ctx.userId! },
        select: { companyId: true, id: true },
      })
      .catch(() => null);

    const orConditions: any[] = [{ participants: { has: ctx.userId } }];
    if (ctx.orgId) orConditions.push({ orgId: ctx.orgId });
    if (membership?.companyId) orConditions.push({ tradePartnerId: membership.companyId });

    // Parallel fetch: threads, unread trade notifications, appointments, pending invitations, pending work requests
    const [
      threads,
      unreadTradeNotifs,
      upcomingAppointments,
      pendingInvitations,
      pendingWorkRequests,
    ] = await Promise.all([
      prisma.messageThread
        .findMany({
          where: { OR: orConditions },
          select: { id: true },
        })
        .catch(() => [] as { id: string }[]),

      prisma.tradeNotification
        .count({
          where: {
            recipientId: {
              in: [
                ctx.userId!,
                ...(ctx.orgId ? [ctx.orgId] : []),
                ...(membership?.companyId ? [membership.companyId] : []),
              ],
            },
            isRead: false,
          },
        })
        .catch(() => 0),

      prisma.appointments
        .count({
          where: {
            orgId: ctx.orgId ?? undefined,
            status: "scheduled",
            startTime: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          },
        })
        .catch(() => 0),

      // Count pending connection invitations for this pro's company
      membership?.companyId
        ? prisma.clientProConnection
            .count({
              where: {
                contractorId: membership.companyId,
                status: "pending",
              },
            })
            .catch(() => 0)
        : 0,

      // Count pending work requests for this pro's company
      membership?.companyId
        ? prisma.clientWorkRequest
            .count({
              where: {
                targetProId: membership.companyId,
                status: { in: ["pending", "in_review"] },
              },
            })
            .catch(() => 0)
        : 0,
    ]);

    // Count unread messages across threads
    let unreadMessages = 0;
    if (threads.length > 0) {
      unreadMessages = await prisma.message
        .count({
          where: {
            threadId: { in: threads.map((t) => t.id) },
            senderUserId: { not: ctx.userId! },
            read: false,
          },
        })
        .catch(() => 0);
    }

    return NextResponse.json({
      success: true,
      data: {
        unreadMessages,
        upcomingAppointments,
        unreadNotifications: unreadTradeNotifs,
        pendingInvitations,
        pendingWorkRequests,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch badge counts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch badge counts" },
      { status: 500 }
    );
  }
}
