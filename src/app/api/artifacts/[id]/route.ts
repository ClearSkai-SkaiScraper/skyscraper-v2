export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/artifacts/[id]
 * Get a single artifact by ID
 */
export const GET = withOrgScope(async (req, { orgId }, routeCtx) => {
  try {
    const { id } = await (routeCtx as { params: Promise<{ id: string }> }).params;

    const artifact = await prisma.generatedArtifact.findFirst({
      where: { id, orgId },
    });

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    return NextResponse.json({ artifact });
  } catch (error) {
    logger.error("Error fetching artifact:", error);
    return NextResponse.json({ error: "Failed to fetch artifact" }, { status: 500 });
  }
});

/**
 * PATCH /api/artifacts/[id]
 * Update an artifact
 */
export const PATCH = withOrgScope(async (req, { orgId }, routeCtx) => {
  try {
    const { id } = await (routeCtx as { params: Promise<{ id: string }> }).params;
    const body = await req.json();

    const artifact = await prisma.generatedArtifact.updateMany({
      where: { id, orgId },
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
});

/**
 * DELETE /api/artifacts/[id]
 * Delete an artifact
 */
export const DELETE = withOrgScope(async (req, { orgId }, routeCtx) => {
  try {
    const { id } = await (routeCtx as { params: Promise<{ id: string }> }).params;

    const result = await prisma.generatedArtifact.deleteMany({
      where: { id, orgId },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Artifact deleted" });
  } catch (error) {
    logger.error("Error deleting artifact:", error);
    return NextResponse.json({ error: "Failed to delete artifact" }, { status: 500 });
  }
});
