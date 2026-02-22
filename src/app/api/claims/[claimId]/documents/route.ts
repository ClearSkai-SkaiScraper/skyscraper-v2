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
        type: string;
        title: string;
        description: string | null;
        public_url: string;
        mime_type: string;
        file_size: number | null;
        visible_to_client: boolean;
        created_at: Date;
        created_by: string | null;
      }>
    >`
      SELECT
        id,
        type,
        title,
        description,
        public_url,
        mime_type,
        file_size,
        visible_to_client,
        created_at,
        created_by
      FROM claim_documents
      WHERE claim_id = ${claimId}
      ORDER BY created_at DESC
    `;

    // Transform snake_case DB columns to camelCase for front-end
    const transformed = documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      description: doc.description,
      publicUrl: doc.public_url,
      mimeType: doc.mime_type,
      fileSize: doc.file_size,
      visibleToClient: doc.visible_to_client,
      createdAt:
        doc.created_at instanceof Date ? doc.created_at.toISOString() : String(doc.created_at),
      createdBy: {
        name: doc.created_by || "System",
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
