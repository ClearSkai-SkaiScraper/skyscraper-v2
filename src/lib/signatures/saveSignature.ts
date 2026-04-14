import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Save Signature
 * Uses the SignatureEnvelope model to record signatures.
 * The old generatedDocument/documentSignature models are deprecated.
 * This now creates or updates a SignatureEnvelope record.
 */

interface SaveSignatureOptions {
  documentId: string;
  signerName: string;
  signerEmail: string;
  role: string;
  signature: string; // base64 or data URL of signature image
  orgId?: string; // Tenant isolation — scope lookups to org
}

export async function saveSignature({
  documentId,
  signerName,
  signerEmail,
  role,
  signature,
  orgId,
}: SaveSignatureOptions) {
  logger.info(`[signatures] Saving signature for document ${documentId} by ${signerName}`, {
    orgId,
  });

  // Check if there's already a SignatureEnvelope for this document
  let envelope = await prisma.signatureEnvelope.findFirst({
    where: { id: documentId },
  });

  if (envelope) {
    // Update existing envelope with signature
    envelope = await prisma.signatureEnvelope.update({
      where: { id: documentId },
      data: {
        status: "signed",
        signedAt: new Date(),
        signerName,
        signerEmail,
        signerRole: role.toLowerCase(),
        signedDocumentUrl: signature.substring(0, 500), // Store reference, not full base64
        metadata: {
          ...((envelope.metadata as object) || {}),
          signatureRecordedAt: new Date().toISOString(),
          signatureMethod: "inline",
        },
      },
    });
  } else {
    // Create a new envelope record for standalone signature capture
    envelope = await prisma.signatureEnvelope.create({
      data: {
        id: crypto.randomUUID(),
        documentName: `Signed Document - ${documentId}`,
        status: "signed",
        signerName,
        signerEmail,
        signerRole: role.toLowerCase(),
        signedAt: new Date(),
        signedDocumentUrl: signature.substring(0, 500),
        metadata: {
          originalDocumentId: documentId,
          signatureMethod: "inline",
          signatureRecordedAt: new Date().toISOString(),
        },
      },
    });
  }

  logger.info(`[signatures] ✅ Signature saved for envelope ${envelope.id}`);

  return {
    success: true,
    envelopeId: envelope.id,
    status: envelope.status,
    signedAt: envelope.signedAt,
  };
}
