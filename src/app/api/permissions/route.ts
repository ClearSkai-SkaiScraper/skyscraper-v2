export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { ROLE_PERMISSIONS } from "@/lib/permissions/constants";
import { resolveUserRole } from "@/lib/permissions/server";

/**
 * GET /api/permissions
 * Returns current user's role and permissions (Sprint 27 unified system)
 */
export async function GET() {
  try {
    const user = await resolveUserRole();

    if (!user) {
      return NextResponse.json({
        role: null,
        permissions: [],
      });
    }

    const permissions = ROLE_PERMISSIONS[user.role] || [];

    return NextResponse.json({
      role: user.role,
      permissions,
    });
  } catch (error) {
    logger.error("Failed to fetch permissions:", error);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}
