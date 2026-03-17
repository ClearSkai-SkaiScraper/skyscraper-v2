import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

const orgSettingsSchema = z.object({
  name: z.string().optional(),
});

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/organization
 * Fetch organization settings
 */
export async function GET() {
  try {
    const orgCtx = await safeOrgContext();
    if (!orgCtx.orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const org = await prisma.org.findUnique({
      where: { id: orgCtx.orgId },
      select: { name: true, planKey: true },
    });

    return NextResponse.json({
      name: org?.name ?? "",
      timezone: "US/Mountain", // Default — extend Org model later
      planKey: org?.planKey ?? "solo",
    });
  } catch (error) {
    logger.error("[API] GET /api/settings/organization error:", error);
    return NextResponse.json({ error: "Failed to fetch org settings" }, { status: 500 });
  }
}

/**
 * POST /api/settings/organization
 * Save organization name and settings
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgCtx = await safeOrgContext();
    if (!orgCtx.orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const raw = await request.json();
    const parsed = orgSettingsSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { name } = parsed.data;

    if (name && typeof name === "string" && name.trim().length > 0) {
      await prisma.org.update({
        where: { id: orgCtx.orgId },
        data: {
          name: name.trim(),
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[API] POST /api/settings/organization error:", error);
    return NextResponse.json({ error: "Failed to save org settings" }, { status: 500 });
  }
}
