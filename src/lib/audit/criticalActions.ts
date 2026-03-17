/**
 * Critical Action Audit Logger
 *
 * Lightweight logging for the most important platform actions.
 * Per AI advisor: "Not huge verbose logs — just enough to answer 'what actually happened?'"
 *
 * Usage:
 *   await logCriticalAction("INVITE_SENT", userId, orgId, { email: inviteeEmail });
 */

import { createId } from "@paralleldrive/cuid2";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type CriticalActionType =
  | "INVITE_SENT"
  | "INVITE_ACCEPTED"
  | "ORG_SELECTED"
  | "ORG_CREATED"
  | "WEATHER_REPORT_REQUESTED"
  | "WEATHER_VERIFICATION_GENERATED"
  | "CARRIER_INTELLIGENCE_GENERATED"
  | "SETTINGS_UPDATED"
  | "BRANDING_UPDATED"
  | "CLAIM_CREATED"
  | "CLAIM_ARCHIVED"
  | "LEAD_CREATED"
  | "LEAD_ARCHIVED"
  | "REPORT_GENERATED"
  | "PDF_DOWNLOADED"
  | "USER_REPAIRED"
  | "MEMBERSHIP_CLEARED"
  | "ACTIVE_ORG_CLEARED";

interface AuditMeta {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Log a critical platform action for audit trail
 */
export async function logCriticalAction(
  action: CriticalActionType,
  userId: string,
  orgId: string | null,
  meta?: AuditMeta
): Promise<void> {
  const timestamp = new Date().toISOString();

  // Always log to structured logger
  logger.info(`[AUDIT:${action}]`, {
    userId,
    orgId,
    timestamp,
    ...meta,
  });

  // Write to database for persistence (using audit_logs table schema)
  try {
    await prisma.audit_logs.create({
      data: {
        id: createId(),
        org_id: orgId || "SYSTEM",
        user_id: userId,
        user_name: (meta?.userName as string) || "system",
        action,
        event_type: "CRITICAL_ACTION",
        metadata: meta ? JSON.parse(JSON.stringify(meta)) : undefined,
        created_at: new Date(),
      },
    });
  } catch (err) {
    // Don't fail the main operation if audit logging fails
    logger.warn("[AUDIT] Failed to write audit log to DB:", err);
  }
}

/**
 * Get recent critical actions for an org (for admin dashboard)
 */
export async function getRecentCriticalActions(
  orgId: string,
  limit = 50
): Promise<
  Array<{
    action: string;
    userId: string;
    createdAt: Date;
    metadata: unknown;
  }>
> {
  try {
    const logs = await prisma.audit_logs.findMany({
      where: {
        org_id: orgId,
        event_type: "CRITICAL_ACTION",
      },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        action: true,
        user_id: true,
        created_at: true,
        metadata: true,
      },
    });
    return logs.map((log) => ({
      action: log.action,
      userId: log.user_id,
      createdAt: log.created_at,
      metadata: log.metadata,
    }));
  } catch (err) {
    logger.error("[AUDIT] Failed to fetch critical actions:", err);
    return [];
  }
}

/**
 * Get user's recent actions (for debugging user state)
 */
export async function getUserRecentActions(
  userId: string,
  limit = 20
): Promise<
  Array<{
    action: string;
    orgId: string;
    createdAt: Date;
    metadata: unknown;
  }>
> {
  try {
    const logs = await prisma.audit_logs.findMany({
      where: {
        user_id: userId,
        event_type: "CRITICAL_ACTION",
      },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        action: true,
        org_id: true,
        created_at: true,
        metadata: true,
      },
    });
    return logs.map((log) => ({
      action: log.action,
      orgId: log.org_id,
      createdAt: log.created_at,
      metadata: log.metadata,
    }));
  } catch (err) {
    logger.error("[AUDIT] Failed to fetch user actions:", err);
    return [];
  }
}
