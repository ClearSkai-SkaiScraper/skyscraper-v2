export const dynamic = "force-dynamic";

// Pro-side API to toggle file visibility in portal
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

/**
 * PATCH /api/claims/[claimId]/files/[fileId]
 * Allows pros to toggle visibleToClient flag on claim documents
 * 🔒 withAuth: org-scoped, prevents cross-org file access
 */
export const PATCH = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    // Extract route params from URL
    const segments = new URL(req.url).pathname.split("/").filter(Boolean);
    const claimIdx = segments.indexOf("claims");
    const fileIdx = segments.indexOf("files");
    const claimId = segments[claimIdx + 1];
    const fileId = segments[fileIdx + 1];

    const body = await req.json();
    const { visibleToClient } = body as { visibleToClient?: boolean };

    if (typeof visibleToClient !== "boolean") {
      return new NextResponse("visibleToClient must be boolean", {
        status: 400,
      });
    }

    // FileAsset lookup — scoped by claimId AND orgId to prevent cross-org access
    const file = await prisma.file_assets.findFirst({
      where: {
        id: fileId,
        claimId,
        orgId,
      },
      select: {
        id: true,
        orgId: true,
      },
    });

    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Update client visibility
    await prisma.file_assets.update({
      where: { id: fileId },
      data: { visibleToClient },
    });

    return NextResponse.json({
      id: file.id,
      visibleToClient,
      message: `File visibility ${visibleToClient ? "enabled" : "disabled"} for client portal`,
    });
  } catch (error) {
    logger.error("[CLAIM_FILE_PATCH_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
});
