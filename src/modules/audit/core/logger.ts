// This is a safe stub for a feature that has been temporarily disabled
// due to its backing database model not being present in the current schema.
// All functions are no-ops or return empty/default values to prevent
// breaking changes in other parts of the application that import this module.

export type AuditAction =
  | "AI_RUN"
  | "AI_APPROVE"
  | "AI_REJECT"
  | "EXPORT_START"
  | "EXPORT_COMPLETE"
  | "EXPORT_FAILED"
  | "DEPRECIATION_FILED"
  | "FUNDING_ADD"
  | "DOC_INGEST"
  | "DOC_PARSE"
  | "DOCUMENT_RE_PARSE"
  | "DOCUMENT_RE_OCR"
  | "LENDER_ENDORSEMENT"
  | "ACH_IMPORT"
  | "TEMPLATE_SAVE"
  | "TEMPLATE_APPLY"
  | "TEMPLATE_DELETE"
  | "LOGIN"
  | "CARRIER_PRESET_APPLY"
  | "CARRIER_DEPRECIATION_SET";

export interface LogActionParams {
  orgId: string;
  userId: string;
  userName?: string;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  jobId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

/**
 * Log audit event
 */
export async function logAction(_params: LogActionParams): Promise<void> {
  // Feature disabled. Intentionally no-op.
  return;
}

/**
 * Get audit logs for a job
 */
export async function getJobAuditLogs(_jobId: string) {
  // Feature disabled.
  return [];
}

/**
 * Get audit logs for an org
 */
export async function getAuditLogs(_orgId: string, _limit = 100) {
  // Feature disabled.
  return [];
}

/**
 * Get recent activity summary
 */
export async function getRecentActivity(_orgId: string, _days = 7) {
  // Feature disabled.
  return [];
}
