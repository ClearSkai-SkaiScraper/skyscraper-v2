/**
 * Feature Flags System
 *
 * Centralized feature flag management for safe rollouts and quick rollbacks.
 * Flags can be controlled per-Org or globally via environment variables.
 *
 * KILL SWITCHES (Global, immediate effect):
 * - NEXT_PUBLIC_MAINTENANCE_MODE: Block all write operations
 * - NEXT_PUBLIC_AI_TOOLS_ENABLED: Enable/disable AI generation
 * - NEXT_PUBLIC_UPLOADS_ENABLED: Enable/disable file uploads
 * - NEXT_PUBLIC_SIGNUPS_ENABLED: Enable/disable new user registration
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ============================================================================
// KILL SWITCHES (Global, runtime-controlled)
// ============================================================================

/**
 * Check if maintenance mode is enabled
 * When enabled, blocks all write operations
 */
export function isMaintenanceModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
}

/**
 * Check if AI tools are enabled
 * When disabled, blocks all AI generation endpoints
 */
export function areAIToolsEnabled(): boolean {
  // Default to enabled if not explicitly set to false
  return process.env.NEXT_PUBLIC_AI_TOOLS_ENABLED !== "false";
}

/**
 * Check if uploads are enabled
 * When disabled, blocks file upload endpoints
 */
export function areUploadsEnabled(): boolean {
  // Default to enabled if not explicitly set to false
  return process.env.NEXT_PUBLIC_UPLOADS_ENABLED !== "false";
}

/**
 * Check if new user sign-ups are enabled
 */
export function areSignUpsEnabled(): boolean {
  // Default to enabled if not explicitly set to false
  return process.env.NEXT_PUBLIC_SIGNUPS_ENABLED !== "false";
}

/**
 * Get maintenance mode message (if any)
 */
export function getMaintenanceMessage(): string {
  return (
    process.env.NEXT_PUBLIC_MAINTENANCE_MESSAGE ||
    "We're performing scheduled maintenance. The platform will be back shortly."
  );
}

/**
 * Assert feature is enabled or throw error
 */
export function assertFeatureEnabled(
  featureName: string,
  enabled: boolean,
  message?: string
): void {
  if (!enabled) {
    throw new Error(message || `Feature "${featureName}" is currently disabled`);
  }
}

// ============================================================================
// FEATURE FLAGS (Per-org, database-backed)
// ============================================================================

export interface FeatureFlags {
  cleanSlateEnabled: boolean;
  acceptanceReceiptsEnabled: boolean;
  adminMetricsEnabled: boolean;
  tokenGatingEnabled: boolean;
  emailNotificationsEnabled: boolean;
  pdfGenerationEnabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  cleanSlateEnabled: true,
  acceptanceReceiptsEnabled: true,
  adminMetricsEnabled: true,
  tokenGatingEnabled: true,
  emailNotificationsEnabled: true,
  pdfGenerationEnabled: true,
};

/**
 * Get feature flags for an organization
 * Checks Org-specific settings first, then falls back to global defaults
 */
export async function getFeatureFlags(orgId: string): Promise<FeatureFlags> {
  try {
    // TODO: Add featureFlags field to Org model in Prisma schema
    // For now, just return defaults from env vars

    return {
      cleanSlateEnabled: getEnvFlag("CLEAN_SLATE_ENABLED", DEFAULT_FLAGS.cleanSlateEnabled),
      acceptanceReceiptsEnabled: getEnvFlag(
        "ACCEPTANCE_RECEIPTS_ENABLED",
        DEFAULT_FLAGS.acceptanceReceiptsEnabled
      ),
      adminMetricsEnabled: getEnvFlag("ADMIN_METRICS_ENABLED", DEFAULT_FLAGS.adminMetricsEnabled),
      tokenGatingEnabled: getEnvFlag("TOKEN_GATING_ENABLED", DEFAULT_FLAGS.tokenGatingEnabled),
      emailNotificationsEnabled: getEnvFlag(
        "EMAIL_NOTIFICATIONS_ENABLED",
        DEFAULT_FLAGS.emailNotificationsEnabled
      ),
      pdfGenerationEnabled: getEnvFlag(
        "PDF_GENERATION_ENABLED",
        DEFAULT_FLAGS.pdfGenerationEnabled
      ),
    };
  } catch (error) {
    logger.error("Error fetching feature flags:", error);
    return DEFAULT_FLAGS;
  }
}

/**
 * Check if a specific feature is enabled for an Org
 */
export async function isFeatureEnabled(
  orgId: string,
  feature: keyof FeatureFlags
): Promise<boolean> {
  const flags = await getFeatureFlags(orgId);
  return flags[feature];
}

/**
 * Update feature flags for an organization
 * Used by admin API to toggle features per-Org
 */
export async function updateFeatureFlags(
  orgId: string,
  flags: Partial<FeatureFlags>
): Promise<void> {
  // TODO: Add featureFlags JSONB column to Org model
  logger.debug(`Feature flags update requested for Org ${orgId}:`, flags);
  // await prisma.org.update({
  //   where: { id: orgId },
  //   data: {
  //     featureFlags: flags,
  //   },
  // });
}

/**
 * Helper to get flag value from environment variable
 * Allows global kill switches via env vars
 */
function getEnvFlag(envKey: string, defaultValue: boolean): boolean {
  const envValue = process.env[envKey];
  if (envValue === undefined) return defaultValue;
  return envValue === "true" || envValue === "1";
}

/**
 * Global kill switch - disable all new features
 * Used in emergency rollback scenarios
 */
export function getEmergencyMode(): boolean {
  return process.env.EMERGENCY_MODE === "true";
}

/**
 * Check if system is in maintenance mode
 */
export function isMaintenanceMode(): boolean {
  return process.env.MAINTENANCE_MODE === "true";
}
