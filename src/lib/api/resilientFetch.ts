/**
 * Resilient API Client — Retry, Timeout, Exponential Backoff
 *
 * Wraps fetch() with production-grade resilience:
 * - Automatic retry with exponential backoff + jitter
 * - Request timeouts
 * - Network error detection
 * - Session expiry detection (401 → redirect to login)
 * - Structured error responses
 *
 * Usage:
 *   import { api } from "@/lib/api/resilientFetch";
 *   const data = await api.get("/api/claims");
 *   const result = await api.post("/api/claims", { body: claimData });
 */

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeout?: number; // ms, default 30000
  retries?: number; // default 3
  retryDelay?: number; // base delay ms, default 1000
  onRetry?: (attempt: number, error: Error) => void;
  skipAuth?: boolean;
  /**
   * Opt-in: allow retrying POST/PUT/PATCH/DELETE on transient errors.
   * ⚠️  Only enable when the endpoint is idempotent (e.g., uses idempotency keys).
   * By default, only GET/HEAD/OPTIONS are auto-retried to prevent duplicate mutations.
   */
  retryMutations?: boolean;
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(baseMs: number): number {
  // Add ±25% random jitter to prevent thundering herd
  return baseMs * (0.75 + Math.random() * 0.5);
}

function isRetryable(status: number): boolean {
  // Retry on server errors and rate limits, NOT on auth/validation errors
  return status === 429 || status === 502 || status === 503 || status === 504 || status === 0;
}

/** Methods that are safe to retry — they don't create side effects */
const SAFE_RETRY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isSafeToRetry(method?: string): boolean {
  return SAFE_RETRY_METHODS.has((method || "GET").toUpperCase());
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true; // fetch() network failures
  if (error instanceof DOMException && error.name === "AbortError") return false; // Intentional abort
  return false;
}

// ─── Session Expiry Detection ───────────────────────────────────────────────

let sessionExpiredHandler: (() => void) | null = null;

/**
 * Register a handler for session expiry (401 responses).
 * Typically called once in a layout/provider component.
 */
export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler;
}

function handleSessionExpiry() {
  if (sessionExpiredHandler) {
    sessionExpiredHandler();
  } else if (typeof window !== "undefined") {
    // Default: redirect to login with return URL
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/sign-in?redirect_url=${returnUrl}`;
  }
}

// ─── Core Fetch ─────────────────────────────────────────────────────────────

async function resilientFetch<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
    onRetry,
    body,
    skipAuth,
    retryMutations = false,
    ...fetchOptions
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  const config: RequestInit = {
    ...fetchOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Session expired — redirect to login
      if (response.status === 401 && !skipAuth) {
        handleSessionExpiry();
        return { ok: false, error: "Session expired", status: 401 };
      }

      // Parse response
      let data: T | undefined;
      try {
        data = await response.json();
      } catch {
        // Non-JSON response (e.g., 204 No Content)
      }

      // Success
      if (response.ok) {
        return { ok: true, data, status: response.status };
      }

      // Non-retryable error — return immediately
      if (!isRetryable(response.status)) {
        return {
          ok: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          error: (data as any)?.error || response.statusText || "Request failed",
          data,
          status: response.status,
        };
      }

      // Retryable error — continue to retry logic
      lastError = new ApiError(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any)?.error || `HTTP ${response.status}`,
        response.status,
        data
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new Error(`Request timeout after ${timeout}ms`);
      } else if (isNetworkError(error)) {
        lastError = new Error("Network error — please check your connection");
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    // ── Mutation Safety Guard ──────────────────────────────────────────────
    // Only auto-retry safe (idempotent) methods unless caller opts in.
    // POST/PUT/PATCH/DELETE could create duplicates if retried blindly.
    if (!isSafeToRetry(config.method) && !retryMutations) {
      break; // Don't retry mutations — fall through to exhausted return
    }

    // Retry with exponential backoff + jitter
    if (attempt < retries) {
      const delay = jitter(retryDelay * Math.pow(2, attempt));
      onRetry?.(attempt + 1, lastError!);
      await sleep(delay);
    }
  }

  // All retries exhausted
  return {
    ok: false,
    error: lastError?.message || "Request failed after retries",
    status: 0,
  };
}

// ─── Convenience Methods ────────────────────────────────────────────────────

export const api = {
  get: <T = unknown>(url: string, options?: FetchOptions) =>
    resilientFetch<T>(url, { ...options, method: "GET" }),

  post: <T = unknown>(url: string, options?: FetchOptions) =>
    resilientFetch<T>(url, { ...options, method: "POST" }),

  put: <T = unknown>(url: string, options?: FetchOptions) =>
    resilientFetch<T>(url, { ...options, method: "PUT" }),

  patch: <T = unknown>(url: string, options?: FetchOptions) =>
    resilientFetch<T>(url, { ...options, method: "PATCH" }),

  delete: <T = unknown>(url: string, options?: FetchOptions) =>
    resilientFetch<T>(url, { ...options, method: "DELETE" }),
};

export { ApiError, resilientFetch };
export type { ApiResponse, FetchOptions };
