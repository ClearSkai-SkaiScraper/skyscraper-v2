export const dynamic = "force-dynamic";

// Pro-side API to toggle file visibility and delete claim files
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Helper to extract claimId and fileId from the request URL
 */
function extractParams(url: string) {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  const claimIdx = segments.indexOf("claims");
  const fileIdx = segments.indexOf("files");
  return {
    claimId: segments[claimIdx + 1],
    fileId: segments[fileIdx + 1],
  };
}

/**
 * PATCH /api/claims/[claimId]/files/[fileId]
 * Allows pros to toggle visibleToClient flag on claim documents
 * 🔒 withAuth: org-scoped, prevents cross-org file access
 */
export const PATCH = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const { claimId, fileId } = extractParams(req.url);

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

/**
 * DELETE /api/claims/[claimId]/files/[fileId]
 * Deletes a claim file from DB and Supabase storage
 * 🔒 withAuth: org-scoped, prevents cross-org file deletion
 */
export const DELETE = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const { claimId, fileId } = extractParams(req.url);

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
        publicUrl: true,
      },
    });

    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }

    // 1. Delete from Supabase storage if we have a Supabase URL
    const storagePath = extractStoragePath(file.publicUrl);
    if (storagePath) {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const { error } = await supabase.storage.from("claim-photos").remove([storagePath]);
          if (error) {
            logger.warn("[CLAIM_FILE_DELETE] Supabase storage cleanup failed", {
              fileId,
              storagePath,
              error: error.message,
            });
            // Continue with DB deletion even if storage cleanup fails
          } else {
            logger.info("[CLAIM_FILE_DELETE] Storage file removed", { storagePath });
          }
        }
      } catch (storageErr) {
        logger.warn("[CLAIM_FILE_DELETE] Storage cleanup error", { fileId, storageErr });
      }
    }

    // 2. Delete the file_assets record (annotations are stored in metadata JSON)
    await prisma.file_assets.delete({
      where: { id: fileId },
    });

    logger.info("[CLAIM_FILE_DELETE] File deleted", { fileId, claimId, orgId });

    return NextResponse.json({
      success: true,
      id: fileId,
      message: "File deleted successfully",
    });
  } catch (error) {
    logger.error("[CLAIM_FILE_DELETE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
});

/**
 * Extract Supabase storage path from a public URL
 * e.g., https://xxx.supabase.co/storage/v1/object/public/claim-photos/org/claim/file.jpg
 *   → org/claim/file.jpg
 */
function extractStoragePath(publicUrl?: string | null): string | null {
  if (!publicUrl) return null;
  try {
    // Match Supabase storage URL pattern
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/claim-photos\/(.+)$/);
    if (match) return decodeURIComponent(match[1]);

    // Also handle signed URL pattern
    const signedMatch = publicUrl.match(/\/storage\/v1\/object\/sign\/claim-photos\/(.+)\?/);
    if (signedMatch) return decodeURIComponent(signedMatch[1]);

    return null;
  } catch {
    return null;
  }
}
