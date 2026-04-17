import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/rbac";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const orgSettingsSchema = z.object({
  name: z.string().optional(),
});

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/organization
 * Fetch organization settings
 */
export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const org = await prisma.org.findUnique({
      where: { id: orgId },
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
});

/**
 * POST /api/settings/organization
 * Save organization name and settings
 */
export const POST = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    // RBAC: Only admins can modify organization settings
    await requireRole("admin");

    const raw = await req.json();
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
        where: { id: orgId },
        data: {
          name: name.trim(),
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Re-throw Next.js internal redirect errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw error;
    // Propagate RBAC 403 errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statusCode = (error as any)?.statusCode;
    if (statusCode === 403) {
      return NextResponse.json({ error: (error as Error).message }, { status: 403 });
    }
    logger.error("[API] POST /api/settings/organization error:", error);
    return NextResponse.json({ error: "Failed to save org settings" }, { status: 500 });
  }
});
