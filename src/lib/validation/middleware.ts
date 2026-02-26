/**
 * ============================================================================
 * API Validation Middleware — Sprint 1 Zod Blitz
 * ============================================================================
 *
 * Reusable helpers for validating request bodies & query params with Zod.
 * Returns structured 400 errors so clients get actionable messages.
 *
 * Usage:
 *   const body = await validateBody(req, mySchema);
 *   if (body instanceof NextResponse) return body; // 400 with error details
 *   // body is now typed & validated
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export interface ValidationError {
  error: string;
  details: Array<{ field: string; message: string }>;
}

/**
 * Validate a JSON request body against a Zod schema.
 * Returns the parsed data on success, or a 400 NextResponse on failure.
 */
export async function validateBody<T extends z.ZodTypeAny>(
  req: NextRequest | Request,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", details: [] } satisfies ValidationError,
      { status: 400 }
    );
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: result.error.errors.map((e) => ({
          field: e.path.join(".") || "(root)",
          message: e.message,
        })),
      } satisfies ValidationError,
      { status: 400 }
    );
  }

  return result.data;
}

/**
 * Validate URL search params against a Zod schema.
 * Extracts params from the request URL.
 */
export function validateQuery<T extends z.ZodTypeAny>(
  req: NextRequest | Request,
  schema: T
): z.infer<T> | NextResponse {
  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: result.error.errors.map((e) => ({
          field: e.path.join(".") || "(root)",
          message: e.message,
        })),
      } satisfies ValidationError,
      { status: 400 }
    );
  }

  return result.data;
}

/**
 * Type guard: checks if the value is a NextResponse (i.e. validation failed).
 */
export function isValidationError(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
