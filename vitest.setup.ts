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
