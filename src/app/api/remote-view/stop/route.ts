/**
 * POST /api/remote-view/stop
 *
 * Clears the remote view cookie and logs the event.
 */

export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { resolveUserRole } from "@/lib/permissions/server";

export async function POST() {
  try {
    const user = await resolveUserRole();

    // eslint-disable-next-line @typescript-eslint/await-thenable
    const cookieStore = await cookies();
    cookieStore.set("x-remote-view-user", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });

    logger.info("[RemoteView] Stopped", {
      viewer: user?.userId || "unknown",
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    logger.error("[RemoteView] Stop failed:", error);
    return NextResponse.json({ ok: true }); // Always succeed — clearing is best-effort
  }
}
