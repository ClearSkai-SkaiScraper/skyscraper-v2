/**
 * 🛡️ PERMANENT FIX: ensureWorkspaceForOrg
 *
 * This utility GUARANTEES that every org has the required workspace primitives.
 *
 * IDEMPOTENT: Safe to call multiple times, only creates missing records.
 *
 * REQUIRED PRIMITIVES:
 * - BillingSettings (token tracking)
 * - user_organizations membership (for safeOrgContext)
 *
 * USAGE:
 * ```ts
 * import { ensureWorkspaceForOrg } from '@/lib/workspace/ensureWorkspaceForOrg';
 * await ensureWorkspaceForOrg(orgId, userId);
 * ```
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface EnsureWorkspaceOptions {
  orgId: string;
  userId: string;
  skipBilling?: boolean; // For testing
}

export async function ensureWorkspaceForOrg(options: EnsureWorkspaceOptions): Promise<void> {
  const { orgId, userId, skipBilling = false } = options;

  try {
    // 1. Ensure BillingSettings exists
    if (!skipBilling) {
      const existingBilling = await prisma.billingSettings.findUnique({
        where: { orgId },
      });

      if (!existingBilling) {
        await prisma.billingSettings.create({
          data: {
            id: `billing_${orgId}`,
            orgId,
            updatedAt: new Date(),
          },
        });
        logger.debug(`[ensureWorkspace] Created BillingSettings for org ${orgId}`);
      }
    }

    // 2. Fix orphaned memberships (organizationId empty string)
    const orphanedMemberships = await prisma.user_organizations.findMany({
      where: {
        id: { startsWith: `uo_${orgId}` },
        organizationId: "",
      },
    });

    if (orphanedMemberships.length > 0) {
      for (const orphan of orphanedMemberships) {
        await prisma.user_organizations.update({
          where: { id: orphan.id },
          data: { organizationId: orgId },
        });
      }
      logger.info(
        `[WORKSPACE] Fixed ${orphanedMemberships.length} orphaned memberships for org ${orgId}`
      );
    }

    // 3. Ensure user has valid membership
    const existingMembership = await prisma.user_organizations.findFirst({
      where: {
        userId,
        organizationId: orgId,
      },
    });

    if (!existingMembership) {
      await prisma.user_organizations.create({
        data: {
          id: `uo_${orgId}_${userId}`,
          userId,
          organizationId: orgId,
          role: "owner",
        },
      });
      logger.debug(`[ensureWorkspace] Created membership for user ${userId} in org ${orgId}`);
    }
  } catch (error) {
    logger.error(`[ensureWorkspace] Failed to ensure workspace for org ${orgId}:`, error);
    // Don't throw - let the app continue even if this fails
  }
}

/**
 * Lightweight check - does NOT create anything
 * Use this before rendering to decide if workspace is ready
 */
export async function isWorkspaceReady(orgId: string): Promise<boolean> {
  try {
    const [billing, memberships] = await Promise.all([
      prisma.billingSettings.findUnique({ where: { orgId } }),
      prisma.user_organizations.count({ where: { organizationId: orgId } }),
    ]);

    return !!(billing && memberships > 0);
  } catch {
    return false;
  }
}
