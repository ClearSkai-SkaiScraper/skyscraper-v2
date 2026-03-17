export const dynamic = "force-dynamic";

// app/api/report-templates/route.ts
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { REPORT_SECTIONS } from "@/lib/reports/templateSections";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const templates = await prisma.report_templates
      .findMany({
        where: {
          org_id: orgId,
        },
        orderBy: [{ is_default: "desc" }, { updated_at: "desc" }],
      })
      .catch(() => []);

    return NextResponse.json(templates);
  } catch (err) {
    logger.error("GET /api/report-templates error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch templates" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const { name, copyFromId } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // If copying from existing template
    if (copyFromId) {
      const sourceTemplate = await prisma.report_templates.findFirst({
        where: {
          id: copyFromId,
          org_id: orgId,
        },
      });

      if (!sourceTemplate) {
        return NextResponse.json({ error: "Source template not found" }, { status: 404 });
      }

      const newTemplate = await prisma.report_templates.create({
        data: {
          id: crypto.randomUUID(),
          name: name,
          org_id: orgId,
          created_by: userId,
          is_default: false,
          section_order: sourceTemplate.section_order as Prisma.InputJsonValue,
          section_enabled: sourceTemplate.section_enabled as Prisma.InputJsonValue,
          defaults:
            sourceTemplate.defaults === null
              ? Prisma.JsonNull
              : (sourceTemplate.defaults as Prisma.InputJsonValue),
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      return NextResponse.json(newTemplate, { status: 201 });
    }

    // Create new template from scratch with default sections
    const defaultSectionOrder = REPORT_SECTIONS.map((s) => s.sectionKey);

    const newTemplate = await prisma.report_templates.create({
      data: {
        id: crypto.randomUUID(),
        name,
        org_id: orgId,
        created_by: userId,
        is_default: false,
        section_order: defaultSectionOrder,
        section_enabled: Object.fromEntries(defaultSectionOrder.map((key) => [key, true])),
        defaults: {
          brandingConfig: {
            logoUrl: null,
            primaryColor: "#1e40af",
            secondaryColor: "#64748b",
          },
        },
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (err) {
    logger.error("POST /api/report-templates error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create template" },
      { status: 500 }
    );
  }
});
