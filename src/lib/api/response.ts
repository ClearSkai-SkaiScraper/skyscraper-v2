/**
 * Standardized API response helpers for consistent error handling across all routes
 */

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export type ApiSuccessResponse<T = any> = {
  ok: true;
  data: T;
};

export type ApiErrorResponse = {
  ok: false;
  error: string;
  message: string;
  details?: any;
};

/**
 * Return a successful JSON response
 */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data } as ApiSuccessResponse<T>, { status });
}

/**
 * Return an error JSON response with safe, user-friendly message
 */
export function fail(message: string, code = "INTERNAL_ERROR", status = 500, details?: any) {
  const response: ApiErrorResponse = {
    ok: false,
    error: code,
    message,
  };

  if (details && process.env.NODE_ENV !== "production") {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Common error responses
 */
export const errors = {
  unauthorized: () => fail("Unauthorized. Please sign in.", "UNAUTHORIZED", 401),
  forbidden: () => fail("You don't have permission to access this resource.", "FORBIDDEN", 403),
  notFound: (resource = "Resource") => fail(`${resource} not found.`, "NOT_FOUND", 404),
  badRequest: (message = "Invalid request.") => fail(message, "BAD_REQUEST", 400),
  paymentRequired: (message = "Insufficient tokens or credits.") =>
    fail(message, "PAYMENT_REQUIRED", 402),
  internal: (message = "Something went wrong. Please try again.") =>
    fail(message, "INTERNAL_ERROR", 500),
  tooManyRequests: () => fail("Too many requests. Please try again later.", "RATE_LIMIT", 429),
};

/**
 * Wrap async route handlers with error catching
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  routeName: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error: any) {
      logger.error(`[${routeName}] Unhandled error`, {
        message: error?.message,
        stack: error?.stack?.split("\n").slice(0, 3).join("\n"),
      });

      return fail(
        error?.message || "An unexpected error occurred.",
        "INTERNAL_ERROR",
        500,
        process.env.NODE_ENV !== "production" ? error?.stack : undefined
      );
    }
  };
}
