// eslint-disable-next-line no-restricted-imports
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ claimId: string }>;
};

/**
 * Verify claim access via all paths.
 * Returns { claimId, orgId } if access is granted, null otherwise.
 */
async function verifyClaimAccess(
  claimId: string,
  userId: string,
  userEmail: string | null
): Promise<{ claimId: string; orgId: string } | null> {
  if (userEmail) {
    const access = await prisma.client_access.findFirst({
      where: { claimId, email: userEmail },
      include: { claims: { select: { orgId: true } } },
    });
    if (access) return { claimId, orgId: access.claims.orgId };
  }

  const client = await prisma.client.findFirst({
    where: { OR: [{ userId }, ...(userEmail ? [{ email: userEmail }] : [])] },
    select: { id: true },
  });

  if (client) {
    const link = await prisma.claimClientLink.findFirst({
      where: {
        claimId,
        OR: [{ clientUserId: client.id }, ...(userEmail ? [{ clientEmail: userEmail }] : [])],
        status: { in: ["ACCEPTED", "CONNECTED", "PENDING"] },
      },
      include: { claims: { select: { orgId: true } } },
    });
    if (link) return { claimId, orgId: link.claims.orgId };

    const claimByClientId = await prisma.claims.findFirst({
      where: { id: claimId, clientId: client.id },
      select: { id: true, orgId: true },
    });
    if (claimByClientId) return { claimId: claimByClientId.id, orgId: claimByClientId.orgId };
  }

  return null;
}

/**
 * GET /api/portal/claims/[claimId]/documents
 * Returns documents shared with the client for this claim.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { claimId } = await context.params;
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || null;

    const access = await verifyClaimAccess(claimId, userId, userEmail);
    if (!access) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Get documents from file_assets (non-image files visible to client)
    const documents = await prisma.file_assets.findMany({
      where: {
        claimId,
        mimeType: { not: { startsWith: "image/" } },
        visibleToClient: true,
      },
      select: {
        id: true,
        filename: true,
        publicUrl: true,
        mimeType: true,
        sizeBytes: true,
        category: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const allDocs = documents.map((d) => ({
      id: d.id,
      title: d.filename,
      type: d.category || "document",
      url: d.publicUrl,
      mimeType: d.mimeType,
      size: d.sizeBytes,
      sharedAt: d.createdAt,
    }));

    return NextResponse.json({
      documents: allDocs,
      total: allDocs.length,
    });
  } catch (error) {
    logger.error("[PORTAL_CLAIM_DOCUMENTS_ERROR]", error);
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}

/**
 * POST /api/portal/claims/[claimId]/documents
 * Upload a document to a claim from the client portal.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { claimId } = await context.params;
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || null;

    const access = await verifyClaimAccess(claimId, userId, userEmail);
    if (!access) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const documentSchema = z.object({
      url: z.string().url("Valid document URL is required"),
      filename: z.string().max(255).optional(),
      mimeType: z.string().max(100).optional(),
    });

    const body = await req.json();
    const parsed = documentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { url, filename, mimeType } = parsed.data;

    // Create file_assets record
    const doc = await prisma.file_assets.create({
      data: {
        id: crypto.randomUUID(),
        claimId,
        orgId: access.orgId,
        ownerId: userId,
        filename: filename || "document",
        publicUrl: url,
        storageKey: url,
        bucket: "portal-uploads",
        mimeType: mimeType || "application/pdf",
        sizeBytes: 0,
        category: "client_upload",
        visibleToClient: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        url: doc.publicUrl,
        filename: doc.filename,
      },
    });
  } catch (error) {
    logger.error("[PORTAL_CLAIM_DOCUMENTS_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to add document" }, { status: 500 });
  }
}
