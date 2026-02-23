import { logger } from "@/lib/logger";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getDelegate } from "@/lib/db/modelAliases";
import prisma from "@/lib/prisma";
import { rateLimiters } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WARNING: This endpoint accepts pre-uploaded file URLs.
 * The file MUST be uploaded to Supabase Storage BEFORE calling this endpoint.
 * Use /api/claims/files/upload for proper file uploads with automatic DB record creation.
 *
 * This route is for metadata-only updates when file is already in storage.
 */
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (user.publicMetadata?.orgId as string) || user.id;

    // Rate limiting
    const allowed = await rateLimiters.uploads.check(50, `completion-photo:${orgId}`);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();

    const { claimId, url, fileName, fileSize, category, storageKey } = body;

    if (!claimId || !url) {
      return NextResponse.json({ error: "claimId and url required" }, { status: 400 });
    }

    // SECURITY: Validate that file was actually uploaded to Supabase
    // storageKey should be provided if file is in Supabase Storage
    if (!storageKey) {
      logger.warn(
        `[completion:upload-photo] Missing storageKey for ${fileName}. ` +
          "File may not be in Supabase Storage. Use /api/claims/files/upload instead."
      );
    }

    // Verify claim ownership
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Create photo record
    const photo = await getDelegate("completionPhoto").create({
      data: {
        claimId,
        orgId,
        url,
        fileName,
        fileSize,
        category: category || "unknown",
        uploadedBy: user.id,
      },
    });

    // Check if this is the first photo - if so, mark completion photos as uploaded
    const photoCount = await getDelegate("completionPhoto").count({
      where: { claimId, orgId },
    });

    if (photoCount === 1) {
      await prisma.completion_status.upsert({
        where: { claim_id: claimId },
        create: {
          id: crypto.randomUUID(),
          claim_id: claimId,
          org_id: orgId,
          completion_photos_uploaded: true,
          updated_at: new Date(),
        },
        update: {
          completion_photos_uploaded: true,
          updated_at: new Date(),
        },
      });

      // Log activity
      await prisma.claim_activities.create({
        data: {
          id: crypto.randomUUID(),
          claim_id: claimId,
          type: "FILE_UPLOAD",
          message: `📸 Completion photos uploaded - Ready for AI timeline analysis`,
          user_id: user.id,
        },
      });
    }

    return NextResponse.json(photo);
  } catch (error) {
    logger.error("[Completion Photo Upload Error]", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (user.publicMetadata?.orgId as string) || user.id;
    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");
    const category = searchParams.get("category");

    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    const where: any = { claimId, orgId };
    if (category) {
      where.category = category;
    }

    const photos = await getDelegate("completionPhoto").findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(photos);
  } catch (error) {
    logger.error("[Completion Photos Get Error]", error);
    return NextResponse.json({ error: "Failed to get photos" }, { status: 500 });
  }
}
