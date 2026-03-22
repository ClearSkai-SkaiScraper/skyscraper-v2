export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Mark a notification as read
async function markAsRead(req: NextRequest, context: RouteContext) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // S1-05: orgId is MANDATORY for tenant isolation
    if (!orgId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 403 });
    }

    const { id } = await context.params;

    // S1-05: Verify ownership with BOTH userId AND orgId
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
}

// Support both PATCH and POST for compatibility
export const PATCH = markAsRead;
export const POST = markAsRead;
