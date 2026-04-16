export const dynamic = "force-dynamic";

/**
 * API: Mark All Notifications as Read
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { markAllNotificationsRead } from "@/lib/notifications/notificationHelper";

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const count = await markAllNotificationsRead(orgId, userId);

    if (count === 0) {
      // 0 updated is fine — maybe all were already read
      return NextResponse.json({ success: true, count: 0 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error("[MARK_ALL_READ_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
