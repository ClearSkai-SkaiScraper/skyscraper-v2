/**
 * RC-2 Role Matrix — Playwright smoke skeleton.
 *
 * Fill in real credentials via env vars before running:
 *   TEST_UNAUTH_URL, TEST_VIEWER_EMAIL, TEST_VIEWER_PASSWORD
 *   TEST_MEMBER_EMAIL, TEST_MEMBER_PASSWORD
 *   TEST_MANAGER_EMAIL, TEST_MANAGER_PASSWORD
 *   TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 *   TEST_OWNER_EMAIL, TEST_OWNER_PASSWORD
 *   TEST_CROSSORG_EMAIL, TEST_CROSSORG_PASSWORD
 *
 * Run:  pnpm playwright test tests/e2e/rbac-matrix.spec.ts
 */

import { expect, test } from "@playwright/test";

type Actor = "unauth" | "viewer" | "member" | "manager" | "admin" | "owner" | "crossorg";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

/** Expected HTTP status per actor per protected endpoint. */
interface Case {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  expect: Record<Actor, number | number[]>;
  note?: string;
}

const CASES: Case[] = [
  {
    endpoint: "/api/finance/overview",
    method: "GET",
    expect: {
      unauth: 401,
      viewer: 403,
      member: 403,
      manager: 403,
      admin: 200,
      owner: 200,
      crossorg: 403,
    },
  },
  {
    endpoint: "/api/trades/company/seats/invite",
    method: "POST",
    expect: {
      unauth: 401,
      viewer: 403,
      member: 403,
      manager: 403,
      admin: [200, 400],
      owner: [200, 400],
      crossorg: 403,
    },
    note: "400 acceptable when payload is empty",
  },
  {
    endpoint: "/api/trades/company/employees",
    method: "GET",
    expect: {
      unauth: 401,
      viewer: 200,
      member: 200,
      manager: 200,
      admin: 200,
      owner: 200,
      crossorg: 200,
    },
    note: "GET is not admin-only; scoping must still isolate data — assert body",
  },
  {
    endpoint: "/api/rbac/me",
    method: "GET",
    expect: {
      unauth: 401,
      viewer: 200,
      member: 200,
      manager: 200,
      admin: 200,
      owner: 200,
      crossorg: 200,
    },
  },
  {
    endpoint: "/api/notifications/mark-all-read",
    method: "POST",
    expect: {
      unauth: 401,
      viewer: 200,
      member: 200,
      manager: 200,
      admin: 200,
      owner: 200,
      crossorg: 200,
    },
    note: "Must only clear own-org notifications — separate assertion",
  },
];

async function authCookie(_actor: Actor): Promise<string | null> {
  // TODO: wire Clerk test-mode session-cookie generation.
  // For now this test is a scaffold.
  return null;
}

for (const c of CASES) {
  for (const actor of Object.keys(c.expect) as Actor[]) {
    test(`[${actor}] ${c.method} ${c.endpoint}`, async ({ request }) => {
      const cookie = await authCookie(actor);
      const res = await request.fetch(`${BASE}${c.endpoint}`, {
        method: c.method,
        headers: cookie ? { Cookie: cookie } : undefined,
      });
      const expected = c.expect[actor];
      const allowed = Array.isArray(expected) ? expected : [expected];
      expect(allowed, `${actor} ${c.method} ${c.endpoint} returned ${res.status()}`).toContain(
        res.status()
      );
    });
  }
}
