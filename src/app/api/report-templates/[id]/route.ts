export const dynamic = "force-dynamic";

// app/api/report-templates/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const DELETE = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").filter(Boolean).pop() || "";

    // Verify template belongs to Org
    const template = await prisma.report_templates.findFirst({
      where: { id, org_id: orgId },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Delete template
    await prisma.report_templates
      .deleteMany({
        where: { id, org_id: orgId },
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
