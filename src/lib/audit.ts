/**
 * DEPRECATED: activity_events model doesn't exist in schema.
 */

import { logger } from "@/lib/logger";
import type { AuditAction } from "@/modules/audit/core/logger";

export async function recordScopeEdit(params: {
  claimId: string;
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  before: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  after: any;
}) {
  // activity_events model doesn't exist in schema
  logger.debug(
    `[audit] Would record scope edit for claim ${params.claimId} by user ${params.userId}`
  );
}
// Client-side audit helper for Phase 5

export interface AuditEvent {
  action: AuditAction;
  orgId: string;
  jobId: string;
  userId?: string;
  userName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any>;
}

/**
 * Client-side audit event logger
 * Posts to /api/audit/log endpoint
 */
export async function audit(event: AuditEvent): Promise<void> {
  try {
    const response = await fetch("/api/audit/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      logger.warn("Audit log failed:", response.statusText);
    }
  } catch (error) {
    logger.warn("Audit log error:", error);
    // Don't throw - audit failures shouldn't break the app
  }
}
