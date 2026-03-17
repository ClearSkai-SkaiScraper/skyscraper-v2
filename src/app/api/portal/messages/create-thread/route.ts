export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 100 req/min per user
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { recipientId, companyId, subject, message } = body;

    if (!recipientId && !companyId) {
      return NextResponse.json({ error: "recipientId or companyId is required" }, { status: 400 });
    }

    // Derive orgId server-side: if companyId is given, use it as the org context
    // (tradesCompany.id serves as the orgId for portal threads).
    // If only recipientId, look up the client's associated org.
    let resolvedOrgId = "portal";
    if (companyId) {
      const company = await prisma.tradesCompany.findUnique({
        where: { id: companyId },
        select: { id: true },
      });
      if (!company) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }
      resolvedOrgId = companyId;
    } else if (recipientId) {
      // Try to resolve org from the client's connections
      const connection = await prisma.clientProConnection.findFirst({
        where: { clientId: recipientId },
        select: { contractorId: true },
      });
      if (connection) resolvedOrgId = connection.contractorId;
    }

    const threadId = "thread_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

    const thread = await prisma.messageThread.create({
      data: {
        id: threadId,
        orgId: resolvedOrgId,
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
