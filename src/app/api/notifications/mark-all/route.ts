export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

/**
 * Marks all notifications for the current user as read.
 */
export async function POST() {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mark all notifications as read for this org
    // ProjectNotification is org/claim-based, not user-based
    const result = await prisma.projectNotification.updateMany({
      where: {
        orgId: ctx.orgId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      markedRead: result.count,
    });
  } catch (error) {
    logger.error("[POST /api/notifications/mark-all] Error:", error);
    return NextResponse.json({ error: "Failed to mark notifications" }, { status: 500 });
  }
}
