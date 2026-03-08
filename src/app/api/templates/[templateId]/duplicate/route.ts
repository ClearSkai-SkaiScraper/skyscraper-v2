export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

// Use report_templates model directly
const Templates = prisma.report_templates;

export const POST = withAuth(async (request: NextRequest, { orgId, userId }) => {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    // /api/templates/{sourceId}/duplicate → segments = ["api","templates","{sourceId}","duplicate"]
    const sourceId = segments[segments.length - 2] || "";

    // Get source template
    if (!Templates) {
      return NextResponse.json({ error: "Templates model unavailable" }, { status: 200 });
    }

    const sourceTemplate = await Templates.findFirst({
      where: {
        id: sourceId,
        org_id: orgId,
      },
    });

    if (!sourceTemplate) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Create duplicate
    const duplicate = await Templates.create({
      data: {
        id: crypto.randomUUID(),
        name: `${sourceTemplate.name} (Copy)`,
        org_id: orgId,
        is_default: false,
        section_order: sourceTemplate.section_order as unknown as Prisma.InputJsonValue,
        section_enabled: sourceTemplate.section_enabled as unknown as Prisma.InputJsonValue,
        defaults: sourceTemplate.defaults as unknown as Prisma.InputJsonValue,
        created_by: userId,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(duplicate);
  } catch (error) {
    logger.error("Failed to duplicate template:", error);
    return NextResponse.json({ error: "Failed to duplicate template" }, { status: 500 });
  }
});
