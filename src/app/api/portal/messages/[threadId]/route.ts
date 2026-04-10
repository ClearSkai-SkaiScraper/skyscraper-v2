// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/portal/messages/[threadId]
 * Retrieves a message thread with all messages.
 * Works for BOTH client (portal) users and pro users.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await params;

    // Get thread with messages
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        Message: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Access check: userId in participants, OR user owns the linked client record
    let hasAccess = thread.participants.includes(userId);
    if (!hasAccess && thread.clientId) {
      const client = await prisma.client.findFirst({ where: { id: thread.clientId, userId } });
      if (client) hasAccess = true;
    }
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        threadId,
        senderUserId: { not: userId },
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({
      success: true,
      thread,
    });
  } catch (error) {
    logger.error("[GET_THREAD_ERROR]", error);
    return NextResponse.json({ error: "Failed to load thread" }, { status: 500 });
  }
}
