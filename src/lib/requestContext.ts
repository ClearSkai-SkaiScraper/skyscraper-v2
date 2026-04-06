/**
 * ============================================================================
 * Request Context — Correlation ID propagation for API routes
 * ============================================================================
 *
 * Extracts the x-request-id header set by middleware and wires it into
 * the logger's context so every log line in the request carries the same ID.
 *
 * Usage in API routes:
 *   import { withRequestContext } from "@/lib/requestContext";
 *   // call early in the handler:
 *   const requestId = await withRequestContext();
 */

import { headers } from "next/headers";

import { logger } from "@/lib/logger";

/**
 * Read the correlation ID from the incoming request and set it on the logger.
 * Returns the requestId for use in response payloads or downstream calls.
 */
export async function withRequestContext(): Promise<string> {
  const headersList = await headers();
  const requestId = headersList.get("x-request-id") ?? "unknown";
  logger.setContext({ requestId });
  return requestId;
}

/**
 * Synchronous version for use in contexts where headers() is already resolved.
 */
export function setRequestContext(requestId: string): void {
  logger.setContext({ requestId });
}
