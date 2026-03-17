/**
 * ============================================================================
 * withOrgGuard — Protected API Route Wrapper
 * ============================================================================
 *
 * Wraps any Next.js API route handler with:
 *   1. Auth check (Clerk session)
 *   2. Org resolution via resolveOrg (single source of truth)
 *   3. Structured error handling (never silent failures)
 *   4. Request logging for audit trail
 *
 * USAGE:
 *   export const GET = withOrgGuard(async (req, { userId, orgId }) => {
 *     const jobs = await prisma.jobs.findMany({ where: { orgId } });
 *     return NextResponse.json({ ok: true, data: jobs });
 *   });
 *
 * This replaces the ad-hoc pattern of calling getTenant/getOrgContext/etc.
 * in each route handler. Every write endpoint should use this.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { OrgResolutionError, resolveOrg } from "@/lib/org/resolveOrg";

export interface OrgGuardContext {
  userId: string;
  orgId: string;
  role: string;
}

type GuardedHandler = (
  req: NextRequest,
  ctx: OrgGuardContext,
  routeCtx?: any
) => Promise<NextResponse>;

/**
 * Wrap a route handler with org guard.
 *
 * @param handler — The actual route logic
 * @param opts.requiredRole — Optional minimum role (e.g., "ADMIN")
 */
export function withOrgGuard(handler: GuardedHandler, opts?: { requiredRole?: string }) {
  return async (req: NextRequest, routeCtx?: any) => {
    const method = req.method;
    const path = req.nextUrl.pathname;

    try {
      // ── 1. Resolve org ──────────────────────────────────────────────
      const { userId, orgId, role } = await resolveOrg();

      // ── 2. Role check (if required) ─────────────────────────────────
      if (opts?.requiredRole) {
        const ROLE_RANK: Record<string, number> = {
          MEMBER: 0,
          USER: 0,
          VENDOR: 1,
          INSPECTOR: 2,
          BILLING: 3,
          PM: 4,
          MANAGER: 5,
          ADMIN: 6,
          OWNER: 6,
        };

        const userRank = ROLE_RANK[role.toUpperCase()] ?? 0;
        const requiredRank = ROLE_RANK[opts.requiredRole.toUpperCase()] ?? 99;

        if (userRank < requiredRank) {
          console.warn(
            `[OrgGuard] ${method} ${path} — FORBIDDEN: ${role} < ${opts.requiredRole} (user=${userId})`
          );
          return NextResponse.json(
            { ok: false, error: "Insufficient permissions" },
            { status: 403 }
          );
        }
      }

      // ── 3. Audit log (writes only) ─────────────────────────────────
      if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
        logger.debug(`[OrgGuard] ${method} ${path} | org=${orgId} user=${userId} role=${role}`);
      }

      // ── 4. Execute handler ──────────────────────────────────────────
      return await handler(req, { userId, orgId, role }, routeCtx);
    } catch (err: any) {
      // Known auth/org errors → 401
      if (err instanceof OrgResolutionError) {
        const status = err.reason === "unauthenticated" ? 401 : 403;
        return NextResponse.json({ ok: false, error: err.message }, { status });
      }

      // Unknown errors → 500 with logging
      logger.error(`[OrgGuard] ${method} ${path} — UNHANDLED ERROR:`, err);
      return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
  };
}
