/**
 * Test Org factory (Sprint 7 — Test Infrastructure)
 *
 * Builds realistic org / user / claim test fixtures with sensible
 * defaults that can be partially overridden.
 */

// ── Org ─────────────────────────────────────────────────────────────
export interface TestOrg {
  id: string;
  name: string;
  slug: string;
  clerkOrgId: string;
  plan: "free" | "solo" | "business" | "enterprise";
  stripeCustomerId: string | null;
  createdAt: Date;
}

let orgCounter = 0;

export function createTestOrg(overrides: Partial<TestOrg> = {}): TestOrg {
  orgCounter++;
  return {
    id: `org_${orgCounter}_${Date.now()}`,
    name: `Test Org ${orgCounter}`,
    slug: `test-org-${orgCounter}`,
    clerkOrgId: `org_clerk_${orgCounter}`,
    plan: "solo",
    stripeCustomerId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ── User ────────────────────────────────────────────────────────────
export interface TestUser {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  orgId: string;
  role: "admin" | "member" | "viewer";
  createdAt: Date;
}

let userCounter = 0;

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  userCounter++;
  return {
    id: `user_${userCounter}_${Date.now()}`,
    clerkUserId: `user_clerk_${userCounter}`,
    email: `user${userCounter}@test.com`,
    firstName: "Test",
    lastName: `User${userCounter}`,
    orgId: `org_1`,
    role: "admin",
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Claim ───────────────────────────────────────────────────────────
export interface TestClaim {
  id: string;
  orgId: string;
  claimNumber: string;
  homeownerName: string;
  homeownerEmail: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: "open" | "in_progress" | "closed" | "pending";
  lossDate: Date | null;
  createdAt: Date;
}

let claimCounter = 0;

export function createTestClaim(overrides: Partial<TestClaim> = {}): TestClaim {
  claimCounter++;
  return {
    id: `claim_${claimCounter}_${Date.now()}`,
    orgId: "org_1",
    claimNumber: `CLM-${String(claimCounter).padStart(5, "0")}`,
    homeownerName: `Homeowner ${claimCounter}`,
    homeownerEmail: `homeowner${claimCounter}@test.com`,
    address: `${100 + claimCounter} Test Street`,
    city: "Phoenix",
    state: "AZ",
    zip: "85001",
    status: "open",
    lossDate: new Date("2024-06-15"),
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Invoice ─────────────────────────────────────────────────────────
export interface TestInvoice {
  id: string;
  orgId: string;
  claimId: string;
  invoiceNumber: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  dueDate: Date;
  createdAt: Date;
}

let invoiceCounter = 0;

export function createTestInvoice(overrides: Partial<TestInvoice> = {}): TestInvoice {
  invoiceCounter++;
  return {
    id: `inv_${invoiceCounter}_${Date.now()}`,
    orgId: "org_1",
    claimId: "claim_1",
    invoiceNumber: `INV-${String(invoiceCounter).padStart(5, "0")}`,
    amount: 5000 + invoiceCounter * 100,
    status: "draft",
    dueDate: new Date(Date.now() + 30 * 86400 * 1000),
    createdAt: new Date(),
    ...overrides,
  };
}

// ── Next.js Request helpers ─────────────────────────────────────────
export function createMockNextRequest(
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(`http://localhost:3000${url}`, requestInit);
}

/**
 * Reset all factory counters (call in `afterEach` if needed).
 */
export function resetTestFactories() {
  orgCounter = 0;
  userCounter = 0;
  claimCounter = 0;
  invoiceCounter = 0;
}
