/**
 * Portal Messages Actions - Unified handler for messaging operations
 *
 * POST /api/portal/messages/actions
 * Actions: send, create_thread, mark_read, archive
 *
 * Real models: Message (senderUserId/body), MessageThread (participants String[]).
 * No messageReadReceipt / threadArchive tables.
 */

import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    threadId: z.string(),
    content: z.string(),
  }),
  z.object({
    action: z.literal("create_thread"),
    recipientId: z.string(),
    subject: z.string().optional(),
    initialMessage: z.string(),
    claimId: z.string().optional(),
  }),
  z.object({
    action: z.literal("mark_read"),
    threadId: z.string(),
  }),
  z.object({
    action: z.literal("archive"),
    threadId: z.string(),
  }),
]);

type ActionInput = z.infer<typeof ActionSchema>;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    switch (input.action) {
      case "send":
        return handleSend(userId, input);

      case "create_thread":
        return handleCreateThread(userId, input);

      case "mark_read":
        return handleMarkRead(userId, input);

      case "archive":
        return handleArchive(userId, input);

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[Portal Messages Actions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleSend(userId: string, input: Extract<ActionInput, { action: "send" }>) {
  // Verify user is a participant (participants is String[])
  const thread = await prisma.messageThread.findFirst({
    where: {
      id: input.threadId,
      participants: { has: userId },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      id: crypto.randomUUID(),
      threadId: input.threadId,
      senderUserId: userId,
      senderType: "client",
      body: input.content,
    },
  });

  await prisma.messageThread.update({
    where: { id: input.threadId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ success: true, message });
}

async function handleCreateThread(
  userId: string,
  input: Extract<ActionInput, { action: "create_thread" }>
) {
  const thread = await prisma.messageThread.create({
    data: {
      id: crypto.randomUUID(),
      orgId: "",
      subject: input.subject,
      claimId: input.claimId,
      participants: [userId, input.recipientId],
      isPortalThread: true,
      Message: {
        create: {
          id: crypto.randomUUID(),
          senderUserId: userId,
          senderType: "client",
          body: input.initialMessage,
        },
      },
    },
    include: { Message: true },
  });

  return NextResponse.json({ success: true, thread });
}

async function handleMarkRead(
  userId: string,
  input: Extract<ActionInput, { action: "mark_read" }>
) {
  // No messageReadReceipt table — bulk-mark messages in thread as read
  await prisma.message
    .updateMany({
      where: { threadId: input.threadId, read: false },
      data: { read: true },
    })
    .catch((e) =>
      logger.warn("[PORTAL_MESSAGES] Mark-read failed", {
        threadId: input.threadId,
        error: e?.message,
      })
    );

  return NextResponse.json({ success: true });
}

async function handleArchive(userId: string, input: Extract<ActionInput, { action: "archive" }>) {
  // Use MessageThread archivedAt / archivedBy fields (no threadArchive table)
  await prisma.messageThread.update({
    where: { id: input.threadId },
    data: {
      archivedAt: new Date(),
      archivedBy: userId,
    },
  });

  return NextResponse.json({ success: true });
}
