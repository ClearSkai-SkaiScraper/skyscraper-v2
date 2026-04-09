export const dynamic = "force-dynamic";

/**
 * 🔥 PHASE 27.2a: SHARE VIDEO REPORT
 *
 * POST /api/video-reports/[id]/share
 * Generates public share link for video report
 *
 * Note: Share metadata is stored in the attachments JSON field
 * since ai_reports doesn't have dedicated share columns.
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { generatePublicId, generateShareUrl } from "@/lib/utils/publicId";

interface ShareMetadata {
  publicId?: string;
  isPublic?: boolean;
  shareTitle?: string;
  shareNotes?: string;
  shareExpiresAt?: string | null;
}

export const POST = withAuth(async (req: NextRequest, { orgId }, routeParams) => {
  try {
    const { id: reportId } = await routeParams!.params;

    // Verify report exists and belongs to org (orgId in WHERE prevents IDOR/enumeration)
    const report = await prisma.ai_reports.findFirst({
      where: { id: reportId, orgId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Parse optional body for custom title/notes
    const body = await req.json().catch(() => ({}));
    const { shareTitle, shareNotes, expiresInDays } = body;

    // Get existing attachments/share metadata
    const existingAttachments = (report.attachments as Record<string, unknown>) || {};
    const existingShare = (existingAttachments._shareMetadata as ShareMetadata) || {};

    // Generate public ID if doesn't exist
    const publicId = existingShare.publicId || generatePublicId();

    // Calculate expiration if requested
    let shareExpiresAt: string | null = null;
    if (expiresInDays && expiresInDays > 0) {
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + expiresInDays);
      shareExpiresAt = expiresDate.toISOString();
    }

    // Build updated share metadata
    const updatedShareMetadata: ShareMetadata = {
      publicId,
      isPublic: true,
      shareTitle: shareTitle || existingShare.shareTitle,
      shareNotes: shareNotes || existingShare.shareNotes,
      shareExpiresAt: shareExpiresAt || existingShare.shareExpiresAt || null,
    };

    // Update report with share metadata in attachments (org-scoped for defense-in-depth)
    const updatedAttachments = {
      ...existingAttachments,
      _shareMetadata: updatedShareMetadata,
    };

    await prisma.ai_reports.updateMany({
      where: { id: reportId, orgId },
      data: {
        attachments: updatedAttachments as object,
      },
    });

    const shareUrl = generateShareUrl(publicId);

    return NextResponse.json({
      success: true,
      publicId,
      shareUrl,
      isPublic: true,
      expiresAt: updatedShareMetadata.shareExpiresAt,
    });
  } catch (err: unknown) {
    logger.error("Error sharing video report:", err);
    return NextResponse.json(
      {
        error: "Failed to create share link",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});
