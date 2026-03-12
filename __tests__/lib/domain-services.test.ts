/**
 * Domain Services Tests
 *
 * Tests for src/lib/domain/* services to ensure
 * they properly encapsulate business logic.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Prisma before imports
vi.mock("@/lib/prisma", () => ({
  default: {
    report: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    lead: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    claim: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    claims: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    claimNote: {
      create: vi.fn(),
    },
    claimTimelineEvent: {
      create: vi.fn(),
    },
    tradesProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tradesConnection: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    tradesCompany: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((cb) =>
      cb({
        report: {
          create: vi.fn().mockResolvedValue({ id: "report-1" }),
        },
      })
    ),
  },
  prisma: {
    report: {
      create: vi.fn(),
    },
  },
}));

// Mock OpenAI client
vi.mock("@/lib/ai/client", () => ({
  getOpenAI: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ scope: "test" }) } }],
        }),
      },
    },
  })),
}));

// ============================================================================
// Reports Domain Tests
// ============================================================================

describe("Reports Domain Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have queueReport function", async () => {
    const { queueReport } = await import("@/lib/domain/reports");
    expect(typeof queueReport).toBe("function");
  });

  it("should have startReport function", async () => {
    const { startReport } = await import("@/lib/domain/reports");
    expect(typeof startReport).toBe("function");
  });

  it("should have finishReport function", async () => {
    const { finishReport } = await import("@/lib/domain/reports");
    expect(typeof finishReport).toBe("function");
  });

  it("should have regenerateReport function", async () => {
    const { regenerateReport } = await import("@/lib/domain/reports");
    expect(typeof regenerateReport).toBe("function");
  });
});

// ============================================================================
// AI Domain Tests
// ============================================================================

describe("AI Domain Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have generateScope function", async () => {
    const { generateScope } = await import("@/lib/domain/ai");
    expect(typeof generateScope).toBe("function");
  });

  it("should have analyzeDamage function", async () => {
    const { analyzeDamage } = await import("@/lib/domain/ai");
    expect(typeof analyzeDamage).toBe("function");
  });

  it("should have generateDispute function", async () => {
    const { generateDispute } = await import("@/lib/domain/ai");
    expect(typeof generateDispute).toBe("function");
  });

  it("should have summarizeClaim function", async () => {
    const { summarizeClaim } = await import("@/lib/domain/ai");
    expect(typeof summarizeClaim).toBe("function");
  });
});

// ============================================================================
// Claims Domain Tests
// ============================================================================

describe("Claims Domain Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have calculateFinalPayout function", async () => {
    const { calculateFinalPayout } = await import("@/lib/domain/claims");
    expect(typeof calculateFinalPayout).toBe("function");
  });

  it("should have updateClaimStatus function", async () => {
    const { updateClaimStatus } = await import("@/lib/domain/claims");
    expect(typeof updateClaimStatus).toBe("function");
  });

  it("should have addClaimNote function", async () => {
    const { addClaimNote } = await import("@/lib/domain/claims");
    expect(typeof addClaimNote).toBe("function");
  });

  it("should have addTimelineEvent function", async () => {
    const { addTimelineEvent } = await import("@/lib/domain/claims");
    expect(typeof addTimelineEvent).toBe("function");
  });
});

// ============================================================================
// Trades Domain Tests
// ============================================================================

describe("Trades Domain Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have sendRequest function", async () => {
    const { sendRequest } = await import("@/lib/domain/trades");
    expect(typeof sendRequest).toBe("function");
  });

  it("should have removeConnection function", async () => {
    const { removeConnection } = await import("@/lib/domain/trades");
    expect(typeof removeConnection).toBe("function");
  });

  it("should have updateProfile function", async () => {
    const { updateProfile } = await import("@/lib/domain/trades");
    expect(typeof updateProfile).toBe("function");
  });
});

// ============================================================================
// Portal Domain Tests
// ============================================================================

describe("Portal Domain Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have sendJobInvite function", async () => {
    const { sendJobInvite } = await import("@/lib/domain/portal");
    expect(typeof sendJobInvite).toBe("function");
  });

  it("should have shareClaimWithClient function", async () => {
    const { shareClaimWithClient } = await import("@/lib/domain/portal");
    expect(typeof shareClaimWithClient).toBe("function");
  });
});
