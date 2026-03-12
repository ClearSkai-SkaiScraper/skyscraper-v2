export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

type RouteContext = {
  params: Promise<{ threadId: string; messageId: string }>;
};

// PATCH /api/messages/:threadId/:messageId/read - Mark message as read
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId, messageId } = await context.params;

    // 1. Fetch the thread to verify ownership / access
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        orgId: true,
        clientId: true,
        tradePartnerId: true,
        participants: true,
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // 2. Four-level access check (mirrors GET /api/messages/[threadId])
    let hasAccess = thread.participants.includes(userId);

    if (!hasAccess) {
      // Org-level access (Pro viewing their org's thread)
      try {
        const ctx = await safeOrgContext();
        if (ctx.status === "ok" && ctx.orgId) {
          if (thread.orgId === ctx.orgId || thread.participants.includes(ctx.orgId)) {
            hasAccess = true;
          }
        }
      } catch {
        // Client users won't have org context — that's ok
      }
    }

    if (!hasAccess) {
      // Company-based access (Pro's company matches thread's orgId or tradePartnerId)
      const membership = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
        select: { companyId: true },
      });

      if (membership?.companyId) {
        if (
          thread.orgId === membership.companyId ||
          thread.tradePartnerId === membership.companyId ||
          thread.participants.includes(membership.companyId)
        ) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      // Client-based access (Client viewing their own thread)
      const clientRecord = await prisma.client.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (clientRecord) {
        if (thread.clientId === clientRecord.id || thread.participants.includes(clientRecord.id)) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Verify message exists and belongs to this thread
    const message = await prisma.message.findFirst({
      where: { id: messageId, threadId },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // 4. Mark as read
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { read: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("[MESSAGES_READ]", { error });
    return NextResponse.json({ error: "Failed to mark message as read" }, { status: 500 });
  }
}
