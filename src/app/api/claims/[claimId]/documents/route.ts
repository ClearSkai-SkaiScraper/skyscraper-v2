import { NextRequest, NextResponse } from "next/server";

import { ok, withErrorHandler } from "@/lib/api/response";
import { requireApiAuth, verifyClaimAccess } from "@/lib/auth/apiAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/claims/[claimId]/documents
 * Fetch all documents for a claim from claim_documents table (raw SQL — not in Prisma schema)
 */
async function handleGET(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { userId, orgId } = authResult;
  const { claimId } = await params;

  // Verify claim access
  const accessResult = await verifyClaimAccess(claimId, orgId, userId);
  if (accessResult instanceof NextResponse) {
    return accessResult;
  }

  try {
    // claim_documents is a raw SQL table, not in Prisma schema
    const documents = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        url: string;
        mime_type: string | null;
        size_bytes: number | null;
        uploaded_by_id: string | null;
        is_shared_with_client: boolean;
        is_archived: boolean;
        created_at: Date;
      }>
    >`
      SELECT
        id,
        name,
        url,
        mime_type,
        size_bytes,
        uploaded_by_id,
        is_shared_with_client,
        is_archived,
        created_at
      FROM claim_documents
      WHERE claim_id = ${claimId}
        AND is_archived = FALSE
      ORDER BY created_at DESC
    `;

    // Transform snake_case DB columns to camelCase for front-end
    const transformed = documents.map((doc) => ({
      id: doc.id,
      type: doc.mime_type?.startsWith("image/") ? "PHOTO" : "OTHER",
      title: doc.name,
      description: null,
      publicUrl: doc.url,
      mimeType: doc.mime_type,
      fileSize: doc.size_bytes,
      visibleToClient: doc.is_shared_with_client,
      createdAt:
        doc.created_at instanceof Date ? doc.created_at.toISOString() : String(doc.created_at),
      createdBy: {
        name: doc.uploaded_by_id || "System",
        email: "",
      },
    }));

    return ok({ documents: transformed });
  } catch (dbError: any) {
    // Table may not exist yet or other DB errors — return empty gracefully
    logger.warn(
      "[GET /api/claims/[claimId]/documents] DB error (returning empty):",
      dbError?.message
    );
    return ok({ documents: [], message: "Documents system not yet initialized" });
  }
}

export const GET = withErrorHandler(handleGET, "GET /api/claims/[claimId]/documents");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
