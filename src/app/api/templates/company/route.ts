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

    // Fetch the actual templates for each OrgTemplate
    const templatesWithDetails = await Promise.all(
      orgTemplates.map(async (orgTemplate) => {
        const template = await prisma.template.findUnique({
          where: { id: orgTemplate.templateId },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            tags: true,
            thumbnailUrl: true,
            version: true,
          },
        });

        return {
          ...orgTemplate,
          template,
          name: orgTemplate.customName || template?.name || "Untitled",
          templateJson: template?.id,
        };
      })
    );

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
