export const dynamic = "force-dynamic";

// app/api/report-templates/[id]/route.ts
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

export const DELETE = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").filter(Boolean).pop() || "";

    // Verify template belongs to Org
    const template = await prisma.report_templates.findUnique({
      where: { id },
      select: { org_id: true },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (template.org_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete template
    await prisma.report_templates
      .delete({
        where: { id },
      })
      .catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("DELETE /api/report-templates/[id] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete template" },
      { status: 500 }
    );
  }
});
