export const dynamic = "force-dynamic";

// GET /api/rbac/me
// Returns current user's role and permissions
// Uses getActiveOrgContext to resolve orgId from DB membership (not just Clerk)

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import { getUserRole, roleHierarchy, rolePermissions } from "@/lib/rbac";

export async function GET() {
  try {
    const orgCtx = await getActiveOrgContext({ required: true });

    if (!orgCtx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, orgId } = orgCtx;
    const role = await getUserRole(userId, orgId);

    if (!role) {
      // User exists in org but has no role set — default to ADMIN for org creators
      return NextResponse.json({
        role: "ADMIN",
        permissions: rolePermissions["ADMIN"] || [],
        hierarchy: roleHierarchy["ADMIN"] || 80,
      });
    }

    return NextResponse.json({
      role,
      permissions: rolePermissions[role] || [],
      hierarchy: roleHierarchy[role],
    });
  } catch (error) {
    logger.error("[API] RBAC me error:", error);
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}
