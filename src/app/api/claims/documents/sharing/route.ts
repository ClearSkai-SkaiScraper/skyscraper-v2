import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ok, withErrorHandler } from "@/lib/api/response";
import { requireApiAuth } from "@/lib/auth/apiAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const SharingPostSchema = z.object({
  documentId: z.string().min(1, "documentId is required"),
  claimId: z.string().min(1, "claimId is required"),
  shared: z.boolean().default(false),
});

const SharingGetQuerySchema = z.object({
  claimId: z.string().min(1, "claimId is required"),
  clientId: z.string().optional(),
});

/**
 * GET /api/claims/documents/sharing?claimId=...&clientId=...
 * Returns documents for a claim with their sharing status.
 * Used by ClientDocumentSharing component.
 */
async function handleGET(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { orgId } = authResult;
  if (!orgId) {
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const queryParsed = SharingGetQuerySchema.safeParse({
    claimId: searchParams.get("claimId") ?? undefined,
    clientId: searchParams.get("clientId") ?? undefined,
  });
  if (!queryParsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: queryParsed.error.flatten() },
      { status: 400 }
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { claimId, clientId } = queryParsed.data;

  // Verify the claim belongs to this org
  const claim = await prisma.claims.findFirst({
    where: { id: claimId, orgId },
    select: { id: true },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  try {
    const documents = await prisma.file_assets.findMany({
      where: { claimId, orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        visibleToClient: true,
        createdAt: true,
      },
    });

    const transformed = documents.map((doc) => {
      // Derive a user-friendly type from mime_type
      let type: "photo" | "report" | "estimate" | "other" = "other";
      if (doc.mimeType?.startsWith("image/")) type = "photo";
      else if (doc.mimeType === "application/pdf") type = "report";

      // Human-readable size
      const sizeBytes = doc.sizeBytes ?? 0;
      const size =
        sizeBytes > 1_000_000
          ? `${(sizeBytes / 1_000_000).toFixed(1)} MB`
          : sizeBytes > 1_000
            ? `${(sizeBytes / 1_000).toFixed(0)} KB`
            : `${sizeBytes} B`;

      return {
        id: doc.id,
        name: doc.filename,
        type,
        size,
        shared: doc.visibleToClient,
        sharedAt: undefined,
      };
    });

    return ok({ documents: transformed });
  } catch (dbError) {
    logger.warn(
      "[GET /api/claims/documents/sharing] DB error (returning empty):",
      dbError instanceof Error ? dbError.message : dbError
    );
    return ok({ documents: [] });
  }
}

/**
 * POST /api/claims/documents/sharing
 * Toggle sharing status for a document.
 * Body: { documentId, claimId, clientId, shared }
 */
async function handlePOST(req: NextRequest) {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId, orgId } = authResult;
  if (!orgId) {
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  const raw = await req.json();
  const parsed = SharingPostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { documentId, claimId, shared } = parsed.data;

  // Verify the claim belongs to this org
  const claim = await prisma.claims.findFirst({
    where: { id: claimId, orgId },
    select: { id: true },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  try {
    await prisma.file_assets.updateMany({
      where: { id: documentId, claimId, orgId },
      data: { visibleToClient: shared ? true : false },
    });

    return ok({
      message: shared ? "Document shared with client" : "Document unshared",
      documentId,
      shared,
    });
  } catch (dbError) {
    logger.error(
      "[POST /api/claims/documents/sharing] DB error:",
      dbError instanceof Error ? dbError.message : dbError
    );
    return NextResponse.json({ error: "Failed to update document sharing" }, { status: 500 });
  }
}

export const GET = withErrorHandler(handleGET, "GET /api/claims/documents/sharing");
export const POST = withErrorHandler(handlePOST, "POST /api/claims/documents/sharing");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
