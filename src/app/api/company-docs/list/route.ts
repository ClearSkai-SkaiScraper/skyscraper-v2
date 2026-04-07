/**
 * GET /api/company-docs/list
 *
 * List company document templates for the org.
 * Reads from file_assets with category "company-template".
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const assets = await prisma.file_assets.findMany({
      where: {
        orgId,
        category: "company-template",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        publicUrl: true,
        mimeType: true,
        sizeBytes: true,
        note: true,
        createdAt: true,
      },
    });

    const templates = assets.map((a) => ({
      id: a.id,
      title: a.filename,
      description: a.note || "",
      url: a.publicUrl,
      mimeType: a.mimeType,
      size: a.sizeBytes,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json({ templates });
  } catch (error) {
    logger.error("[Company Docs List] Error:", error);
    return NextResponse.json({ templates: [] });
  }
});
