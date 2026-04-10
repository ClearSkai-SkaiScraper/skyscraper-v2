// This is a safe stub for a feature that has been temporarily disabled
// due to its backing database model not being present in the current schema.
// All functions are no-ops or return empty/default values to prevent
// breaking changes in other parts of the application that import this module.

export interface AuditLogEntry {
  userId: string;
  orgId: string;
  action: string;
  resource: string;
  resourceId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changes?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(_entry: AuditLogEntry): Promise<void> {
  // Feature disabled. Intentionally no-op.
  return;
}

export async function logCreate(
  _userId: string,
  _orgId: string,
  _resource: string,
  _resourceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _data: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _metadata?: Record<string, any>
): Promise<void> {
  // Feature disabled. Intentionally no-op.
  return;
}

export async function logUpdate(
  _userId: string,
  _orgId: string,
  _resource: string,
  _resourceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _before: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _after: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _metadata?: Record<string, any>
): Promise<void> {
  // Feature disabled. Intentionally no-op.
  return;
}

export async function logDelete(
  _userId: string,
  _orgId: string,
  _resource: string,
  _resourceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _data: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _metadata?: Record<string, any>
): Promise<void> {
  // Feature disabled. Intentionally no-op.
  return;
}

export async function logSensitiveAction(
  _userId: string,
  _orgId: string,
  _action: string,
  _resource: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _metadata?: Record<string, any>
): Promise<void> {
  // Feature disabled. Intentionally no-op.
  return;
}

export async function getAuditLogs(
  _orgId: string,
  _resource?: string,
  _resourceId?: string,
  _limit: number = 100
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  // Feature disabled.
  return [];
}

export async function getUserActivity(
  _userId: string,
  _orgId: string,
  _limit: number = 50
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  // Feature disabled.
  return [];
}

export async function searchAuditLogs(
  _orgId: string,
  _filters: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  },
  _limit: number = 100
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  // Feature disabled.
  return [];
}

export function withAuditLog(_resource: string) {
  return {
    onCreate: async () => {
      /* no-op */
    },
    onUpdate: async () => {
      /* no-op */
    },
    onDelete: async () => {
      /* no-op */
    },
  };
}
