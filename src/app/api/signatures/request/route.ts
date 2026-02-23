// /api/signatures/request

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { notifySignatureRequested } from "@/lib/notifications/sendNotification";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTestMode } from "@/lib/testMode";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { claimId, documentId, signerName, signerEmail, message } = body;

    if (!claimId || !documentId || !signerName || !signerEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify claim belongs to user's org
    await getOrgClaimOrThrow(orgId, claimId);

    // Verify document exists
    const document = await prisma.documents.findFirst({
      where: {
        id: documentId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Create signature envelope (e-sign request)
    const signatureEnvelope = await prisma.signatureEnvelope.create({
      data: {
        id: crypto.randomUUID(),
        claimId,
        documentName: document.title,
        documentUrl: document.url,
        signerName,
        signerEmail,
        signerRole: "client",
        status: "sent",
        provider: "internal",
        sentAt: new Date(),
        metadata: {
          documentId,
          requesterId: userId,
          signerMessage: message,
        },
      },
    });

    // Log event (using snake_case fields per Prisma schema)
    await prisma.claim_timeline_events.create({
      data: {
        id: crypto.randomUUID(),
        claim_id: claimId,
        type: "signature_requested",
        actor_id: userId,
        actor_type: "user",
        visible_to_client: true,
        metadata: {
          documentId,
          documentName: document.title,
          signerEmail,
          requestId: signatureEnvelope.id,
        },
      },
    });

    // Send notification to signer (uses 3 args: userId, documentId, documentName)
    await notifySignatureRequested(userId, documentId, document.title);

    // In test mode, log instead of sending email
    if (isTestMode()) {
      logger.info(
        `[TestMode][Notify] Signature requested from ${signerEmail} for document "${document.title}"`
      );
    }

    return NextResponse.json({
      success: true,
      signatureRequest: signatureEnvelope,
      message: "Signature request sent successfully",
    });
  } catch (error) {
    logger.error("Error creating signature request:", error);
    return NextResponse.json(
      { error: "Failed to create signature request" },
      { status: 500 }
    );
  }
});
