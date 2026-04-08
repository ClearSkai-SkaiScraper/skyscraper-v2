export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";

// Token system removed — flat $80/month pricing.
// This route is kept as a stub to prevent 404s from cached clients.
// Auth required to prevent unauthenticated abuse.
export const POST = withAuth(async (req: NextRequest, { userId }) => {
  logger.info("[AUTO_REFILL_STUB]", { userId, status: "gone" });
  return NextResponse.json(
    { error: "Token system has been removed. All features are included in the flat monthly plan." },
    { status: 410 } // 410 Gone
  );
});
