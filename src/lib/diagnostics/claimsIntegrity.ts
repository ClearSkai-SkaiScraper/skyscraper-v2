/**
 * Claims Integrity Logger
 *
 * Use this to debug "where are my claims?" issues.
 * Logs org context + DB host + claims count to server console.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface ClaimsIntegrityLog {
  orgId: string;
  dbHost: string;
  claimsCount: number;
  source: string;
  timestamp: string;
}

/**
 * Log claims integrity diagnostic info to server console
 *
 * @param orgId - The organization ID
 * @param source - Where this is being called from (e.g., "ClaimsPage", "Dashboard")
 */
export async function logClaimsIntegrity(
  orgId: string,
  source: string
): Promise<ClaimsIntegrityLog> {
  // Get DB host
  let dbHost = "unknown";
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const url = new URL(dbUrl);
      dbHost = url.host;
    }
  } catch {
    dbHost = "invalid_url";
  }

  // Get claims count
  let claimsCount = 0;
  try {
    claimsCount = await prisma.claims.count({
      where: { orgId },
    });
  } catch (error) {
    logger.error("[CLAIMS_DIAG] Failed to count claims:", error);
  }

  const log: ClaimsIntegrityLog = {
    orgId,
    dbHost,
    claimsCount,
    source,
    timestamp: new Date().toISOString(),
  };

  logger.warn(
    `[CLAIMS_DIAG] ${source} | OrgId: ${orgId} | DB: ${dbHost} | Claims: ${claimsCount} | Time: ${log.timestamp}`
  );

  return log;
}
