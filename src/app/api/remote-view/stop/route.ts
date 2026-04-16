/**
 * POST /api/remote-view/stop
 *
 * Clears the remote view cookie and logs the event.
 */

export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";

export const POST = withOrgScope(async (req, { userId }) => {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const cookieStore = await cookies();
    cookieStore.set("x-remote-view-user", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });

    logger.info("[RemoteView] Stopped", {
      viewer: userId,
    });

    return NextResponse.json({ ok: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("[RemoteView] Stop failed:", error);
    return NextResponse.json({ ok: true }); // Always succeed — clearing is best-effort
  }
});
