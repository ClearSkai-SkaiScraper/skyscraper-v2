/**
 * POST /api/esign/envelopes/[envelopeId]/finalize
 *
 * Finalize envelope - mark signature as complete
 * Resolves Supabase Storage URLs for signed documents
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { resolveEsignUrl } from "@/lib/esign/resolveUrl";
import { sendTemplatedNotification } from "@/lib/notifications/templates";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { envelopeId: string } }) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    const envelopeId = params.envelopeId;

    // Get envelope using SignatureEnvelope model
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

    // Check if already signed
    if (envelope.status === "signed") {
      const resolvedUrl = await resolveEsignUrl(envelope.signedDocumentUrl);
      return NextResponse.json({
        ok: true,
        message: "Envelope already finalized",
        status: envelope.status,
        signedDocumentUrl: resolvedUrl,
      });
    }

    // Check if envelope is in valid state for finalization
    if (envelope.status === "voided" || envelope.status === "declined") {
      return NextResponse.json(
        { ok: false, message: `Cannot finalize ${envelope.status} envelope` },
        { status: 400 }
      );
    }

    // Update envelope status to signed/completed
    const updatedEnvelope = await prisma.signatureEnvelope.update({
      where: { id: envelopeId },
      data: {
        status: "signed",
        signedAt: new Date(),
        // signedDocumentUrl would be set by the signing process
      },
    });

    // Create claim document if claim exists (AUTO-ATTACH)
    if (envelope.claimId && envelope.documentUrl) {
      const docUrl = envelope.signedDocumentUrl || envelope.documentUrl;
      const docTitle = (envelope.documentName || "Document") + " (Signed)";

      // Insert into legacy claim_documents table
      await prisma.$executeRaw`
        INSERT INTO claim_documents (claim_id, title, file_path, file_type, created_at)
        VALUES (${envelope.claimId}, ${docTitle}, ${docUrl}, 'pdf', NOW())
        ON CONFLICT DO NOTHING
      `;

      // Also insert into file_assets so it's visible in the client portal
      try {
        await prisma.file_assets.create({
          data: {
            id: crypto.randomUUID(),
            claimId: envelope.claimId,
            orgId: orgId,
            ownerId: auth.userId ?? "system",
            filename: docTitle,
            mimeType: "application/pdf",
            publicUrl: docUrl,
            storageKey: `esign/${envelopeId}/${docTitle}`,
            bucket: "esign-documents",
            category: "esign",
            visibleToClient: true,
            sizeBytes: 0,
            updatedAt: new Date(),
          },
        });
        logger.info("[ENVELOPE_FINALIZE] Signed doc added to client-visible file_assets", {
          envelopeId,
          claimId: envelope.claimId,
        });
      } catch (faErr) {
        // Non-fatal — legacy table insert succeeded
        logger.error("[ENVELOPE_FINALIZE] file_assets insert error:", faErr);
      }
    }

    // Send DOCUMENT_SIGNED notification
    try {
      const { userId } = auth;
      if (userId) {
        await sendTemplatedNotification("DOCUMENT_SIGNED", userId, {
          documentName: envelope.documentName || "Document",
          envelopeId,
        });
      }
    } catch (notifErr) {
      logger.error("[DOCUMENT_SIGNED] Notification error:", notifErr);
    }

    // Post signed document as a message attachment to claim thread (if exists)
    if (envelope.claimId) {
      try {
        const thread = await prisma.messageThread.findFirst({
          where: { claimId: envelope.claimId, orgId },
          select: { id: true },
        });
        if (thread) {
          const docUrl = updatedEnvelope.signedDocumentUrl || envelope.documentUrl || "";
          const docName = envelope.documentName || "Document";
          await prisma.message.create({
            data: {
              id: crypto.randomUUID(),
              threadId: thread.id,
              senderUserId: auth.userId ?? "system",
              senderType: "pro",
              body: `📝 "${docName}" has been signed and finalized.`,
              attachments: docUrl ? [docUrl] : [],
              read: false,
            },
          });
          logger.info("[ENVELOPE_FINALIZE] Signed doc posted to message thread", {
            envelopeId,
            threadId: thread.id,
          });
        }
      } catch (msgErr) {
        logger.error("[ENVELOPE_FINALIZE] Message thread post error:", msgErr);
      }
    }

    return NextResponse.json({
      ok: true,
      signedDocumentUrl: await resolveEsignUrl(updatedEnvelope.signedDocumentUrl),
      status: updatedEnvelope.status,
    });
  } catch (error) {
    logger.error("[ENVELOPE_FINALIZE_ERROR]", error);
    return NextResponse.json({ ok: false, message: "Failed to finalize" }, { status: 500 });
  }
}
