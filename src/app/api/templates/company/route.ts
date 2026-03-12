export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const orgTemplates = await prisma.orgTemplate.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });

    // Batch fetch templates (N+1 → 2 queries)
    const templateIds = [...new Set(orgTemplates.map((ot) => ot.templateId))];

    const templates = templateIds.length
      ? await prisma.template.findMany({
          where: { id: { in: templateIds } },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            tags: true,
            thumbnailUrl: true,
            version: true,
          },
        })
      : [];

    const templateMap = new Map(templates.map((t) => [t.id, t]));

    const templatesWithDetails = orgTemplates.map((orgTemplate) => {
      const template = templateMap.get(orgTemplate.templateId) || null;
      return {
        ...orgTemplate,
        template,
        name: orgTemplate.customName || template?.name || "Untitled",
        templateJson: template?.id,
      };
    });

    return NextResponse.json({
      ok: true,
      templates: templatesWithDetails,
      count: templatesWithDetails.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNKNOWN_ERROR",
        templates: [],
      },
      { status: 500 }
    );
  }
});
