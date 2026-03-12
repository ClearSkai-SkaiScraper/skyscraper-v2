/**
 * Mock Prisma helper (Sprint 7 — Test Infrastructure)
 *
 * Creates a fully-typed mock Prisma client using vitest.
 * Every model delegate gets auto-mocked CRUD methods.
 */

import { vi } from "vitest";

// ── CRUD method stubs every model delegate should have ──────────────
const CRUD_METHODS = [
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
] as const;

function createModelMock() {
  const model: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of CRUD_METHODS) {
    model[method] = vi.fn().mockResolvedValue(null);
  }
  return model;
}

// ── Known model names (add more as needed) ──────────────────────────
const MODEL_NAMES = [
  "organization",
  "user",
  "claim",
  "claimPhoto",
  "report",
  "invoice",
  "invoiceLineItem",
  "contact",
  "lead",
  "project",
  "projectActivity",
  "appointment",
  "message",
  "messageThread",
  "notification",
  "feedback",
  "pipeline",
  "pipelineStage",
  "branding",
  "brandingUpload",
  "subscription",
  "tokenTransaction",
  "tokenBalance",
  "trade",
  "tradeCompany",
  "tradeService",
  "tradeMember",
  "vendor",
  "weatherReport",
  "aiArtifact",
  "onboardingProgress",
] as const;

/**
 * Create a mock PrismaClient.
 *
 * ```ts
 * import { createMockPrisma } from "@/tests/helpers/mockPrisma";
 * const prisma = createMockPrisma();
 * prisma.claim.findMany.mockResolvedValue([fakeClaim]);
 * ```
 */
export function createMockPrisma() {
  const prisma: Record<string, unknown> = {};

  for (const model of MODEL_NAMES) {
    prisma[model] = createModelMock();
  }

  // $transaction: run array of promises or callback
  prisma.$transaction = vi.fn().mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    if (typeof arg === "function") return (arg as (tx: typeof prisma) => unknown)(prisma);
    return null;
  });

  prisma.$connect = vi.fn().mockResolvedValue(undefined);
  prisma.$disconnect = vi.fn().mockResolvedValue(undefined);
  prisma.$queryRaw = vi.fn().mockResolvedValue([]);
  prisma.$executeRaw = vi.fn().mockResolvedValue(0);

  return prisma as Record<string, any>;
}

/**
 * Wire up the mock so `import { prisma } from "@/lib/db"` resolves to it.
 * Call in `beforeEach`.
 */
export function mockPrismaModule(mockPrisma?: ReturnType<typeof createMockPrisma>) {
  const p = mockPrisma ?? createMockPrisma();

  vi.mock("@/lib/db", () => ({
    prisma: p,
    default: p,
  }));

  return p;
}
