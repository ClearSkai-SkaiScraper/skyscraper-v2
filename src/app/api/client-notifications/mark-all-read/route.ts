export const dynamic = "force-dynamic";

/**
 * API: Mark All Client Notifications as Read
 */

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mark all ClientNotification records as read for this user
    // ClientNotification uses clientId (which maps to user.id in client context)
    const result = await prisma.clientNotification.updateMany({
      where: {
        clientId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    logger.info("[CLIENT_MARK_ALL_READ]", { userId: user.id, count: result.count });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: unknown) {
    logger.error("[CLIENT_MARK_ALL_READ_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
