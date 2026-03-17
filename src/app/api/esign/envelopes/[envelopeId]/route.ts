/**
 * GET /api/esign/envelopes/[id]
 *
 * Get envelope details — requires auth + org ownership verification
 */

import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ envelopeId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    const { envelopeId } = await params;

    const envelope = await prisma.signatureEnvelope.findUnique({
      where: { id: envelopeId },
    });

    if (!envelope) {
      return NextResponse.json({ ok: false, message: "Envelope not found" }, { status: 404 });
    }

    // Org isolation: verify linked claim belongs to this org
    if (envelope.claimId) {
      const claim = await prisma.claims.findFirst({
        where: { id: envelope.claimId, orgId },
        select: { id: true },
      });
      if (!claim) {
        return NextResponse.json({ ok: false, message: "Envelope not found" }, { status: 404 });
      }
    }

    return NextResponse.json({
      ok: true,
      envelope: {
        id: envelope.id,
        provider: envelope.provider,
        externalId: envelope.externalId,
        status: envelope.status,
        documentName: envelope.documentName,
        documentUrl: envelope.documentUrl,
        signedDocumentUrl: envelope.signedDocumentUrl,
        signerEmail: envelope.signerEmail,
        signerName: envelope.signerName,
        signerRole: envelope.signerRole,
        sentAt: envelope.sentAt,
        viewedAt: envelope.viewedAt,
        signedAt: envelope.signedAt,
        expiresAt: envelope.expiresAt,
        createdAt: envelope.createdAt,
        metadata: envelope.metadata,
      },
    });
  } catch (error) {
    logger.error("[ENVELOPE_GET_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "Failed to get envelope" },
      { status: 500 }
    );
  }
}
