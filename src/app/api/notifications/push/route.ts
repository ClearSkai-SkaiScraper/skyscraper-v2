export const dynamic = "force-dynamic";

/**
 * Push Subscription API
 * Handle push notification subscription management
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { pushNotificationService } from "@/lib/services/push-notification-service";

// GET /api/notifications/push - Get push notification status
export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    // Get internal user ID
    const user = await prisma.users.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ subscribed: false, subscriptions: [] });
    }

    try {
      const subscriptions = (await prisma.$queryRaw`
        SELECT id, endpoint, device_type as "platform", active as "isActive", created_at as "createdAt"
        FROM push_subscriptions
        WHERE user_id = ${user.id} AND active = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `) as any[];

      return NextResponse.json({
        subscribed: subscriptions.length > 0,
        subscriptions,
      });
    } catch (error) {
      logger.debug("Push subscriptions table may not exist:", error);
      return NextResponse.json({ subscribed: false, subscriptions: [] });
    }
  } catch (error: unknown) {
    logger.error("Error getting push status:", error);
    return NextResponse.json({ error: "Failed to get push status" }, { status: 500 });
  }
});

// POST /api/notifications/push - Subscribe to push notifications
export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const { subscription, deviceInfo } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
    }

    // Get internal user ID
    const user = await prisma.users.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    try {
      const result = await pushNotificationService.subscribe(user.id, subscription, deviceInfo);
      return NextResponse.json(result);
    } catch (error) {
      logger.error("Error subscribing to push (table may not exist):", error);
      return NextResponse.json({ success: true });
    }
  } catch (error: unknown) {
    logger.error("Error subscribing to push:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
});

// DELETE /api/notifications/push - Unsubscribe from push notifications
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const DELETE = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
    }

    try {
      await pushNotificationService.unsubscribe(endpoint);
      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Error unsubscribing from push:", error);
      return NextResponse.json({ success: true });
    }
  } catch (error: unknown) {
    logger.error("Error unsubscribing from push:", error);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
});
