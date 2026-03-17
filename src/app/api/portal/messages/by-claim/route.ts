export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET + POST /api/portal/messages/by-claim?claimId=xxx
 *
 * Messaging endpoint for the client portal (claim-based).
 * GET: Returns message thread for a claim
 * POST: Sends a new message from the client
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

async function verifyClientAccess(email: string, claimId: string) {
  const result = await prisma.$queryRaw<{ id: string; orgId: string }[]>`
    SELECT cl.id, cl."orgId" FROM claims cl
    JOIN properties p ON p.id = cl."propertyId"
    JOIN contacts c ON c.id = p."contactId"
    WHERE cl.id = ${claimId}
      AND LOWER(c.email) = LOWER(${email})
    LIMIT 1
  `;
  return result.length > 0 ? { id: result[0].id, orgId: result[0].orgId } : null;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const claimId = req.nextUrl.searchParams.get("claimId");
    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    const claim = await verifyClientAccess(email, claimId);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Fetch messages for this claim thread
    let messages: any[] = [];
    try {
      messages = await prisma.$queryRaw`
        SELECT
          m.id,
          m.content,
          m."senderType" as "senderType",
          m."senderName" as "senderName",
          m."createdAt" as "createdAt",
          m."readAt" as "readAt"
        FROM messages m
        WHERE m."threadId" IN (
          SELECT mt.id FROM message_threads mt
          WHERE mt."claimId" = ${claimId}
            AND mt."orgId" = ${claim.orgId}
        )
        ORDER BY m."createdAt" ASC
        LIMIT 200
      `;
    } catch {
      messages = [];
    }

    return NextResponse.json({ messages });
  } catch (error) {
    logger.error("[PORTAL_MESSAGES_GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || email || "Client";

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const body = await req.json();
    const { claimId, content } = body;

    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    const claim = await verifyClientAccess(email, claimId);
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    if (content.length > 5000) {
      return NextResponse.json({ error: "Message too long (max 5000 chars)" }, { status: 400 });
    }

    // Find or create message thread
    let threadId: string;
    try {
      const existingThread = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM message_threads
        WHERE "claimId" = ${claimId} AND "orgId" = ${claim.orgId}
        LIMIT 1
      `;

      if (existingThread.length > 0) {
        threadId = existingThread[0].id;
      } else {
        const { createId } = await import("@paralleldrive/cuid2");
        threadId = createId();
        await prisma.$executeRaw`
          INSERT INTO message_threads (id, "claimId", "orgId", "createdAt")
          VALUES (${threadId}, ${claimId}, ${claim.orgId}, NOW())
        `;
      }

      const { createId } = await import("@paralleldrive/cuid2");
      const messageId = createId();
      await prisma.$executeRaw`
        INSERT INTO messages (id, "threadId", content, "senderType", "senderName", "senderEmail", "createdAt")
        VALUES (${messageId}, ${threadId}, ${content.trim()}, 'client', ${name}, ${email}, NOW())
      `;

      return NextResponse.json({
        success: true,
        message: {
          id: messageId,
          content: content.trim(),
          senderType: "client",
          senderName: name,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      logger.error("[PORTAL_MESSAGES_POST] DB error:", err);
      return NextResponse.json(
        { error: "Messaging is not available yet. Please contact your contractor directly." },
        { status: 503 }
      );
    }
  } catch (error) {
    logger.error("[PORTAL_MESSAGES_POST] Error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
