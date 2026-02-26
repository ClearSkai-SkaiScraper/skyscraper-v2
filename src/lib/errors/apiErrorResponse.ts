/**
 * ============================================================================
 * API Error Response — Standardised JSON error builder
 * ============================================================================
 *
 * Converts any caught error into a consistent JSON response:
 *   { error: string, code: string, details?: any }
 *
 * Usage in API routes:
 *   catch (error) {
 *     return apiErrorResponse(error);
 *   }
 */

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

import { AppError, type ErrorCode } from "./AppError";

interface ErrorResponseBody {
  error: string;
  code: ErrorCode;
  details?: unknown;
}

/**
 * Convert any error into a structured NextResponse.
 * AppError instances produce their own status code & message.
 * Unknown errors produce a safe 500 with a generic message.
 */
export function apiErrorResponse(
  error: unknown,
  context?: string
): NextResponse<ErrorResponseBody> {
  // Known operational error
  if (error instanceof AppError) {
    if (!error.isOperational) {
      logger.error(`[${context || "API"}] Non-operational AppError:`, error);
    }
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // Prisma known errors
  if (isPrismaError(error)) {
    const { message, status } = classifyPrismaError(error);
    logger.error(`[${context || "API"}] Prisma error:`, error);
    return NextResponse.json({ error: message, code: "INTERNAL" as ErrorCode }, { status });
  }

  // Generic JS Error
  if (error instanceof Error) {
    logger.error(`[${context || "API"}] Unhandled error:`, error.message);
    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        code: "INTERNAL" as ErrorCode,
      },
      { status: 500 }
    );
  }

  // Totally unknown
  logger.error(`[${context || "API"}] Unknown thrown value:`, error);
  return NextResponse.json(
    {
      error: "An unexpected error occurred",
      code: "INTERNAL" as ErrorCode,
    },
    { status: 500 }
  );
}

// ── Prisma Error Helpers ─────────────────────────────────────

function isPrismaError(err: unknown): err is { code: string; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as any).code === "string" &&
    (err as any).code.startsWith("P")
  );
}

function classifyPrismaError(err: { code: string; message: string }): {
  message: string;
  status: number;
} {
  switch (err.code) {
    case "P2002":
      return { message: "A record with this value already exists", status: 409 };
    case "P2025":
      return { message: "Record not found", status: 404 };
    case "P2003":
      return { message: "Related record not found", status: 400 };
    default:
      return { message: "Database operation failed", status: 500 };
  }
}
