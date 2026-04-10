export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

/**
 * GET /api/artifacts
 * List artifacts with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    const orgResult = await getActiveOrgContext();
    if (!orgResult.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");
    const type = searchParams.get("type");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { orgId: orgResult.orgId };
    if (claimId) where.claimId = claimId;
    if (type) where.type = type;

    const artifacts = await prisma.generatedArtifact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      artifacts,
      count: artifacts.length,
    });
  } catch (error) {
    logger.error("Error fetching artifacts:", error);
    return NextResponse.json({ error: "Failed to fetch artifacts" }, { status: 500 });
  }
}

/**
 * POST /api/artifacts
 * Create a new artifact
 */
export async function POST(req: NextRequest) {
  try {
    const orgResult = await getActiveOrgContext();
    if (!orgResult.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { claimId, type, title, content, fileUrl, model, tokensUsed } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "type and title are required" }, { status: 400 });
    }

    const artifact = await prisma.generatedArtifact.create({
      data: {
        orgId: orgResult.orgId!,
        claimId: claimId || null,
        type,
        title,
        content: content || null,
        fileUrl: fileUrl || null,
        model: model || null,
        tokensUsed: tokensUsed || null,
        status: "completed",
      },
    });

    return NextResponse.json({ success: true, artifact });
  } catch (error) {
    logger.error("Error creating artifact:", error);
    return NextResponse.json({ error: "Failed to create artifact" }, { status: 500 });
  }
}
