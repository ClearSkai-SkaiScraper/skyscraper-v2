// =====================================================
// ADMIN LOGS UTILITIES
// =====================================================
// Server-side utilities for fetching audit logs, events, webhooks
// =====================================================

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function getAdminLogs(orgId: string, limit = 200) {
  // Fetch report events (always available)
  let events: any[] = [];
  try {
    events = (await prisma.$queryRaw`
      SELECT id, report_id, org_id, userId, kind, meta, ip, user_agent, created_at
      FROM report_events
      WHERE org_id = ${orgId}::uuid
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as any[];
  } catch (error) {
    logger.error("Failed to fetch report events:", error);
    events = [];
  }

  // Attempt to fetch audit logs (may not exist yet)
  let audits: any[] = [];
  try {
    audits = (await prisma.$queryRaw`
      SELECT id, org_id, userId, event, meta, created_at
      FROM audit_log
      WHERE org_id = ${orgId}::uuid
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as any[];
  } catch (error) {
    // Table doesn't exist yet, that's ok
    audits = [];
  }

  // Attempt to fetch webhook logs (may not exist yet)
  let webhooks: any[] = [];
  try {
    webhooks = (await prisma.$queryRaw`
      SELECT id, org_id, kind, status_code, payload, created_at
      FROM webhook_log
      WHERE org_id = ${orgId}::uuid
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as any[];
  } catch (error) {
    // Table doesn't exist yet, that's ok
    webhooks = [];
  }

  return {
    events,
    audits,
    webhooks,
  };
}

export async function logAuditEvent(
  orgId: string,
  userId: string,
  event: string,
  meta?: Record<string, any>
) {
  try {
    await prisma.$executeRaw`
      INSERT INTO audit_log (org_id, userId, event, meta)
      VALUES (${orgId}::uuid, ${userId}, ${event}, ${JSON.stringify(meta || {})}::jsonb)
    `;
  } catch (error) {
    logger.error("Failed to log audit event:", error);
    // Don't throw - auditing is secondary
  }
}

export async function logWebhookEvent(
  orgId: string,
  kind: string,
  statusCode: number,
  payload?: Record<string, any>
) {
  try {
    await prisma.$executeRaw`
      INSERT INTO webhook_log (org_id, kind, status_code, payload)
      VALUES (${orgId}::uuid, ${kind}, ${statusCode}, ${JSON.stringify(payload || {})}::jsonb)
    `;
  } catch (error) {
    logger.error("Failed to log webhook event:", error);
    // Don't throw - logging is secondary
  }
}
