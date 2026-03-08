export const dynamic = "force-dynamic";

/**
 * API: Mark All Notifications as Read
 */

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { markAllNotificationsRead } from "@/lib/notifications/notificationHelper";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // markAllNotificationsRead expects orgId — look up from user first
    const member = await (
      await import("@/lib/prisma")
    ).default.tradesCompanyMember.findFirst({
      where: { userId },
      select: { companyId: true },
    });

    const orgId = member?.companyId ?? userId; // fallback to userId if no company
    const count = await markAllNotificationsRead(orgId);

    if (count === 0) {
      // 0 updated is fine — maybe all were already read
      return NextResponse.json({ success: true, count: 0 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[MARK_ALL_READ_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
