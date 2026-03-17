/**
 * GET /api/templates/org
 * Auth required - returns org templates with fallback for users without org
 */

import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authResult = await requireApiAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { orgId } = authResult;

    // If no orgId, return empty list with flag (not an error - graceful fallback)
    if (!orgId) {
      return NextResponse.json({
        ok: true,
        templates: [],
        orgMissing: true,
        message: "No company selected. Select/create a company to manage templates.",
      });
    }

    // Fetch org templates with marketplace data
    const orgTemplates = await prisma.orgTemplate.findMany({
      where: { orgId },
      include: {
        Template: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            category: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, templates: orgTemplates, orgMissing: false });
  } catch (error) {
    logger.error("[GET /api/templates/org] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch org templates" },
      { status: 500 }
    );
  }
}
