export const dynamic = "force-dynamic";

// GET /api/rbac/me
// Returns current user's role and permissions
// Uses System B canonical RBAC from @/lib/auth/rbac

import { NextResponse } from "next/server";

import { getCurrentUserRole, type TeamRole } from "@/lib/auth/rbac";
import { logger } from "@/lib/logger";

// Permission map aligned with System B ROLE_PERMISSIONS
const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
  admin: [
    "claims:create",
    "claims:edit",
    "claims:delete",
    "claims:view",
    "supplements:create",
    "supplements:approve",
    "supplements:view",
    "reports:create",
    "reports:view",
    "files:upload",
    "files:delete",
    "team:invite",
    "team:manage",
    "billing:view",
    "billing:manage",
    "org:settings",
  ],
  manager: [
    "claims:create",
    "claims:edit",
    "claims:view",
    "supplements:create",
    "supplements:view",
    "reports:create",
    "reports:view",
    "files:upload",
    "files:delete",
  ],
  member: ["claims:view", "supplements:view", "reports:view", "files:upload"],
  viewer: ["claims:view", "reports:view"],
};

const ROLE_HIERARCHY: Record<TeamRole, number> = {
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
};

export async function GET() {
  try {
    const userRole = await getCurrentUserRole();

    if (!userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = userRole;

    return NextResponse.json({
      role,
      permissions: ROLE_PERMISSIONS[role] || [],
      hierarchy: ROLE_HIERARCHY[role] || 0,
    });
  } catch (error) {
    logger.error("[API] RBAC me error:", error);
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}
