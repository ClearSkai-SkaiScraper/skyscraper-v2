/**
 * Vitest Global Setup — Session 8
 *
 * Provides global mocks for Clerk auth, Prisma, and Next.js
 * so individual test files don't need to set up boilerplate.
 */

import { vi } from "vitest";

// ── Mock environment variables ─────────────────────────────────────
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_mock";
process.env.CLERK_SECRET_KEY = "sk_test_mock";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
process.env.RESEND_API_KEY = "re_test_mock";
process.env.OPENAI_API_KEY = "sk-test-mock";

// ── Mock next/server ─────────────────────────────────────────────────
vi.mock("next/server", () => {
  class MockNextRequest {
    url: string;
    method: string;
    headers: Map<string, string>;
    nextUrl: URL;
    constructor(input: string | URL, init?: { headers?: Record<string, string>; method?: string }) {
      const url = typeof input === "string" ? input : input.toString();
      this.url = url;
      this.method = init?.method || "GET";
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.nextUrl = new URL(url);
    }
    json() {
      return Promise.resolve({});
    }
    text() {
      return Promise.resolve("");
    }
  }
  class MockNextResponse {
    status: number;
    body: unknown;
    _headers: Map<string, string>;
    _jsonData: unknown;
    constructor(body?: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status || 200;
      this._headers = new Map(Object.entries(init?.headers || {}));
      this._jsonData = null;
      // Try to parse body as JSON for .json() method
      if (typeof body === "string") {
        try {
          this._jsonData = JSON.parse(body);
        } catch {
          /* not JSON */
        }
      }
    }
    /** Instance .json() — mirrors the real Response.json() API */
    async json() {
      if (this._jsonData !== null) return this._jsonData;
      if (typeof this.body === "string") return JSON.parse(this.body);
      return this.body;
    }
    /** Instance .text() — mirrors the real Response.text() API */
    async text() {
      if (typeof this.body === "string") return this.body;
      return JSON.stringify(this.body);
    }
    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      const resp = new MockNextResponse(JSON.stringify(data), init);
      resp._jsonData = data;
      return resp;
    }
    static redirect(url: string | URL, status?: number) {
      return new MockNextResponse(null, { status: status || 307 });
    }
    static next() {
      return new MockNextResponse(null, { status: 200 });
    }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

// ── Mock next/navigation ────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// ── Mock next/headers ───────────────────────────────────────────────
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Map()),
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

// ── Mock @/lib/logger ───────────────────────────────────────────────
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    setContext: vi.fn(),
    timer: vi.fn(() => ({ end: vi.fn() })),
  },
}));

// ── Mock @/lib/observability/logger (alternate import path) ─────────
vi.mock("@/lib/observability/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    setContext: vi.fn(),
    timer: vi.fn(() => ({ end: vi.fn() })),
  },
}));

// ── Mock @sentry/nextjs ─────────────────────────────────────────────
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  addBreadcrumb: vi.fn(),
  withScope: vi.fn((cb) => cb({ setTag: vi.fn(), setExtra: vi.fn() })),
  startSpan: vi.fn((_opts, cb) => cb({})),
}));
