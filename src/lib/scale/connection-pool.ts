/**
 * Prisma Connection Pool Enforcement
 *
 * Validates that the DATABASE_URL has proper PgBouncer + connection_limit
 * params for enterprise-scale serverless deployment.
 *
 * Run at app startup to surface config issues early.
 *
 * Required URL format:
 *   postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=10&pool_timeout=20
 */

import { logger } from "@/lib/logger";
import { DB_SCALE } from "@/lib/scale/config";

export interface PoolValidationResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
  parsed: {
    pgbouncer: boolean;
    connectionLimit: number | null;
    poolTimeout: number | null;
    port: number | null;
  };
}

/**
 * Validate DATABASE_URL has proper connection pool parameters.
 * Call at app startup or in health checks.
 */
export function validateConnectionPool(): PoolValidationResult {
  const result: PoolValidationResult = {
    ok: true,
    warnings: [],
    errors: [],
    parsed: {
      pgbouncer: false,
      connectionLimit: null,
      poolTimeout: null,
      port: null,
    },
  };

  // eslint-disable-next-line no-restricted-syntax
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    result.ok = false;
    result.errors.push("DATABASE_URL is not set");
    return result;
  }

  try {
    const url = new URL(dbUrl);
    const params = url.searchParams;

    // Port — should be 6543 for PgBouncer (Supabase)
    result.parsed.port = parseInt(url.port || "5432", 10);
    if (result.parsed.port === 5432) {
      result.warnings.push(
        "DATABASE_URL uses port 5432 (direct). Use port 6543 for PgBouncer in production."
      );
    }

    // pgbouncer flag
    result.parsed.pgbouncer = params.get("pgbouncer") === "true";
    // eslint-disable-next-line no-restricted-syntax
    if (!result.parsed.pgbouncer && process.env.NODE_ENV === "production") {
      result.warnings.push(
        "DATABASE_URL missing ?pgbouncer=true — required for serverless connection pooling."
      );
    }

    // connection_limit
    const connLimit = params.get("connection_limit");
    if (connLimit) {
      result.parsed.connectionLimit = parseInt(connLimit, 10);
      if (result.parsed.connectionLimit > DB_SCALE.CONNECTION_LIMIT) {
        result.warnings.push(
          `connection_limit=${result.parsed.connectionLimit} exceeds recommended ${DB_SCALE.CONNECTION_LIMIT}. ` +
            `High limits on serverless can exhaust Supabase connections (max ${1500}).`
        );
      }
    // eslint-disable-next-line no-restricted-syntax
    } else if (process.env.NODE_ENV === "production") {
      result.warnings.push(
        `DATABASE_URL missing ?connection_limit=${DB_SCALE.CONNECTION_LIMIT} — ` +
          `Prisma defaults to 5; add explicit limit for predictable scaling.`
      );
    }

    // pool_timeout
    const poolTimeout = params.get("pool_timeout");
    if (poolTimeout) {
      result.parsed.poolTimeout = parseInt(poolTimeout, 10);
    // eslint-disable-next-line no-restricted-syntax
    } else if (process.env.NODE_ENV === "production") {
      result.warnings.push(
        `DATABASE_URL missing ?pool_timeout=${DB_SCALE.POOL_TIMEOUT} — ` +
          `add explicit timeout to prevent hung connections.`
      );
    }

    // DIRECT_DATABASE_URL check
    // eslint-disable-next-line no-restricted-syntax
    if (!process.env.DIRECT_DATABASE_URL) {
      result.warnings.push(
        "DIRECT_DATABASE_URL not set — required for Prisma migrations (bypasses PgBouncer)."
      );
    }

    // Overall OK if no errors and production has pgbouncer
    if (result.errors.length > 0) {
      result.ok = false;
    }
  } catch {
    result.ok = false;
    result.errors.push("DATABASE_URL is not a valid URL");
  }

  return result;
}

/**
 * Log connection pool status at startup.
 * Safe to call from instrumentation.ts or health endpoints.
 */
export function logPoolStatus(): void {
  const v = validateConnectionPool();

  if (v.ok && v.warnings.length === 0) {
    logger.info("[DB_POOL] ✅ Connection pool properly configured", v.parsed);
    return;
  }

  for (const w of v.warnings) {
    logger.warn(`[DB_POOL] ⚠️  ${w}`);
  }
  for (const e of v.errors) {
    logger.error(`[DB_POOL] ❌ ${e}`);
  }

  logger.info("[DB_POOL] Parsed config:", v.parsed);
}
