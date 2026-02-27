import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ claimId: string }>;
};

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

    // Verify client owns this claim
    const client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        clientId: client.id,
      },
      select: { id: true },
    });

    if (!claim) {
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

    // Verify client owns this claim
    const client = await prisma.client.findFirst({
      where: { userId },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        clientId: client.id,
      },
      select: { id: true, orgId: true },
    });

    if (!claim) {
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
        orgId: claim.orgId,
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
