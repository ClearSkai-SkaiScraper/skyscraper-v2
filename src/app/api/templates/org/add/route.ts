/**
 * POST /api/templates/org/add
 * Auth required - adds marketplace template to org library
 */

import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withOrgScope(async (req, { userId, orgId }) => {
  try {
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
    return NextResponse.json({ ok: false, error: "Failed to add template" }, { status: 500 });
  }
});
