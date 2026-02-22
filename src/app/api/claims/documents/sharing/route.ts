import { NextRequest, NextResponse } from "next/server";

import { ok, withErrorHandler } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/apiAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/claims/documents/sharing?claimId=...&clientId=...
 * Returns documents for a claim with their sharing status.
 * Used by ClientDocumentSharing component.
 */
async function handleGET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { orgId } = authResult;
  if (!orgId) {
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const claimId = searchParams.get("claimId");
  const clientId = searchParams.get("clientId");

  if (!claimId) {
    return NextResponse.json({ error: "claimId is required" }, { status: 400 });
  }

  // Verify the claim belongs to this org
  const claim = await prisma.claims.findFirst({
    where: { id: claimId, orgId },
    select: { id: true },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  try {
    const documents = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        mime_type: string | null;
        size_bytes: number | null;
        is_shared_with_client: boolean;
        shared_at: Date | null;
        created_at: Date;
      }>
    >`
      SELECT
        id,
        name,
        mime_type,
        size_bytes,
        is_shared_with_client,
        shared_at,
        created_at
      FROM claim_documents
      WHERE claim_id = ${claimId}
        AND is_archived = FALSE
      ORDER BY created_at DESC
    `;

    const transformed = documents.map((doc) => {
      // Derive a user-friendly type from mime_type
      let type: "photo" | "report" | "estimate" | "other" = "other";
      if (doc.mime_type?.startsWith("image/")) type = "photo";
      else if (doc.mime_type === "application/pdf") type = "report";

      // Human-readable size
      const sizeBytes = doc.size_bytes ?? 0;
      const size =
        sizeBytes > 1_000_000
          ? `${(sizeBytes / 1_000_000).toFixed(1)} MB`
          : sizeBytes > 1_000
            ? `${(sizeBytes / 1_000).toFixed(0)} KB`
            : `${sizeBytes} B`;

      return {
        id: doc.id,
        name: doc.name,
        type,
        size,
        shared: doc.is_shared_with_client,
        sharedAt: doc.shared_at
          ? doc.shared_at instanceof Date
            ? doc.shared_at.toISOString()
            : String(doc.shared_at)
          : undefined,
      };
    });

    return ok({ documents: transformed });
  } catch (dbError) {
    logger.warn(
      "[GET /api/claims/documents/sharing] DB error (returning empty):",
      dbError instanceof Error ? dbError.message : dbError
    );
    return ok({ documents: [] });
  }
}

/**
 * POST /api/claims/documents/sharing
 * Toggle sharing status for a document.
 * Body: { documentId, claimId, clientId, shared }
 */
async function handlePOST(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { userId, orgId } = authResult;
  if (!orgId) {
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  const body = await req.json();
  const { documentId, claimId, shared } = body;

  if (!documentId || !claimId) {
    return NextResponse.json({ error: "documentId and claimId are required" }, { status: 400 });
  }

  // Verify the claim belongs to this org
  const claim = await prisma.claims.findFirst({
    where: { id: claimId, orgId },
    select: { id: true },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  try {
    await prisma.$executeRaw`
      UPDATE claim_documents
      SET
        is_shared_with_client = ${shared ? true : false},
        shared_at = ${shared ? new Date() : null},
        shared_by_user_id = ${shared ? userId : null}
      WHERE id = ${documentId}
        AND claim_id = ${claimId}
    `;

    return ok({
      message: shared ? "Document shared with client" : "Document unshared",
      documentId,
      shared,
    });
  } catch (dbError) {
    logger.error(
      "[POST /api/claims/documents/sharing] DB error:",
      dbError instanceof Error ? dbError.message : dbError
    );
    return NextResponse.json({ error: "Failed to update document sharing" }, { status: 500 });
  }
}

export const GET = withErrorHandler(handleGET, "GET /api/claims/documents/sharing");
export const POST = withErrorHandler(handlePOST, "POST /api/claims/documents/sharing");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
