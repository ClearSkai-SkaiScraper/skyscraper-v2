/**
 * POST /api/esign/envelopes/[id]/signers/[signerId]/signature
 *
 * Save a signature for a specific signer — uploads to Supabase Storage
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { storagePaths } from "@/lib/esign/storage";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ESIGN_BUCKET = "esign";

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

    // Upload signature image to Supabase Storage
    const bytes = await signatureImage.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const storageKey = storagePaths.signaturePath(envelopeId, signerId, fieldId);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      logger.error("[SIGNATURE_SAVE] Supabase admin client not configured");
      return NextResponse.json({ ok: false, message: "Storage not configured" }, { status: 503 });
    }

    const { error: uploadError } = await supabase.storage
      .from(ESIGN_BUCKET)
      .upload(storageKey, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      logger.error("[SIGNATURE_UPLOAD_ERROR]", { error: uploadError.message, storageKey });
      return NextResponse.json(
        { ok: false, message: "Failed to upload signature" },
        { status: 500 }
      );
    }

    // Store the Supabase storage key (not a filesystem path)
    const signatureUrl = `supabase://${ESIGN_BUCKET}/${storageKey}`;

    // Update envelope status using existing SignatureEnvelope model
    await prisma.signatureEnvelope.update({
      where: { id: envelopeId },
      data: {
        status: "signed",
        signedAt: new Date(),
        signedDocumentUrl: signatureUrl,
        metadata: {
          ...((envelope.metadata as object) || {}),
          lastSignerId: signerId,
          lastFieldId: fieldId,
          printedName: printedName || undefined,
          signedByIp: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
          signedUserAgent: req.headers.get("user-agent") || null,
          storageBucket: ESIGN_BUCKET,
          storageKey,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Signature saved to Supabase Storage",
    });
  } catch (error) {
    logger.error("[SIGNATURE_SAVE_ERROR]", error);
    return NextResponse.json({ ok: false, message: "Failed to save signature" }, { status: 500 });
  }
}
