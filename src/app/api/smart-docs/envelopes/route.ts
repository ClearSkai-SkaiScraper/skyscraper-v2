/**
 * GET /api/smart-docs/envelopes
 *
 * Returns all e-sign envelopes for the current organization.
 * Used by the Smart Documents hub page.
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    // Get all claim IDs belonging to this org, then filter envelopes
    const orgClaims = await prisma.claims.findMany({
      where: { orgId },
      select: { id: true },
    });
    const orgClaimIds = orgClaims.map((c) => c.id);

    const envelopes = await prisma.signatureEnvelope.findMany({
      where: {
        claimId: { in: orgClaimIds },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        documentName: true,
        status: true,
        signerEmail: true,
        signerName: true,
        signerRole: true,
        sentAt: true,
        signedAt: true,
        createdAt: true,
        claimId: true,
        documentUrl: true,
        signedDocumentUrl: true,
      },
    });

    return NextResponse.json({ ok: true, envelopes });
  } catch (error) {
    logger.error("[SMART_DOCS_LIST_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to load documents",
      },
      { status: 500 }
    );
  }
}
