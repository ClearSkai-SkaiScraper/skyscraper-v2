// ============================================================================
// H-14: API Route Input Validation Utilities
// ============================================================================

import { NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";

export class ValidationError extends Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public errors: any) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export class RateLimitError extends Error {
  constructor(message = "Rate limit exceeded") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class TimeoutError extends Error {
  constructor(message = "Request timeout") {
    super(message);
    this.name = "TimeoutError";
  }
}

// Validate request body against Zod schema
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors);
    }
    throw error;
  }
}

// Wrap handler with timeout
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new TimeoutError()), timeoutMs)),
  ]);
}

// Standard error response handler
export function handleApiError(error: unknown) {
  logger.error("[API_ERROR]", error);

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.errors },
      { status: 400 }
    );
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  if (error instanceof TimeoutError) {
    return NextResponse.json({ error: error.message }, { status: 504 });
  }

  // Generic error
  return NextResponse.json(
    {
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    },
    { status: 500 }
  );
}

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || record.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    throw new RateLimitError();
  }

  record.count++;
  return true;
}

// Circuit breaker state
const circuitBreakerState = new Map<
  string,
  { failures: number; lastFailureTime: number; isOpen: boolean }
>();

export function checkCircuitBreaker(
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  maxFailures: number = 5,
  resetTimeMs: number = 60000
): void {
  const state = circuitBreakerState.get(key);

  if (!state) {
    circuitBreakerState.set(key, { failures: 0, lastFailureTime: 0, isOpen: false });
    return;
  }

  // Check if circuit should be reset
  if (state.isOpen && Date.now() - state.lastFailureTime > resetTimeMs) {
    state.isOpen = false;
    state.failures = 0;
  }

  if (state.isOpen) {
    throw new Error("Circuit breaker is open - service temporarily unavailable");
  }
}

export function recordCircuitBreakerFailure(key: string, maxFailures: number = 5): void {
  const state = circuitBreakerState.get(key) || {
    failures: 0,
    lastFailureTime: 0,
    isOpen: false,
  };

  state.failures++;
  state.lastFailureTime = Date.now();

  if (state.failures >= maxFailures) {
    state.isOpen = true;
  }

  circuitBreakerState.set(key, state);
}
