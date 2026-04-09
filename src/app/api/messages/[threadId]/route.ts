export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { sendMessageSchema, threadActionSchema } from "@/lib/validation/message-schemas";
import { validateBody } from "@/lib/validation/middleware";

// GET /api/messages/:threadId - Get thread detail with messages
export const GET = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const { threadId } = await routeParams.params;

    // Pre-check: try to resolve user's org context for tenant-scoped lookup
    let orgFilter: string | undefined;
    try {
      const ctx = await safeOrgContext();
      if (ctx.status === "ok" && ctx.orgId) {
        orgFilter = ctx.orgId;
      }
    } catch {
      // Client users won't have org context — that's ok, we'll fall back
    }

    // Fetch thread — prefer org-scoped query when possible
    let thread;
    if (orgFilter) {
      // Pro user: scope to their org first
      thread = await prisma.messageThread.findFirst({
        where: { id: threadId, orgId: orgFilter },
        include: {
          Message: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }

    // Fallback for client users or cross-org portal threads
    if (!thread) {
      thread = await prisma.messageThread.findUnique({
        where: { id: threadId },
        include: {
          Message: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // --- Expanded access check: participants, orgId, OR companyId ---
    let hasAccess = thread.participants.includes(userId);

    if (!hasAccess) {
      // Check org-level access (Pro viewing their org's thread)
      try {
        const ctx = await safeOrgContext();
        if (ctx.status === "ok" && ctx.orgId) {
          if (thread.orgId === ctx.orgId || thread.participants.includes(ctx.orgId)) {
            hasAccess = true;
          }
        }
      } catch {
        // safeOrgContext may fail for client users – that's fine
      }
    }

    if (!hasAccess) {
      // Check companyId-based access (Pro's company matches thread's orgId or tradePartnerId)
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
      // Check client-based access (Client viewing their thread)
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

    // --- Enrich with counterpart info ---
    let participantName = thread.subject || "Conversation";
    let participantAvatar: string | null = null;

    // If this is a client thread, enrich with client info for Pro viewers
    if (thread.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: thread.clientId },
        select: { id: true, name: true, avatarUrl: true },
      });
      if (client) {
        participantName = client.name || participantName;
        participantAvatar = client.avatarUrl || null;
      }
    }

    // If this thread has a tradePartnerId, enrich with contractor info for Client viewers
    if (thread.tradePartnerId) {
      const company = await prisma.tradesCompany.findUnique({
        where: { id: thread.tradePartnerId },
        select: { id: true, name: true, logo: true },
      });
      if (company) {
        // Only override if the viewer is the client side
        const isClientViewer = await prisma.client.findFirst({
          where: { userId },
          select: { id: true },
        });
        if (isClientViewer) {
          participantName = company.name || participantName;
          participantAvatar = company.logo || null;
        }
      }
    }

    // Return enriched thread object (matches what MessagesClient expects)
    const mappedMessages = thread.Message.map((msg) => ({
      id: msg.id,
      body: msg.body,
      content: msg.body, // alias for components using 'content'
      senderUserId: msg.senderUserId,
      senderType: msg.senderType,
      createdAt: msg.createdAt,
      fromPortal: msg.fromPortal,
      attachments: msg.attachments || [],
    }));

    return NextResponse.json({
      id: thread.id,
      subject: thread.subject,
      participantName,
      participantAvatar,
      participants: thread.participants,
      orgId: thread.orgId,
      clientId: thread.clientId,
      tradePartnerId: thread.tradePartnerId,
      isPortalThread: thread.isPortalThread,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      messages: mappedMessages, // lowercase 'messages' — matches MessagesClient
      Message: mappedMessages, // keep uppercase alias for backward compat
    });
  } catch (error) {
    logger.error("Error fetching Message:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
});

// POST /api/messages/:threadId - Send a message in a thread
export const POST = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const { threadId } = await routeParams.params;
    const body = await validateBody(req, sendMessageSchema);
    if (body instanceof NextResponse) return body;
    const { content, attachments } = body;

    // Verify user has access (expanded check matching GET)
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    let hasAccess = thread.participants.includes(userId);

    if (!hasAccess) {
      try {
        const ctx = await safeOrgContext();
        if (ctx.status === "ok" && ctx.orgId) {
          if (thread.orgId === ctx.orgId || thread.participants.includes(ctx.orgId)) {
            hasAccess = true;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!hasAccess) {
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

    // Create message + update thread in a single transaction
    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          id: crypto.randomUUID(),
          threadId,
          senderUserId: userId,
          senderType: "user",
          body: content.trim(),
        },
      });

      await tx.messageThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });

      return msg;
    });

    // Create notifications for other participants
    try {
      const { sendNewMessageEmail } = await import("@/lib/email/resend");

      const otherParticipants = thread.participants.filter((p) => p !== userId);

      for (const participantId of otherParticipants) {
        // Store notification in DB
        try {
          await prisma.tradeNotification.create({
            data: {
              recipientId: participantId,
              type: "new_message",
              title: "New Message",
              message: content.substring(0, 200),
              actionUrl: `/trades/messages?thread=${threadId}`,
              metadata: { threadId, senderId: userId },
            },
          });
        } catch (notifErr) {
          logger.error("[messages] TradeNotification create failed:", notifErr);
        }

        // Get participant email and send notification
        const participant = (await prisma.$queryRaw`
          SELECT email FROM users WHERE clerk_user_id = ${participantId} LIMIT 1
        `) as any[];

        if (participant?.[0]?.email) {
          await sendNewMessageEmail(
            participant[0].email,
            "Team Member", // Sender name
            content.substring(0, 150),
            threadId
          ).catch((err: Error) => logger.error("Failed to send message email:", err));
        }
      }
    } catch (error) {
      logger.error("Failed to create message notifications:", error);
      // Don't fail the request if notification fails
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    logger.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
});

// DELETE /api/messages/:threadId - Delete a thread and all its messages
export const DELETE = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const { threadId } = await routeParams.params;

    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Verify user has access to delete
    let hasAccess = thread.participants.includes(userId);

    if (!hasAccess) {
      try {
        const ctx = await safeOrgContext();
        if (ctx.status === "ok" && ctx.orgId) {
          if (thread.orgId === ctx.orgId || thread.participants.includes(ctx.orgId)) {
            hasAccess = true;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!hasAccess) {
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete all messages + thread in a single transaction
    await prisma.$transaction(async (tx) => {
      await tx.message.deleteMany({ where: { threadId } });
      await tx.messageThread.delete({ where: { id: threadId } });
    });

    return NextResponse.json({ success: true, message: "Thread deleted" });
  } catch (error) {
    logger.error("Error deleting thread:", error);
    return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
  }
});

// PATCH /api/messages/:threadId - Archive or unarchive a thread
export const PATCH = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const { threadId } = await routeParams.params;
    const body = await validateBody(req, threadActionSchema);
    if (body instanceof NextResponse) return body;
    const { action } = body;

    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Access check (same as DELETE)
    let hasAccess = thread.participants.includes(userId);

    if (!hasAccess) {
      try {
        const ctx = await safeOrgContext();
        if (ctx.status === "ok" && ctx.orgId) {
          if (thread.orgId === ctx.orgId || thread.participants.includes(ctx.orgId)) {
            hasAccess = true;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!hasAccess) {
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "archive") {
      try {
        await prisma.messageThread.update({
          where: { id: threadId },
          data: { archivedAt: new Date(), archivedBy: userId },
        });
      } catch (dbErr) {
        // Column may not exist yet if migration hasn't been applied
        if (dbErr.message?.includes("archivedAt") || dbErr.code === "P2009") {
          logger.warn(
            "[messages] archivedAt column missing — run migration 20260211_message_thread_archived.sql"
          );
          return NextResponse.json(
            { error: "Archive feature requires a database migration. Please contact support." },
            { status: 503 }
          );
        }
        throw dbErr;
      }
      return NextResponse.json({ success: true, message: "Thread archived" });
    } else if (action === "unarchive") {
      try {
        await prisma.messageThread.update({
          where: { id: threadId },
          data: { archivedAt: null, archivedBy: null },
        });
      } catch (dbErr) {
        if (dbErr.message?.includes("archivedAt") || dbErr.code === "P2009") {
          logger.warn(
            "[messages] archivedAt column missing — run migration 20260211_message_thread_archived.sql"
          );
          return NextResponse.json(
            { error: "Unarchive feature requires a database migration. Please contact support." },
            { status: 503 }
          );
        }
        throw dbErr;
      }
      return NextResponse.json({ success: true, message: "Thread unarchived" });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'archive' or 'unarchive'" },
      { status: 400 }
    );
  } catch (error) {
    logger.error("Error updating thread:", error);
    return NextResponse.json({ error: "Failed to update thread" }, { status: 500 });
  }
});
