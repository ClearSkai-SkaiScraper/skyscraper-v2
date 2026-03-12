/**
 * GET /api/portal/claims/[claimId]/signatures
 *
 * Lists signature envelopes for a claim that the client has access to.
 * Returns pending and completed signature requests.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { isPortalAuthError, requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  try {
    const authResult = await requirePortalAuth();
    if (isPortalAuthError(authResult)) return authResult;
    const { userId, email } = authResult;

    const { claimId } = await params;

    // Verify the client has access to this claim
    const hasAccess = await verifyClaimAccess(claimId, userId, email);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get signature envelopes for this claim
    const envelopes = await prisma.signatureEnvelope.findMany({
      where: { claimId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        documentName: true,
        documentUrl: true,
        signedDocumentUrl: true,
        status: true,
        signerEmail: true,
        signerName: true,
        signerRole: true,
        sentAt: true,
        viewedAt: true,
        signedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Filter to only show envelopes relevant to this client
    const clientEnvelopes = email
      ? envelopes.filter(
          (env) =>
            env.signerEmail.toLowerCase() === email.toLowerCase() ||
            env.signerRole === "client" ||
            env.status === "signed" // Show all signed docs for transparency
        )
      : envelopes.filter((env) => env.signerRole === "client");

    const signatures = clientEnvelopes.map((env) => ({
      id: env.id,
      name: env.documentName,
      status: env.status,
      documentUrl: env.documentUrl,
      signedDocumentUrl: env.signedDocumentUrl,
      signerName: env.signerName,
      sentAt: env.sentAt,
      viewedAt: env.viewedAt,
      signedAt: env.signedAt,
      expiresAt: env.expiresAt,
      createdAt: env.createdAt,
    }));

    return NextResponse.json({
      ok: true,
      signatures,
    });
  } catch (error) {
    logger.error("[PORTAL_CLAIM_SIGNATURES]", error);
    return NextResponse.json({ error: "Failed to fetch signatures" }, { status: 500 });
  }
}

async function verifyClaimAccess(
  claimId: string,
  userId: string,
  email: string | null
): Promise<boolean> {
  if (email) {
    const access = await prisma.client_access.findFirst({
      where: { claimId, email },
    });
    if (access) return true;
  }

  const client = await prisma.client.findFirst({
    where: { OR: [{ userId }, ...(email ? [{ email }] : [])] },
    select: { id: true },
  });

  if (client) {
    const link = await prisma.claimClientLink.findFirst({
      where: {
        claimId,
        OR: [{ clientUserId: client.id }, ...(email ? [{ clientEmail: email }] : [])],
        status: "ACCEPTED",
      },
    });
    if (link) return true;
  }

  return false;
}
