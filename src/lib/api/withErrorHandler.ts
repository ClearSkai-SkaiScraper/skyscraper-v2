/**
 * src/lib/api/withErrorHandler.ts
 *
 * Centralized API Route Error Handler (HOF Wrapper)
 *
 * Consolidates error handling across all API routes with:
 * - NEXT_REDIRECT re-throw (Next.js internal mechanism)
 * - ZodError → 400 with structured validation errors
 * - Prisma known errors → appropriate HTTP status codes
 * - CircuitBreakerOpenError → 503 Service Unavailable
 * - Generic errors → 500 with safe message
 * - Structured logging via logger
 * - Request duration tracking
 *
 * Usage:
 * ```typescript
 * import { withSafeHandler } from "@/lib/api/withErrorHandler";
 *
 * export const POST = withSafeHandler("CLAIMS_CREATE", async (req) => {
 *   const body = await req.json();
 *   // ... handler logic
 *   return NextResponse.json({ ok: true, data });
 * });
 * ```
 */

import { isRedirectError } from "next/dist/client/components/redirect";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

// ── Error Classification ──────────────────────────────────────────

function isNextRedirect(err: unknown): boolean {
  // Use Next.js official check (digest-based) with fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return isRedirectError(err) || (err as any)?.digest?.startsWith?.("NEXT_REDIRECT");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isZodError(err: unknown): err is { name: "ZodError"; errors: any[] } {
  return err instanceof Error && err.name === "ZodError" && "errors" in err;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPrismaError(err: unknown): err is { code: string; meta?: any } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (err as any).code === "string" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).code.startsWith("P")
  );
}

function isCircuitBreakerOpen(err: unknown): boolean {
  return err instanceof Error && err.name === "CircuitBreakerOpenError";
}

function classifyPrismaError(err: { code: string }): { message: string; status: number } {
  switch (err.code) {
    case "P2002":
      return { message: "A record with this value already exists", status: 409 };
    case "P2025":
      return { message: "Record not found", status: 404 };
    case "P2003":
      return { message: "Related record not found (foreign key constraint)", status: 400 };
    case "P2024":
      return { message: "Database connection timed out — please retry", status: 503 };
    default:
      return { message: "Database operation failed", status: 500 };
  }
}

// ── Response helpers ──────────────────────────────────────────────

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
      ...(details ? { details } : {}),
      // eslint-disable-next-line no-restricted-syntax
      traceId: process.env.VERCEL_REQUEST_ID || undefined,
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

// ── Main wrapper ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

/**
 * Wrap an API route handler with comprehensive error handling.
 *
 * @param tag - Module tag for logging (e.g. "CLAIMS_CREATE")
 * @param handler - The route handler function
 * @returns Wrapped handler that never throws unhandled errors
 */
export function withSafeHandler(tag: string, handler: RouteHandler): RouteHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const start = Date.now();

    try {
      const result = await handler(req, context);
      return result;
    } catch (err: unknown) {
      const duration = Date.now() - start;

      // ① NEXT_REDIRECT — must be re-thrown (Next.js internal)
      if (isNextRedirect(err)) {
        throw err;
      }

      // ② Zod validation error → 400
      if (isZodError(err)) {
        logger.warn(`[${tag}] Validation error`, {
          duration,
          errors: err.errors,
        });
        return errorResponse(400, "VALIDATION_ERROR", "Request validation failed", err.errors);
      }

      // ③ Prisma known error → classified status
      if (isPrismaError(err)) {
        const { message, status } = classifyPrismaError(err);
        logger.error(`[${tag}] Prisma error`, {
          code: err.code,
          duration,
          meta: err.meta,
        });
        return errorResponse(status, `PRISMA_${err.code}`, message);
      }

      // ④ Circuit breaker open → 503
      if (isCircuitBreakerOpen(err)) {
        logger.warn(`[${tag}] Circuit breaker open — rejecting request`, { duration });
        return errorResponse(
          503,
          "SERVICE_UNAVAILABLE",
          "AI service temporarily unavailable. Please retry shortly."
        );
      }

      // ⑤ Generic Error → 500 with safe message
      if (err instanceof Error) {
        logger.error(`[${tag}] Unhandled error`, {
          message: err.message,
          stack: err.stack?.split("\n").slice(0, 5).join("\n"),
          duration,
        });

        const safeMessage =
          // eslint-disable-next-line no-restricted-syntax
          process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message;

        return errorResponse(500, "INTERNAL_ERROR", safeMessage);
      }

      // ⑥ Totally unknown → 500
      logger.error(`[${tag}] Unknown thrown value`, { err, duration });
      return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred");
    }
  };
}
