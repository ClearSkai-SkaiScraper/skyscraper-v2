export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's orgId
    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { orgId: true },
    });

    if (!user?.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const orgId = user.orgId;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "proposal", "insurance", "contractor", etc.

    // Query report_templates using the correct model and column names
    const where: any = { org_id: orgId };

    if (type) {
      // For now, we don't filter by type since report_templates doesn't have a category field
      // Just return all templates for the org
    }

    // Use report_templates model directly
    const templates = await (prisma as any).report_templates.findMany({
      where,
      orderBy: [{ is_default: "desc" }, { updated_at: "desc" }],
      select: {
        id: true,
        name: true,
        is_default: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Transform to expected format
    const result = templates.map((t: any) => ({
      id: t.id,
      name: t.name,
      templateType: null,
      category: null,
      preview_image_url: null,
      isDefault: t.is_default,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Template list error:", error);
    // Return empty array instead of error for graceful degradation
    return NextResponse.json([]);
  }
}
