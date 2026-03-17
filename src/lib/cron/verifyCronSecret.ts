/**
 * Cron Secret Verification
 *
 * Hard auth check for all cron endpoints.
 * Returns null if authorized, or a NextResponse 401 if not.
 * NEVER bypasses auth — if CRON_SECRET is unset, ALL requests are rejected.
 */
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export function verifyCronSecret(req: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is not set, reject everything — fail closed
  if (!cronSecret) {
    logger.error("[CRON_AUTH] CRON_SECRET env var is not set — rejecting request");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn("[CRON_AUTH] Unauthorized cron attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // Authorized
}
