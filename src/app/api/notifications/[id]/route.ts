export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RouteContext = {
  params: Promise<{ id: string }>;
};

// DELETE /api/notifications/:id - Delete a notification
export const DELETE = withAuth(async (req: NextRequest, { userId, orgId }, routeParams) => {
  try {
    const { id } = await routeParams.params;

    // Verify ownership with BOTH userId AND orgId (mandatory)
    const existing = await prisma.notification.findFirst({
      where: { id, userId, orgId },
      select: { id: true },
    });

    if (!existing) {
      // Uniform 404 — prevents notification ID enumeration
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    await prisma.notification.delete({
      where: { id, userId, orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting notification:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
});
