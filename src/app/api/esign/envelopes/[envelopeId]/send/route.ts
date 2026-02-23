/**
 * POST /api/esign/envelopes/[id]/send
 *
 * Send an envelope to the designated signer
 * Uses the actual SignatureEnvelope schema with single signer info
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ envelopeId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    const { envelopeId } = await params;

    // Get envelope
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

    // Check if envelope has signer info
    if (!envelope.signerEmail) {
      return NextResponse.json(
        { ok: false, message: "No signer email configured" },
        { status: 400 }
      );
    }

    // Update envelope status to sent
    await prisma.signatureEnvelope.update({
      where: { id: envelopeId },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    });

    // TODO: Integrate with email service to send signing invitation
    logger.debug(`[ESIGN] Envelope ${envelopeId} sent to ${envelope.signerEmail}`);

    return NextResponse.json({
      ok: true,
      message: "Envelope sent successfully",
      envelope: {
        id: envelope.id,
        status: "sent",
        signerEmail: envelope.signerEmail,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    logger.error("[ENVELOPE_SEND_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "Failed to send" },
      { status: 500 }
    );
  }
}
