/**
 * ============================================================================
 * AppError — Typed application errors for API routes
 * ============================================================================
 *
 * Usage:
 *   throw new AppError("Claim not found", 404, "NOT_FOUND");
 *   throw AppError.notFound("Claim");
 *   throw AppError.forbidden("You cannot access this resource");
 */

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "VALIDATION"
  | "INTERNAL"
  | "SERVICE_UNAVAILABLE"
  | "PAYMENT_REQUIRED";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = "INTERNAL",
    isOperational = true
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  // ── Factory Methods ──────────────────────────────────────────

  static badRequest(message = "Bad request") {
    return new AppError(message, 400, "BAD_REQUEST");
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(message, 401, "UNAUTHORIZED");
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError(message, 403, "FORBIDDEN");
  }

  static notFound(resource = "Resource") {
    return new AppError(`${resource} not found`, 404, "NOT_FOUND");
  }

  static conflict(message = "Resource already exists") {
    return new AppError(message, 409, "CONFLICT");
  }

  static rateLimited(message = "Too many requests. Please try again later.") {
    return new AppError(message, 429, "RATE_LIMITED");
  }

  static validation(message = "Validation failed") {
    return new AppError(message, 422, "VALIDATION");
  }

  static internal(message = "An unexpected error occurred") {
    return new AppError(message, 500, "INTERNAL", false);
  }

  static serviceUnavailable(message = "Service temporarily unavailable") {
    return new AppError(message, 503, "SERVICE_UNAVAILABLE");
  }

  static paymentRequired(message = "Upgrade required to access this feature") {
    return new AppError(message, 402, "PAYMENT_REQUIRED");
  }
}
