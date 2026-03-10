export const dynamic = "force-dynamic";

/**
 * API: Mark All Notifications as Read
 */

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { getTenant } from "@/lib/auth/tenant";
import { markAllNotificationsRead } from "@/lib/notifications/notificationHelper";

import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use canonical tenant resolution — DB-verified orgId
    const orgId = await getTenant();
    if (!orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

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
