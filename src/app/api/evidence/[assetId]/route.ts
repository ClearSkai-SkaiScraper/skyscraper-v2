/**
 * PATCH /api/evidence/[assetId]
 * Update asset metadata (title, description, tags)
 * NOTE: evidenceAsset model doesn't exist in schema - using FileAsset instead
 */

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: { assetId: string } }) {
  try {
    // Authentication
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assetId } = params;

    // Parse request body
    const body = await request.json();
    const { note } = body;

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

    // Update asset - FileAsset has limited metadata fields
    const updated = await prisma.file_assets.update({
      where: { id: assetId },
      data: {
        ...(note !== undefined && { note }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      asset: {
        id: updated.id,
        note: updated.note,
        filename: updated.filename,
        mimeType: updated.mimeType,
        sizeBytes: updated.sizeBytes,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    logger.error("Asset metadata update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update asset",
        details: "Unknown error",
      },
      { status: 500 }
    );
  }
}
