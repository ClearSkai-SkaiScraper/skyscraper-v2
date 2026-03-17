/**
 * DEPRECATED: activity_events model doesn't exist in schema.
 */

export async function recordScopeEdit(params: {
  claimId: string;
  userId: string;
  before: any;
  after: any;
}) {
  // activity_events model doesn't exist in schema
  console.log(
    `[audit] Would record scope edit for claim ${params.claimId} by user ${params.userId}`
  );
}
// Client-side audit helper for Phase 5
import { logger } from "@/lib/logger";
import type { AuditAction } from "@/modules/audit/core/logger";

export interface AuditEvent {
  action: AuditAction;
  orgId: string;
  jobId: string;
  userId?: string;
  userName?: string;
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
