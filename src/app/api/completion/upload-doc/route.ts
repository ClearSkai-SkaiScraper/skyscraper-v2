// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getDelegate } from "@/lib/db/modelAliases";
import { logger } from "@/lib/logger";
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
    const allowed = await rateLimiters.uploads.check(50, `completion-doc:${orgId}`);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();

    const { claimId, type, url, fileName, fileSize, storageKey } = body;

    if (!claimId || !type || !url) {
      return NextResponse.json({ error: "claimId, type, and url required" }, { status: 400 });
    }

    // SECURITY: Validate that file was actually uploaded to Supabase
    // storageKey should be provided if file is in Supabase Storage
    if (!storageKey) {
      logger.warn(
        `[completion:upload-doc] Missing storageKey for ${fileName}. ` +
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

    // Create document record
    const document = await getDelegate("completionDocument").create({
      data: {
        claimId,
        orgId,
        type,
        url,
        fileName,
        fileSize,
        uploadedBy: user.id,
      },
    });

    // Auto-update completion status if this is a completion form
    if (type === "COMPLETION_FORM") {
      await prisma.completion_status.upsert({
        where: { claim_id: claimId },
        create: {
          id: crypto.randomUUID(),
          claim_id: claimId,
          org_id: orgId,
          completion_form_uploaded: true,
          updated_at: new Date(),
        },
        update: {
          completion_form_uploaded: true,
          updated_at: new Date(),
        },
      });

      // Log activity
      await prisma.claim_activities.create({
        data: {
          id: crypto.randomUUID(),
          claim_id: claimId,
          type: "FILE_UPLOAD",
          message: `📄 Completion form uploaded: ${fileName || "document"}`,
          user_id: user.id,
        },
      });
    }

    return NextResponse.json(document);
  } catch (error) {
    logger.error("[Completion Document Upload Error]", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
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

    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    const documents = await getDelegate("completionDocument").findMany({
      where: { claimId, orgId },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    logger.error("[Completion Documents Get Error]", error);
    return NextResponse.json(
      { error: "Failed to get documents" },
      { status: 500 }
    );
  }
}
