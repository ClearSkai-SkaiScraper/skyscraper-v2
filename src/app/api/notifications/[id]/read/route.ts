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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const existing = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const notification = await prisma.notification.update({
      where: { id },
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
