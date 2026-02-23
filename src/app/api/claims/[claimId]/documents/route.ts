import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/claims/[claimId]/documents
 * Fetch all documents for a claim from file_assets table (Prisma-managed)
 */
export const GET = withAuth(
  async (req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org (uses DB-backed orgId)
      await getOrgClaimOrThrow(orgId, claimId);

      // Use Prisma-managed file_assets table instead of raw SQL claim_documents
      const assets = await prisma.file_assets.findMany({
        where: { claimId, orgId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          filename: true,
          publicUrl: true,
          mimeType: true,
          sizeBytes: true,
          category: true,
          note: true,
          visibleToClient: true,
          createdAt: true,
          ownerId: true,
        },
      });

      // Map category to document type
      const categoryToType = (cat: string, mime: string): string => {
        if (mime?.startsWith("image/")) return "PHOTO";
        const map: Record<string, string> = {
          report: "DEPRECIATION",
          supplement: "SUPPLEMENT",
          certificate: "CERTIFICATE",
          invoice: "INVOICE",
          contract: "CONTRACT",
        };
        return map[cat] || "OTHER";
      };

      const documents = assets.map((doc) => ({
        id: doc.id,
        type: categoryToType(doc.category, doc.mimeType),
        title: doc.filename,
        description: doc.note,
        publicUrl: doc.publicUrl,
        mimeType: doc.mimeType,
        fileSize: doc.sizeBytes,
        visibleToClient: doc.visibleToClient,
        createdAt: doc.createdAt.toISOString(),
        createdBy: {
          name: doc.ownerId || "System",
          email: "",
        },
      }));

      return NextResponse.json({ documents });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.warn("[GET /api/claims/[claimId]/documents] Error:", error);
      return NextResponse.json({ documents: [] });
    }
  }
);
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
