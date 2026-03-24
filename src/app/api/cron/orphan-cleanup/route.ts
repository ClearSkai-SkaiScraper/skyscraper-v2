/**
 * Orphan Cleanup Cron
 * ─────────────────────────────────────────────────────────
 * Runs daily to clean up orphaned records:
 * 1. file_assets with claimId pointing to deleted claims
 * 2. sms_messages with contactId pointing to deleted contacts
 *
 * GET /api/cron/orphan-cleanup
 * Called by Vercel Cron (see vercel.json)
 */

import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron/verifyCronSecret";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // 🔒 SECURITY FIX: Use verifyCronSecret (fail-closed when CRON_SECRET is unset)
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const results: Record<string, number> = {};

  try {
    // 1. Find orphaned file_assets (claimId no longer exists in claims table)
    const orphanedAssets = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM file_assets fa
      WHERE fa."claimId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM claims c WHERE c.id = fa."claimId"
        )
    `;
    const orphanCount = Number(orphanedAssets[0]?.count || 0);

    if (orphanCount > 0) {
      // Soft-delete: set claimId to null (keeps files for audit trail)
      const cleaned = await prisma.$executeRaw`
        UPDATE file_assets
        SET "claimId" = NULL, "updatedAt" = NOW()
        WHERE "claimId" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM claims c WHERE c.id = file_assets."claimId"
          )
      `;
      results.orphanedAssetsCleaned = cleaned;
      logger.info(`[Orphan Cleanup] Cleaned ${cleaned} orphaned file_assets`);
    } else {
      results.orphanedAssetsCleaned = 0;
    }

    // 2. Clean up expired webhook events older than 30 days
    const expiredWebhooks = await prisma.$executeRaw`
      DELETE FROM "WebhookEvent"
      WHERE "createdAt" < NOW() - INTERVAL '30 days'
    `;
    results.expiredWebhooksCleaned = expiredWebhooks;

    // 3. Clean up old notification records (read + older than 90 days)
    try {
      const oldNotifications = await prisma.$executeRaw`
        DELETE FROM "Notification"
        WHERE "readAt" IS NOT NULL
          AND "createdAt" < NOW() - INTERVAL '90 days'
      `;
      results.oldNotificationsCleaned = oldNotifications;
    } catch {
      // Table may not exist in all environments
      results.oldNotificationsCleaned = 0;
    }

    logger.info("[Orphan Cleanup] Complete", results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    logger.error("[Orphan Cleanup] Error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
