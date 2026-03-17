export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

/**
 * GET /api/artifacts/[id]
 * Get a single artifact by ID
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const orgResult = await getActiveOrgContext();
    if (!orgResult.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const artifact = await prisma.generatedArtifact.findFirst({
      where: { id, orgId: orgResult.orgId! },
    });

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    return NextResponse.json({ artifact });
  } catch (error) {
    logger.error("Error fetching artifact:", error);
    return NextResponse.json({ error: "Failed to fetch artifact" }, { status: 500 });
  }
}

/**
 * PATCH /api/artifacts/[id]
 * Update an artifact
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const orgResult = await getActiveOrgContext();
    if (!orgResult.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const artifact = await prisma.generatedArtifact.updateMany({
      where: { id, orgId: orgResult.orgId! },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.status && { status: body.status }),
        ...(body.fileUrl && { fileUrl: body.fileUrl }),
        updatedAt: new Date(),
      },
    });

    if (artifact.count === 0) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Artifact updated" });
  } catch (error) {
    logger.error("Error updating artifact:", error);
    return NextResponse.json({ error: "Failed to update artifact" }, { status: 500 });
  }
}

/**
 * DELETE /api/artifacts/[id]
 * Delete an artifact
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const orgResult = await getActiveOrgContext();
    if (!orgResult.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const result = await prisma.generatedArtifact.deleteMany({
      where: { id, orgId: orgResult.orgId! },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Artifact deleted" });
  } catch (error) {
    logger.error("Error deleting artifact:", error);
    return NextResponse.json({ error: "Failed to delete artifact" }, { status: 500 });
  }
}
