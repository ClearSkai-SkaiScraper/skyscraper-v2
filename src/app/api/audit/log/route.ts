export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Phase 5 - Client-side audit log API route
// SECURITY FIX: orgId is now derived server-side via withOrgScope, not from request body
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { type AuditAction, logAction } from "@/modules/audit/core/logger";

export const POST = withOrgScope(async (req: Request, { userId, orgId }) => {
  try {
    const body = await req.json();
    const { action, jobId, userName, payload } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing required field: action" }, { status: 400 });
    }

    await logAction({
      orgId, // Server-derived — never trust client-supplied orgId
      userId,
      userName: userName || "Unknown User",
      action: action as AuditAction,
      jobId,
      payload,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Audit log POST failed:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 }
    );
  }
});
