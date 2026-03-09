/**
 * GET /api/company-docs/list
 *
 * List company document templates for the org.
 * Reads from file_assets with category "company-template".
 */

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { resolveOrg } from "@/lib/org/resolveOrg";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ templates: [] }, { status: 401 });
    }

    let orgId: string | null = null;
    try {
      const ctx = await resolveOrg();
      orgId = ctx.orgId;
    } catch {
      // fallback
    }

    const safeOwner = orgId || userId;

    const assets = await prisma.file_assets.findMany({
      where: {
        orgId: safeOwner,
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
}
