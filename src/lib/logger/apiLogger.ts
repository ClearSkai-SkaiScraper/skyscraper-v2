/**
 * API Logger middleware (Sprint 9.1)
 *
 * Drop-in wrapper for Next.js API route handlers that automatically logs:
 *   - method, path, status, duration
 *   - orgId, userId (from Clerk session)
 *   - request ID for correlation
 *   - Sentry breadcrumbs
 *
 * @example
 * import { withApiLogging } from "@/lib/logger/apiLogger";
 * export const GET = withApiLogging(async (req) => { ... });
 */

import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

// ── Types ───────────────────────────────────────────────────────────
type RouteHandler = (
  req: NextRequest,
  ctx?: { params?: Record<string, string | string[]> }
) => Promise<NextResponse | Response>;

interface ApiLogEntry {
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  orgId?: string | null;
  userId?: string | null;
  userAgent?: string;
  ip?: string;
  error?: string;
}

// ── Wrapper ─────────────────────────────────────────────────────────
export function withApiLogging(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx?) => {
    const requestId = nanoid(12);
    const start = performance.now();
    const method = req.method;
    const path = new URL(req.url).pathname;
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

    // Try to extract auth info from headers (set by middleware)
    const orgId = req.headers.get("x-org-id") ?? undefined;
    const userId = req.headers.get("x-user-id") ?? undefined;

    try {
      const response = await handler(req, ctx);
      const durationMs = Math.round(performance.now() - start);
      const status = response instanceof NextResponse ? response.status : 200;

      const entry: ApiLogEntry = {
        requestId,
        method,
        path,
        status,
        durationMs,
        orgId,
        userId,
        userAgent,
        ip,
      };

      if (status >= 500) {
        logger.error("[API] 5xx response", entry);
      } else if (status >= 400) {
        logger.warn("[API] 4xx response", entry);
      } else if (durationMs > 2000) {
        logger.warn("[API] Slow response", entry);
      } else {
        logger.info("[API] Request completed", entry);
      }

      // Add request ID header for debugging
      if (response instanceof NextResponse) {
        response.headers.set("x-request-id", requestId);
      }

      return response;
    } catch (error) {
      const durationMs = Math.round(performance.now() - start);

      const entry: ApiLogEntry = {
        requestId,
        method,
        path,
        status: 500,
        durationMs,
        orgId,
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      logger.error("[API] Unhandled exception", entry);

      return NextResponse.json({ error: "Internal Server Error", requestId }, { status: 500 });
    }
  };
}

/**
 * Helper to create a structured log context for non-wrapped routes.
 */
export function createLogContext(req: NextRequest) {
  return {
    requestId: nanoid(12),
    method: req.method,
    path: new URL(req.url).pathname,
    orgId: req.headers.get("x-org-id"),
    userId: req.headers.get("x-user-id"),
    timestamp: new Date().toISOString(),
  };
}
