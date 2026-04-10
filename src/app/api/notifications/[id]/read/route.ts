export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RouteContext = {
  params: Promise<{ id: string }>;
};

// Mark a notification as read
const markAsRead = withAuth(async (req: NextRequest, { userId, orgId }, routeParams) => {
  try {
    const { id } = await routeParams.params;

    // Verify ownership with BOTH userId AND orgId
    const existing = await prisma.notification.findFirst({
      where: { id, userId, orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    // S1-05: Atomic update scoped by org — no TOCTOU window
    const notification = await prisma.notification.updateMany({
      where: { id, userId, orgId },
      data: { readAt: new Date() },
    });

    return NextResponse.json(notification);
  } catch (error) {
    logger.error("Error marking notification as read", { error });
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
  }
});

// Support both PATCH and POST for compatibility
export const PATCH = markAsRead;
export const POST = markAsRead;
