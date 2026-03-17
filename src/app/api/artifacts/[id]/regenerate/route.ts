export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

/**
 * POST /api/artifacts/[id]/regenerate
 * Create a new version of an artifact
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orgResult = await getActiveOrgContext();
    if (!orgResult.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the existing artifact
    const existing = await prisma.ai_reports.findFirst({
      where: {
        id: params.id,
        orgId: orgResult.orgId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    const body = await req.json();

    // Create new version (regenerated artifact)
    const newArtifact = await prisma.ai_reports.create({
      data: {
        id: crypto.randomUUID(),
        orgId: existing.orgId,
        claimId: existing.claimId,
        userId: orgResult.userId,
        userName: "System", // Will be resolved from user lookup if needed
        type: existing.type,
        title: `${existing.title} (regenerated)`,
        status: "draft",
        content: body.content || existing.content,
        tokensUsed: 0,
        model: existing.model,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        artifact: newArtifact,
        message: "Regenerated artifact",
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error regenerating artifact:", error);
    return NextResponse.json({ error: "Failed to regenerate artifact" }, { status: 500 });
  }
}
