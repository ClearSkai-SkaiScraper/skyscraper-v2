import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recipientId, companyId, subject, message, orgId } = body;

    if (!recipientId && !companyId) {
      return NextResponse.json({ error: "recipientId or companyId is required" }, { status: 400 });
    }

    const threadId = "thread_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

    const thread = await prisma.messageThread.create({
      data: {
        id: threadId,
        orgId: orgId || "portal",
        clientId: recipientId || null,
        tradePartnerId: companyId || null,
        subject: subject || "New Conversation",
        participants: [userId, recipientId || companyId].filter(Boolean) as string[],
        isPortalThread: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (message && thread.id) {
      await prisma.message.create({
        data: {
          id: "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
          threadId: thread.id,
          senderUserId: userId,
          senderType: "portal",
          body: message,
          fromPortal: true,
          createdAt: new Date(),
        },
      });
    }

    logger.info("Message thread created: " + thread.id);
    return NextResponse.json(thread, { status: 201 });
  } catch (error) {
    logger.error("Portal create-thread error:", error);
    return NextResponse.json({ error: "Failed to create message thread" }, { status: 500 });
  }
}
