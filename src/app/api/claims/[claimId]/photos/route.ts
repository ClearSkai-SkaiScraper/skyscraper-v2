/**
 * ============================================================================
 * CLAIM PHOTOS API
 * ============================================================================
 *
 * GET  /api/claims/[claimId]/photos  — List photos for a claim
 * POST /api/claims/[claimId]/photos  — Upload a photo (proxy to assets)
 *
 * Proxies to the underlying file_assets table for photo management.
 * The Photos page calls this endpoint directly.
 *
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

/**
 * GET /api/claims/[claimId]/photos
 * List all photos for a claim
 */
export const GET = withAuth(
  async (
    req: NextRequest,
    { userId, orgId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org
      await getOrgClaimOrThrow(orgId, claimId);

      const photos = await prisma.file_assets.findMany({
        where: { claimId, orgId },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        photos: photos.map((p) => ({
          id: p.id,
          filename: p.filename,
          publicUrl: p.publicUrl,
          url: p.publicUrl,
          category: p.category,
          note: p.note,
          mimeType: p.mimeType,
          sizeBytes: p.sizeBytes,
          createdAt: p.createdAt,
          // AI analysis fields — populated by /api/photos/analyze
          aiCaption: null,
          damageBoxes: null,
          severity: null,
          confidence: null,
          analyzed: false,
        })),
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Photos GET] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch photos" },
        { status: 500 }
      );
    }
  }
);
