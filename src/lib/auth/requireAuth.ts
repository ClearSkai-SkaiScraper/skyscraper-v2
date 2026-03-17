/**
 * ============================================================================
 * requireAuth — Enterprise API Route Guard
 * ============================================================================
 *
 * Single entry point for ALL API routes that need authentication + org scoping.
 *
 * GUARANTEES:
 *   1. User is authenticated via Clerk
 *   2. User has a valid DB-backed org membership
 *   3. orgId is derived server-side (NEVER from client)
 *   4. Optional role enforcement
 *
 * USAGE:
 *
 *   // Basic auth + org:
 *   const ctx = await requireAuth();
 *   // ctx = { orgId, userId, role, membershipId }
 *
 *   // With role enforcement:
 *   const ctx = await requireAuth({ roles: ["ADMIN", "MANAGER"] });
 *
 *   // In a route handler:
 *   export async function GET() {
 *     const auth = await requireAuth();
 *     if (auth instanceof NextResponse) return auth; // 401/403
 *     const { orgId, userId, role } = auth;
 *     // ... query scoped by orgId
 *   }
 *
 * ============================================================================
 */

import "server-only";

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { OrgResolutionError, resolveOrg } from "@/lib/org/resolveOrg";

// Re-export the type for consumers
export type { ResolvedOrg } from "@/lib/org/resolveOrg";

export interface RequireAuthOptions {
  /**
   * If set, the user must have one of these roles.
   * Uses the role from the user_organizations membership.
   */
  roles?: string[];
}

export type AuthResult =
  | { orgId: string; userId: string; role: string; membershipId: string }
  | NextResponse;

/**
 * Require authentication and org membership for an API route.
 *
 * Returns either the resolved context or a NextResponse error.
 * Callers should check: `if (result instanceof NextResponse) return result;`
 */
export async function requireAuth(options?: RequireAuthOptions): Promise<AuthResult> {
  try {
    const ctx = await resolveOrg();

    // ── Role enforcement ───────────────────────────────────────────────
    if (options?.roles && options.roles.length > 0) {
      const userRole = (ctx.role ?? "").toUpperCase();
      const allowed = options.roles.map((r) => r.toUpperCase());

      if (!allowed.includes(userRole)) {
        return NextResponse.json(
          {
            error: "FORBIDDEN",
            message: `Role '${ctx.role}' is not authorized for this action. Required: ${allowed.join(", ")}`,
          },
          { status: 403 }
        );
      }
    }

    return ctx;
  } catch (err) {
    if (err instanceof OrgResolutionError) {
      if (err.reason === "unauthenticated") {
        return NextResponse.json(
          { error: "UNAUTHENTICATED", message: "Authentication required" },
          { status: 401 }
        );
      }
      if (err.reason === "no-org") {
        return NextResponse.json(
          {
            error: "NO_ORGANIZATION",
            message: "No valid organization membership found",
          },
          { status: 403 }
        );
      }
    }

    // Unknown error — log and return 500
    logger.error("[requireAuth] Unexpected error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Authentication check failed" },
      { status: 500 }
    );
  }
}

/**
 * Helper to check if requireAuth returned an error response.
 *
 * Usage:
 *   const auth = await requireAuth();
 *   if (isAuthError(auth)) return auth;
 *   // auth is now typed as ResolvedOrg
 */
export function isAuthError(result: AuthResult): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Convenience: requireAdmin (ADMIN or OWNER)
 */
export async function requireAdmin(): Promise<AuthResult> {
  return requireAuth({ roles: ["ADMIN", "OWNER"] });
}

/**
 * Convenience: requireManager (OWNER, ADMIN, or MANAGER)
 */
export async function requireManager(): Promise<AuthResult> {
  return requireAuth({ roles: ["OWNER", "ADMIN", "MANAGER"] });
}

/**
 * Convenience: requireStaff (OWNER, ADMIN, MANAGER, PROJECT_MANAGER, SALES_REP, FIELD_TECH, FINANCE)
 */
export async function requireStaff(): Promise<AuthResult> {
  return requireAuth({
    roles: ["OWNER", "ADMIN", "MANAGER", "PROJECT_MANAGER", "SALES_REP", "FIELD_TECH", "FINANCE"],
  });
}
