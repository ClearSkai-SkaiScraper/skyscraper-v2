// GET /api/rbac/me
// Returns current user's role and permissions

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { getRoleContext } from "@/lib/rbac";

export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await getRoleContext();

    return NextResponse.json({
      role: context.role,
      permissions: context.permissions,
      hierarchy: context.hierarchy,
    });
  } catch (error) {
    logger.error("[API] RBAC me error:", error);
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}
