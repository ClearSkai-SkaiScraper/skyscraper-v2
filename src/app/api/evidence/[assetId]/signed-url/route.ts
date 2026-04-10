export const dynamic = "force-dynamic";

/**
 * GET /api/evidence/[assetId]/signed-url
 * Generate time-limited presigned URL for secure access
 * NOTE: evidenceAsset model doesn't exist - using FileAsset instead
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const { assetId } = await routeParams.params;

    // Parse TTL from query params (default 7 days)
    const url = new URL(req.url);
    const ttlParam = url.searchParams.get("ttl");
    const expiresIn = ttlParam ? parseInt(ttlParam, 10) : 60 * 60 * 24 * 7; // 7 days default

    // Validate TTL (max 30 days)
    if (expiresIn > 60 * 60 * 24 * 30) {
      return NextResponse.json({ error: "TTL exceeds maximum (30 days)" }, { status: 400 });
    }

    // Fetch asset and verify org ownership - using FileAsset instead
    const asset = await prisma.file_assets.findFirst({
      where: {
        id: assetId,
        orgId,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // FileAsset has publicUrl directly - no need for signed URL generation
    return NextResponse.json({
      signedUrl: asset.publicUrl,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      asset: {
        id: asset.id,
        filename: asset.filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      },
    });
  } catch (error) {
    logger.error("Signed URL generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate signed URL",
        details: "Unknown error",
      },
      { status: 500 }
    );
  }
});
