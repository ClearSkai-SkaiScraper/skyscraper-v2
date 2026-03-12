import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

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
  // Path 1: client_access (email-based)
  if (userEmail) {
    const access = await prisma.client_access.findFirst({
      where: { claimId, email: userEmail },
      include: { claims: { select: { orgId: true } } },
    });
    if (access) return { claimId, orgId: access.claims.orgId };
  }

  // Path 2 & 3: via Client record
  const client = await prisma.client.findFirst({
    where: { OR: [{ userId }, ...(userEmail ? [{ email: userEmail }] : [])] },
    select: { id: true },
  });

  if (client) {
    // ClaimClientLink
    const link = await prisma.claimClientLink.findFirst({
      where: {
        claimId,
        OR: [{ clientUserId: client.id }, ...(userEmail ? [{ clientEmail: userEmail }] : [])],
        status: "ACCEPTED",
      },
      include: { claims: { select: { orgId: true } } },
    });
    if (link) return { claimId, orgId: link.claims.orgId };

    // claims.clientId
    const claimByClientId = await prisma.claims.findFirst({
      where: { id: claimId, clientId: client.id },
      select: { id: true, orgId: true },
    });
    if (claimByClientId) return { claimId: claimByClientId.id, orgId: claimByClientId.orgId };
  }

  return null;
}

/**
 * GET /api/portal/claims/[claimId]/photos
 * Returns photos associated with a claim for the client portal.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
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

    // Get photos from file_assets
    const photos = await prisma.file_assets.findMany({
      where: {
        claimId,
        mimeType: { startsWith: "image/" },
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

    return NextResponse.json({
      photos: photos.map((p) => ({
        id: p.id,
        url: p.publicUrl,
        filename: p.filename,
        category: p.category,
        uploadedAt: p.createdAt,
      })),
      total: photos.length,
    });
  } catch (error) {
    logger.error("[PORTAL_CLAIM_PHOTOS_ERROR]", error);
    return NextResponse.json({ error: "Failed to load photos" }, { status: 500 });
  }
}

/**
 * POST /api/portal/claims/[claimId]/photos
 * Upload a new photo to a claim from the client portal.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
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

    const body = await req.json();
    const { url, filename, category } = body;

    if (!url) {
      return NextResponse.json({ error: "Photo URL is required" }, { status: 400 });
    }

    // Create file_assets record
    const photo = await prisma.file_assets.create({
      data: {
        id: crypto.randomUUID(),
        claimId,
        orgId: access.orgId,
        ownerId: userId,
        filename: filename || "photo.jpg",
        publicUrl: url,
        storageKey: url,
        bucket: "portal-uploads",
        mimeType: "image/jpeg",
        sizeBytes: 0,
        category: category || "damage_photo",
        visibleToClient: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      photo: {
        id: photo.id,
        url: photo.publicUrl,
        filename: photo.filename,
      },
    });
  } catch (error) {
    logger.error("[PORTAL_CLAIM_PHOTOS_POST_ERROR]", error);
    return NextResponse.json({ error: "Failed to add photo" }, { status: 500 });
  }
}
