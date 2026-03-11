/**
 * ============================================================================
 * AI CIRCUIT BREAKER
 * ============================================================================
 *
 * Prevents cascading failures when OpenAI is degraded or down.
 * Trips after consecutive failures, returns graceful errors during cooldown.
 *
 * States:
 *   CLOSED  → normal operation, requests pass through
 *   OPEN    → circuit tripped, requests are rejected immediately
 *   HALF    → testing with one request to see if service recovered
 *
 * Usage:
 *   import { aiCircuitBreaker } from "@/lib/ai/circuitBreaker";
 *   aiCircuitBreaker.guard();            // throws if circuit is OPEN
 *   aiCircuitBreaker.recordSuccess();    // on successful AI call
 *   aiCircuitBreaker.recordFailure(err); // on failed AI call
 *   aiCircuitBreaker.getState();         // for health endpoint
 *
 * ============================================================================
 */

import { logger } from "@/lib/logger";

// ── Configuration ────────────────────────────────────────────────────────────

/** Number of consecutive failures before tripping the circuit */
const FAILURE_THRESHOLD = 3;

/** How long the circuit stays OPEN before allowing a test request (ms) */
const COOLDOWN_MS = 60_000; // 60 seconds

/** How long a failure record persists before being considered stale (ms) */
const FAILURE_WINDOW_MS = 120_000; // 2 minutes

// ── Types ────────────────────────────────────────────────────────────────────

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerStatus {
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  openedAt: number | null;
  totalTrips: number;
  config: {
    failureThreshold: number;
    cooldownMs: number;
    failureWindowMs: number;
  };
}

// ── Error ────────────────────────────────────────────────────────────────────

export class CircuitBreakerOpenError extends Error {
  public readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super("AI service temporarily unavailable — circuit breaker is OPEN");
    this.name = "CircuitBreakerOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}

// ── Circuit Breaker Implementation ───────────────────────────────────────────

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private consecutiveFailures = 0;
  private lastFailureAt: number | null = null;
  private lastSuccessAt: number | null = null;
  private openedAt: number | null = null;
  private totalTrips = 0;

  /**
   * Guard — call before making an AI request.
   * Throws `CircuitBreakerOpenError` if the circuit is OPEN and cooldown hasn't elapsed.
   * In HALF_OPEN state, allows exactly one request through as a test.
   */
  guard(): void {
    const now = Date.now();

    if (this.state === "CLOSED") {
      // Check if old failures have expired (outside the failure window)
      if (this.lastFailureAt && now - this.lastFailureAt > FAILURE_WINDOW_MS) {
        this.consecutiveFailures = 0;
      }
      return; // allow request
    }

    if (this.state === "OPEN") {
      const elapsed = now - (this.openedAt || 0);
      if (elapsed >= COOLDOWN_MS) {
        // Transition to HALF_OPEN — allow one test request
        this.state = "HALF_OPEN";
        logger.info("[AI_CIRCUIT_BREAKER] HALF_OPEN — testing with one request");
        return; // allow the test request
      }

      // Still in cooldown — reject
      const retryAfterMs = COOLDOWN_MS - elapsed;
      throw new CircuitBreakerOpenError(retryAfterMs);
    }

    // HALF_OPEN — allow the test request (already transitioned above)
    return;
  }

  /**
   * Record a successful AI call — resets the circuit to CLOSED.
   */
  recordSuccess(): void {
    const wasOpen = this.state !== "CLOSED";
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.lastSuccessAt = Date.now();

    if (wasOpen) {
      logger.info("[AI_CIRCUIT_BREAKER] CLOSED — service recovered", {
        totalTrips: this.totalTrips,
      });
    }
  }

  /**
   * Record a failed AI call.
   * If failures exceed threshold, trips the circuit to OPEN.
   */
  recordFailure(error?: unknown): void {
    const now = Date.now();
    this.consecutiveFailures++;
    this.lastFailureAt = now;

    // Only count failures within the window
    if (this.consecutiveFailures >= FAILURE_THRESHOLD && this.state === "CLOSED") {
      this.state = "OPEN";
      this.openedAt = now;
      this.totalTrips++;
      logger.error("[AI_CIRCUIT_BREAKER] OPEN — tripped after consecutive failures", {
        consecutiveFailures: this.consecutiveFailures,
        totalTrips: this.totalTrips,
        lastError: error instanceof Error ? error.message : String(error),
      });
    }

    // If we were HALF_OPEN and the test request failed, go back to OPEN
    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.openedAt = now;
      logger.warn("[AI_CIRCUIT_BREAKER] OPEN — test request failed, re-tripping", {
        totalTrips: this.totalTrips,
      });
    }
  }

  /**
   * Get current circuit breaker status — for health endpoints.
   */
  getState(): CircuitBreakerStatus {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      openedAt: this.openedAt,
      totalTrips: this.totalTrips,
      config: {
        failureThreshold: FAILURE_THRESHOLD,
        cooldownMs: COOLDOWN_MS,
        failureWindowMs: FAILURE_WINDOW_MS,
      },
    };
  }

  /**
   * Force reset — for admin/testing purposes.
   */
  reset(): void {
    this.state = "CLOSED";
    this.consecutiveFailures = 0;
    this.openedAt = null;
    logger.info("[AI_CIRCUIT_BREAKER] Force reset to CLOSED");
  }
}

// ── Singleton Export ─────────────────────────────────────────────────────────

export const aiCircuitBreaker = new CircuitBreaker();
