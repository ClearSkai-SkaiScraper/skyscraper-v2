export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { prismaMaybeModel } from "@/lib/db/prismaModel";

// Use prismaMaybeModel since report_templates may not be in PRISMA_MODELS
const Templates = prismaMaybeModel("report_templates");

export const POST = withAuth(async (request: NextRequest, { orgId }) => {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    // /api/templates/{templateId}/set-default → segments = ["api","templates","{templateId}","set-default"]
    const templateId = segments[segments.length - 2] || "";

    // Verify template belongs to org
    if (!Templates) {
      return NextResponse.json({ error: "Templates model unavailable" }, { status: 200 });
    }

    const template = await Templates.findFirst({
      where: {
        id: templateId,
        org_id: orgId,
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Unset current default
    await Templates.updateMany({
      where: {
        org_id: orgId,
        is_default: true,
      },
      data: {
        is_default: false,
        updated_at: new Date(),
      },
    });

    // Set new default
    const updated = await Templates.update({
      where: { id: templateId },
      data: {
        is_default: true,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Failed to set default template:", error);
    return NextResponse.json({ error: "Failed to set default template" }, { status: 500 });
  }
});
