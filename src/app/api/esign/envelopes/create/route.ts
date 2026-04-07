/**
 * POST /api/esign/envelopes/create
 *
 * Create a new e-signature envelope from a template
 * Input: { claimId?, templateId, title, signers: [{role, name, email?}], requiredSignerCount }
 *
 * NOTE: This feature requires schema migration - esign models not yet implemented.
 * Uses existing SignatureEnvelope model as a simplified alternative.
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateEnvelopeRequest {
  claimId?: string;
  templateId?: string;
  title: string;
  signers: Array<{
    role: string; // "HOMEOWNER" | "CONTRACTOR" | "SPOUSE" | "WITNESS"
    displayName: string;
    email?: string;
    phone?: string;
  }>;
  requiredSignerCount?: number;
}

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body: CreateEnvelopeRequest = await req.json();

    // Validate at least one signer is provided
    if (!body.signers || body.signers.length === 0) {
      return NextResponse.json(
        { ok: false, message: "At least one signer is required" },
        { status: 400 }
      );
    }

    const primarySigner = body.signers[0];
    if (!primarySigner.email) {
      return NextResponse.json(
        { ok: false, message: "Primary signer email is required" },
        { status: 400 }
      );
    }

    // Create envelope using existing SignatureEnvelope model
    const envelope = await prisma.signatureEnvelope.create({
      data: {
        id: crypto.randomUUID(),
        documentName: body.title,
        status: "draft",
        claimId: body.claimId || null,
        signerEmail: primarySigner.email,
        signerName: primarySigner.displayName,
        signerRole: primarySigner.role?.toLowerCase() || "client",
        metadata: {
          templateId: body.templateId || null,
          requiredSignerCount: body.requiredSignerCount || body.signers.length,
          additionalSigners: body.signers.slice(1).map((s) => ({
            role: s.role,
            displayName: s.displayName,
            email: s.email,
            phone: s.phone,
          })),
          createdBy: userId,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      envelopeId: envelope.id,
      signers: body.signers.map((s, idx) => ({
        id: `signer-${idx}`,
        role: s.role,
        displayName: s.displayName,
      })),
      message: "Envelope created using simplified signature model",
    });
  } catch (error) {
    logger.error("[ENVELOPE_CREATE_ERROR]", error);
    return NextResponse.json({ ok: false, message: "Failed to create envelope" }, { status: 500 });
  }
});
