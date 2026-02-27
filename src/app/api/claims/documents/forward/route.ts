/**
 * POST /api/claims/documents/forward
 * Forward a document to a connected client.
 * Creates a notification and sets visibleToClient = true.
 *
 * Body: { documentId, claimId, clientId?, message? }
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const forwardSchema = z.object({
  documentId: z.string(),
  claimId: z.string(),
  clientId: z.string().optional(),
  message: z.string().max(500).optional(),
});

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "Organization context required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = forwardSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { documentId, claimId, clientId, message } = validation.data;

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: { id: true, clientId: true },
    });

    if (!claim) {
      return NextResponse.json({ ok: false, error: "Claim not found" }, { status: 404 });
    }

    // Verify document belongs to claim
    const doc = await prisma.file_assets.findFirst({
      where: { id: documentId, claimId, orgId },
      select: { id: true, filename: true, visibleToClient: true },
    });

    if (!doc) {
      return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
    }

    // Set document as visible to client
    await prisma.file_assets.updateMany({
      where: { id: documentId, claimId, orgId },
      data: { visibleToClient: true },
    });

    // Determine the client to notify
    const resolvedClientId = clientId || claim.clientId;

    // Create notification for client if we have a clientId
    if (resolvedClientId) {
      try {
        await prisma.clientNotification.create({
          data: {
            clientId: resolvedClientId,
            type: "document_shared",
            title: "📄 New Document Shared",
            message: message
              ? `Your contractor shared "${doc.filename}": ${message}`
              : `Your contractor shared "${doc.filename}" with you.`,
            actionUrl: `/portal/claims/${claimId}`,
          },
        });
      } catch (notifErr) {
        logger.warn("[documents/forward] Notification error:", notifErr);
      }
    }

    // Also create a message in the claim thread if one exists
    try {
      const thread = await prisma.messageThread.findFirst({
        where: {
          claimId,
          orgId,
          ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
        },
        select: { id: true },
      });

      if (thread) {
        await prisma.message.create({
          data: {
            id: crypto.randomUUID(),
            threadId: thread.id,
            senderUserId: userId,
            senderType: "pro",
            body: message
              ? `📎 Shared document: ${doc.filename}\n${message}`
              : `📎 Shared document: ${doc.filename}`,
            attachments: [],
          },
        });

        await prisma.messageThread.update({
          where: { id: thread.id },
          data: { updatedAt: new Date() },
        });
      }
    } catch (threadErr) {
      logger.warn("[documents/forward] Thread message error:", threadErr);
    }

    return NextResponse.json({
      ok: true,
      message: `Document "${doc.filename}" forwarded to client`,
      documentId,
      shared: true,
    });
  } catch (error) {
    logger.error("[POST /api/claims/documents/forward]", error);
    return NextResponse.json({ ok: false, error: "Failed to forward document" }, { status: 500 });
  }
});
