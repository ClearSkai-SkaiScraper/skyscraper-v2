/**
 * ============================================================================
 * withAuth — Declarative API Route Wrapper
 * ============================================================================
 *
 * Higher-order function that wraps API route handlers with canonical auth.
 * Eliminates boilerplate auth checks and ensures consistent org scoping.
 *
 * USAGE:
 *
 *   // Before (ad-hoc pattern — 385 files):
 *   export async function GET() {
 *     const { userId, orgId } = await auth();
 *     if (!userId || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *     // ... business logic
 *   }
 *
 *   // After (canonical pattern):
 *   export const GET = withAuth(async (req, { orgId, userId, role }) => {
 *     // Auth is guaranteed — orgId is DB-backed, never client-supplied
 *     // ... business logic
 *   });
 *
 * ============================================================================
 */

import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { isAuthError, requireAuth, type RequireAuthOptions } from "@/lib/auth/requireAuth";
import { setRequestContext } from "@/lib/requestContext";

type ResolvedAuth = {
  orgId: string;
  userId: string;
  role: string;
  membershipId: string;
};

// Route context type for Next.js 14+ App Router dynamic routes.
// The `params` property contains route parameters and may be a Promise in async routes.
// Using `any` to allow flexible destructuring patterns across all route handlers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteContext = any;

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: ResolvedAuth,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routeContext?: any
) => Promise<NextResponse | Response>;

/**
 * Wraps an API route handler with canonical authentication.
 *
 * @param handler - The route handler function that receives (req, authCtx, params)
 * @param options - Optional role enforcement (e.g., { roles: ["ADMIN"] })
 * @returns A Next.js route handler with auth pre-applied
 *
 * @example
 * // Basic auth
 * export const GET = withAuth(async (req, { orgId }) => {
 *   const data = await prisma.claims.findMany({ where: { orgId } });
 *   return NextResponse.json(data);
 * });
 *
 * // Admin-only
 * export const DELETE = withAuth(async (req, { orgId }) => {
 *   // Only ADMIN role can reach here
 *   return NextResponse.json({ deleted: true });
 * }, { roles: ["ADMIN"] });
 */
export function withAuth(handler: AuthenticatedHandler, options?: RequireAuthOptions) {
  return async (
    req: NextRequest,
    routeContext?: RouteContext
  ): Promise<NextResponse | Response> => {
    // Session 9: Propagate correlation ID from middleware to all wrapped routes
    const requestId = req.headers.get("x-request-id");
    if (requestId) setRequestContext(requestId);

    const auth = await requireAuth(options);
    if (isAuthError(auth)) return auth;

    return handler(req, auth, routeContext);
  };
}

/**
 * Admin-only convenience wrapper.
 *
 * @example
 * export const DELETE = withAdmin(async (req, { orgId }) => {
 *   await prisma.settings.delete({ where: { orgId } });
 *   return NextResponse.json({ ok: true });
 * });
 */
export function withAdmin(handler: AuthenticatedHandler) {
  return withAuth(handler, { roles: ["ADMIN", "OWNER"] });
}

/**
 * Manager-or-above convenience wrapper.
 */
export function withManager(handler: AuthenticatedHandler) {
  return withAuth(handler, { roles: ["OWNER", "ADMIN", "MANAGER"] });
}

// Export types for use in route handlers
export type { AuthenticatedHandler, ResolvedAuth, RouteContext };
