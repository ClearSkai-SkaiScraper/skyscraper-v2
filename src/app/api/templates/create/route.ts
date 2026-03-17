export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Use report_templates model directly
const Templates = prisma.report_templates;

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const { name, sections } = body;

    if (!Templates) {
      return NextResponse.json({ error: "Templates model unavailable" }, { status: 200 });
    }

    const template = await Templates.create({
      data: {
        id: crypto.randomUUID(),
        org_id: orgId,
        name,
        created_by: userId,
        section_order: sections,
        section_enabled: sections.reduce((acc: any, key: string) => {
          acc[key] = true;
          return acc;
        }, {}),
        updated_at: new Date(),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    logger.error("Create template error:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
});
