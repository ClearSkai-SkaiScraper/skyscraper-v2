/**
 * POST /api/templates/org/add
 * Auth required - adds marketplace template to org library
 */

import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireApiAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { orgId } = authResult;

    // Require orgId for adding templates (can't add to "personal" library)
    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "No org selected. Cannot add template without a company." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { slug } = body;

    if (!slug) {
      return NextResponse.json({ ok: false, error: "Template slug required" }, { status: 400 });
    }

    // Find marketplace template
    const marketplaceTemplate = await prisma.template.findFirst({
      where: { slug, isPublished: true, isActive: true },
      select: { id: true, name: true, thumbnailUrl: true },
    });

    if (!marketplaceTemplate) {
      return NextResponse.json({ ok: false, error: "Template not found" }, { status: 404 });
    }

    // Upsert org template (idempotent)
    const orgTemplate = await prisma.orgTemplate.upsert({
      where: {
        orgId_templateId: {
          orgId,
          templateId: marketplaceTemplate.id,
        },
      },
      update: {},
      create: {
        orgId,
        templateId: marketplaceTemplate.id,
      },
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
    });

    return NextResponse.json({
      ok: true,
      message: "Template added to company library",
      orgTemplate,
    });
  } catch (error) {
    logger.error("[POST /api/templates/org/add] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to add template" },
      { status: 500 }
    );
  }
}
