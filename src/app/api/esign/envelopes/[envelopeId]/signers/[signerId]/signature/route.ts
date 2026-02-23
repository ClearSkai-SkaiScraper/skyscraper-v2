/**
 * POST /api/esign/envelopes/[id]/signers/[signerId]/signature
 *
 * Save a signature for a specific signer
 *
 * NOTE: This feature requires schema migration - esign models not yet implemented.
 * The esignSigner, esignEnvelope, esignFieldDefinition, esignFieldValue, and esignEvent
 * models need to be added to the Prisma schema before this endpoint can function.
 */

import { mkdir, writeFile } from "fs/promises";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { storagePaths } from "@/lib/esign/storage";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { envelopeId: string; signerId: string } }
) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    const envelopeId = params.envelopeId;
    const signerId = params.signerId;

    // Use existing SignatureEnvelope model
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

    // Parse request
    const formData = await req.formData();
    const fieldId = formData.get("fieldId") as string;
    const signatureImage = formData.get("signature") as File | null;
    const printedName = formData.get("printedName") as string | null;

    if (!fieldId || !signatureImage) {
      return NextResponse.json(
        { ok: false, message: "Missing fieldId or signature" },
        { status: 400 }
      );
    }

    // Save signature image to filesystem
    const bytes = await signatureImage.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const signaturePath = storagePaths.signaturePath(envelopeId, signerId, fieldId);
    const dir = join(process.cwd(), "public", "esign", envelopeId, "signatures");
    await mkdir(dir, { recursive: true });

    const filePath = join(process.cwd(), "public", signaturePath.substring(1));
    await writeFile(filePath, buffer);

    // Update envelope status using existing SignatureEnvelope model
    await prisma.signatureEnvelope.update({
      where: { id: envelopeId },
      data: {
        status: "signed",
        signedAt: new Date(),
        signedDocumentUrl: signaturePath,
        metadata: {
          ...((envelope.metadata as object) || {}),
          lastSignerId: signerId,
          lastFieldId: fieldId,
          printedName: printedName || undefined,
          signedByIp: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
          signedUserAgent: req.headers.get("user-agent") || null,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Signature saved using simplified signature model",
    });
  } catch (error) {
    logger.error("[SIGNATURE_SAVE_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "Failed to save signature" },
      { status: 500 }
    );
  }
}
