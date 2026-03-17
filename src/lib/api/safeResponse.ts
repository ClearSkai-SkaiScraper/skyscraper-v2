/**
 * SAFE API RESPONSE HELPERS
 *
 * Use these helpers in all API routes to ensure consistent error handling
 * and prevent 500 errors from crashing the demo.
 */

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export interface APIResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  details?: string;
  timestamp?: string;
}

/**
 * Return a successful API response
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse<APIResponse<T>> {
  return NextResponse.json(
    {
      ok: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Return an error API response (always 200 to prevent demo crashes)
 */
export function apiError(error: string, details?: string, status = 500): NextResponse<APIResponse> {
  return NextResponse.json(
    {
      ok: false,
      error,
      details: process.env.NODE_ENV === "development" ? details : undefined,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Return an unauthorized error
 */
export function apiUnauthorized(message = "Unauthorized"): NextResponse<APIResponse> {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      timestamp: new Date().toISOString(),
    },
    { status: 401 }
  );
}

/**
 * Return a validation error
 */
export function apiValidationError(
  message: string,
  details?: Record<string, string>
): NextResponse<APIResponse> {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      details: JSON.stringify(details),
      timestamp: new Date().toISOString(),
    },
    { status: 400 }
  );
}

/**
 * Return a not found error
 */
export function apiNotFound(resource = "Resource"): NextResponse<APIResponse> {
  return NextResponse.json(
    {
      ok: false,
      error: `${resource} not found`,
      timestamp: new Date().toISOString(),
    },
    { status: 404 }
  );
}

/**
 * Wrap an API handler with error handling
 */
export function withErrorHandler<T extends any[]>(handler: (...args: T) => Promise<NextResponse>) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      logger.error("[API Error]", error);
      return apiError(
        "Internal server error",
        error instanceof Error ? error.message : String(error)
      );
    }
  };
}

/**
 * Validate required fields in request body
 */
export function validateRequired(
  body: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = requiredFields.filter((field) => !body[field]);

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}
