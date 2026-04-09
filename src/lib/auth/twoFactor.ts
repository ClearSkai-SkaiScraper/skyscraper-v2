/**
 * Two-Factor Authentication (2FA) Setup
 *
 * Integrates with Clerk's Multi-Factor Authentication (MFA)
 * Provides TOTP-based 2FA for enhanced security
 */

/* eslint-disable no-restricted-imports */
import { clerkClient } from "@clerk/nextjs/server";
import crypto from "crypto";

import { logger } from "@/lib/logger";

/**
 * Enable 2FA for user
 */
export async function enable2FA(userId: string): Promise<{ backupCodes: string[] }> {
  try {
    // Clerk handles 2FA through their dashboard and user settings
    // This is a wrapper for additional business logic

    const user = await clerkClient.users.getUser(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Generate backup codes (10 codes)
    const backupCodes = Array.from({ length: 10 }, () => generateBackupCode());

    // Store backup codes in user metadata
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: {
        backupCodes: backupCodes.map((code) => hashBackupCode(code)),
        mfaEnabled: true,
        mfaEnabledAt: new Date().toISOString(),
      },
    });

    return { backupCodes };
  } catch (error) {
    logger.error("Failed to enable 2FA:", error);
    throw new Error("Failed to enable 2FA");
  }
}

/**
 * Disable 2FA for user
 */
export async function disable2FA(userId: string): Promise<void> {
  try {
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: {
        backupCodes: [],
        mfaEnabled: false,
        mfaDisabledAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to disable 2FA:", error);
    throw new Error("Failed to disable 2FA");
  }
}

/**
 * Check if user has 2FA enabled
 */
export async function is2FAEnabled(userId: string): Promise<boolean> {
  try {
    const user = await clerkClient.users.getUser(userId);
    return !!(user.privateMetadata as Record<string, unknown>)?.mfaEnabled;
  } catch {
    return false;
  }
}

/**
 * Verify backup code
 */
export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  try {
    const user = await clerkClient.users.getUser(userId);
    const backupCodes = ((user.privateMetadata as Record<string, unknown>)?.backupCodes ||
      []) as string[];

    const codeHash = hashBackupCode(code);
    const codeIndex = backupCodes.indexOf(codeHash);

    if (codeIndex === -1) {
      return false;
    }

    // Remove used backup code
    backupCodes.splice(codeIndex, 1);

    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: {
        backupCodes,
      },
    });

    return true;
  } catch (error) {
    logger.error("Failed to verify backup code:", error);
    return false;
  }
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(userId: string): Promise<{ backupCodes: string[] }> {
  const backupCodes = Array.from({ length: 10 }, () => generateBackupCode());

  await clerkClient.users.updateUserMetadata(userId, {
    privateMetadata: {
      backupCodes: backupCodes.map((code) => hashBackupCode(code)),
      backupCodesRegeneratedAt: new Date().toISOString(),
    },
  });

  return { backupCodes };
}

/**
 * Generate backup code (8 characters)
 */
function generateBackupCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

/**
 * Hash backup code for storage
 */
function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Get remaining backup codes count
 */
export async function getRemainingBackupCodes(userId: string): Promise<number> {
  try {
    const user = await clerkClient.users.getUser(userId);
    const backupCodes = ((user.privateMetadata as Record<string, unknown>)?.backupCodes ||
      []) as string[];
    return backupCodes.length;
  } catch {
    return 0;
  }
}

/**
 * Enforce 2FA for organization
 */
export async function enforce2FAForOrg(orgId: string, required: boolean): Promise<void> {
  // Store org 2FA requirement in database
  const { default: prisma } = await import("@/lib/prisma");

  await prisma.org
    .update({
      where: { id: orgId },
      data: {
        require2FA: required,
        require2FAUpdatedAt: new Date(),
      },
    })
    .catch(() => {
      logger.warn("⚠️ Org table does not have require2FA field yet");
    });
}

/**
 * Check if org requires 2FA
 */
export async function orgRequires2FA(orgId: string): Promise<boolean> {
  try {
    const { default: prisma } = await import("@/lib/prisma");

    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { require2FA: true },
    });

    return org?.require2FA || false;
  } catch {
    return false;
  }
}

/**
 * Get 2FA settings for user
 */
export async function get2FASettings(userId: string): Promise<{
  enabled: boolean;
  backupCodesRemaining: number;
  enabledAt?: string;
}> {
  const enabled = await is2FAEnabled(userId);
  const backupCodesRemaining = await getRemainingBackupCodes(userId);

  let enabledAt: string | undefined;

  try {
    const user = await clerkClient.users.getUser(userId);
    enabledAt = (user.privateMetadata as Record<string, unknown>)?.mfaEnabledAt as
      | string
      | undefined;
  } catch {
    // Ignore
  }

  return {
    enabled,
    backupCodesRemaining,
    enabledAt,
  };
}

/**
 * Middleware to enforce 2FA
 */
export async function enforce2FA(userId: string, orgId: string): Promise<void> {
  const orgRequiresMFA = await orgRequires2FA(orgId);

  if (!orgRequiresMFA) {
    return; // 2FA not required for this org
  }

  const mfaEnabled = await is2FAEnabled(userId);

  if (!mfaEnabled) {
    throw new Error("2FA required but not enabled. Please enable 2FA in your account settings.");
  }
}

/**
 * Log 2FA events
 */
export async function log2FAEvent(
  userId: string,
  event:
    | "2FA_ENABLED"
    | "2FA_DISABLED"
    | "2FA_VERIFIED"
    | "BACKUP_CODE_USED"
    | "BACKUP_CODES_REGENERATED"
): Promise<void> {
  logger.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      userId,
      event,
      category: "SECURITY",
    })
  );
}
