export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// DELETE /api/notifications/:id - Delete a notification
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // S1-04: orgId is MANDATORY — no conditional bypass
    if (!orgId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 403 });
    }

    const { id } = await context.params;

    // B-14 + S1-04: Verify ownership with BOTH userId AND orgId (mandatory)
    const existing = await prisma.notification.findFirst({
      where: { id, userId, orgId },
      select: { id: true },
    });

    if (!existing) {
      // Uniform 404 — prevents notification ID enumeration
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting notification:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
