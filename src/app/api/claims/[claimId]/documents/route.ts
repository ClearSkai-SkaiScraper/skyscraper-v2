import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/claims/[claimId]/documents
 * Fetch all documents for a claim from claim_documents table (raw SQL — not in Prisma schema)
 */
export const GET = withAuth(
  async (req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org (uses DB-backed orgId)
      await getOrgClaimOrThrow(orgId, claimId);

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

      return NextResponse.json({ documents: transformed });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      // Table may not exist yet or other DB errors — return empty gracefully
      logger.warn(
        "[GET /api/claims/[claimId]/documents] Error (returning empty):",
        error instanceof Error ? error.message : error
      );
      return NextResponse.json({ documents: [], message: "Documents system not yet initialized" });
    }
  }
);
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
