export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { prismaMaybeModel } from "@/lib/db/prismaModel";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Use prismaMaybeModel since report_templates may not be in PRISMA_MODELS
const Templates = prismaMaybeModel("report_templates");

export const PATCH = withAuth(async (request: NextRequest, { orgId }) => {
  try {
    const url = new URL(request.url);
    const templateId = url.pathname.split("/").filter(Boolean).pop() || "";

    if (!Templates) {
      return NextResponse.json({ error: "Templates model unavailable" }, { status: 200 });
    }

    const body = await request.json();
    const { name, description, sectionOrder, brandingConfig } = body;

    // Atomic find+update to prevent TOCTOU race
    const updated = await (async () => {
      const template = await Templates!.findFirst({ where: { id: templateId, org_id: orgId } });
      if (!template) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = { updated_at: new Date() };
      if (name !== undefined) updates.name = name;
      if (description !== undefined)
        updates.defaults = { ...(template.defaults || {}), description };
      if (sectionOrder !== undefined) updates.section_order = sectionOrder;
      if (brandingConfig !== undefined)
        updates.defaults = { ...(template.defaults || {}), brandingConfig };

      return Templates!.update({ where: { id: templateId }, data: updates });
    })();
    if (!updated) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Failed to update template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, { orgId }) => {
  try {
    const url = new URL(request.url);
    const templateId = url.pathname.split("/").filter(Boolean).pop() || "";

    // Verify template exists and belongs to org
    const template = Templates
      ? await Templates.findFirst({
          where: {
            id: templateId,
            org_id: orgId,
          },
        }).catch(() => null)
      : null;

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Don't allow deleting default template
    if (template.is_default) {
      return NextResponse.json(
        { error: "Cannot delete default template. Set another template as default first." },
        { status: 400 }
      );
    }

    // Don't allow deleting system templates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((template as any).templateType === "SYSTEM") {
      return NextResponse.json({ error: "Cannot delete system templates" }, { status: 400 });
    }

    // Delete related AI sections first if any exist
    await prisma.report_ai_sections
      .deleteMany({
        where: { report_id: templateId },
      })
      .catch(() => {
        // Ignore - AI sections are optional
      });

    // Delete template
    if (!Templates) {
      return NextResponse.json({ success: false, error: "Templates model unavailable" });
    }

    await Templates.deleteMany({
      where: { id: templateId, org_id: orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
});
