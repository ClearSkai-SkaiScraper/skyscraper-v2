/* eslint-disable no-restricted-syntax */
// src/lib/prisma.ts
// CANONICAL PRISMA SINGLETON — SINGLE SOURCE OF TRUTH
//
// ⚠️  CRITICAL: The singleton MUST be cached on `globalThis` in ALL
//    environments, including production.  Vercel Serverless reuses the
//    same Node process across many warm invocations.  Without the cache,
//    every invocation creates a **new** PrismaClient, opens fresh DB
//    connections, and never releases them → "Too many database connections
//    opened: FATAL: remaining connection slots reserved for superuser".
//
//    Fix applied 2025-06: Always assign to globalThis.__prisma.

import { PrismaClient } from "@prisma/client";

import { logger } from "@/lib/logger";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __prismaShutdownRegistered: boolean | undefined;
}

/**
 * Connection pool settings for 10,000-user enterprise scale:
 *
 * Prisma connection pool limits (per instance):
 *   - connection_limit ➜ set via DATABASE_URL query param
 *   - pool_timeout     ➜ set via DATABASE_URL query param
 *
 * Recommended DATABASE_URL for Supabase PgBouncer (port 6543):
 *   ?pgbouncer=true&connection_limit=5&pool_timeout=20
 *
 * Recommended DIRECT_DATABASE_URL (port 5432, no PgBouncer):
 *   Used for migrations only (prisma migrate / db push)
 *
 * At scale with Vercel Serverless (~50 concurrent functions):
 *   Each function has its own pool of up to `connection_limit` connections.
 *   Total DB connections = concurrent_functions × connection_limit.
 *   PgBouncer's transaction-mode pooling prevents exhaustion.
 *
 * Safety limits are enforced in the query engine via datasource URL params.
 * Additional in-app safeguards are handled by this module.
 */

const LOG_LEVELS =
  process.env.NODE_ENV === "development"
    ? (["query", "warn", "error"] as const)
    : (["error"] as const);

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: [...LOG_LEVELS],
    // Prisma engine-level timeout for unresponsive queries (ms)
    // This catches runaway queries that hold connections
    transactionOptions: {
      maxWait: 10_000, // max time (ms) to wait for a transaction slot
      timeout: 30_000, // max time (ms) a transaction can run
    },
  });

  return client;
}

// ── Singleton: reuse across ALL warm invocations ────────────────────
const prismaClient = globalThis.__prisma ?? createPrismaClient();

// Cache in EVERY environment (dev, preview, AND production)
globalThis.__prisma = prismaClient;

// ── Graceful shutdown: release connections on process exit ──────────
// Prevents "Too many connections" on hot-reload (dev) and process recycling.
if (typeof process !== "undefined") {
  const shutdown = async () => {
    try {
      await prismaClient.$disconnect();
    } catch {
      // Swallow — process is exiting anyway
    }
  };

  // Only register once per process (guard against HMR re-registration)
  if (!globalThis.__prismaShutdownRegistered) {
    process.on("beforeExit", shutdown);
    process.on("SIGINT", () => shutdown().then(() => process.exit(0)));
    process.on("SIGTERM", () => shutdown().then(() => process.exit(0)));
    globalThis.__prismaShutdownRegistered = true;
  }
}

/**
 * Warm-up helper: call once per cold start (e.g. in health checks)
 * to eagerly establish the DB connection rather than waiting for
 * the first query to fail.
 */
export async function ensurePrismaConnection(): Promise<boolean> {
  try {
    await prismaClient.$connect();
    return true;
  } catch (err) {
    logger.error("[PRISMA] Connection warmup failed", { error: err });
    // Attempt to disconnect and reconnect once
    try {
      await prismaClient.$disconnect();
      await prismaClient.$connect();
      return true;
    } catch {
      return false;
    }
  }
}

export default prismaClient;
