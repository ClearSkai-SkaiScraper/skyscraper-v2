// src/lib/demo/config.ts
/**
 * Demo Mode Configuration
 * Controls investor demo mode features and restrictions
 */

export interface DemoModeConfig {
  enabled: boolean;
  readOnly: boolean;
  allowedClaims: string[]; // Only these claim IDs can be edited
  restrictedFeatures: string[];
  autoReset: boolean;
  autoResetInterval: number; // hours
}

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  // eslint-disable-next-line no-restricted-syntax
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/**
 * Get demo mode configuration
 */
export function getDemoConfig(): DemoModeConfig {
  const enabled = isDemoMode();

  return {
    enabled,
    // eslint-disable-next-line no-restricted-syntax
    readOnly: enabled && process.env.DEMO_READ_ONLY === "true",
    // eslint-disable-next-line no-restricted-syntax
    allowedClaims: process.env.DEMO_ALLOWED_CLAIMS?.split(",") || [],
    restrictedFeatures: [
      "delete-claim",
      "delete-lead",
      "delete-contact",
      "billing-change",
      "org-delete",
    ],
    // eslint-disable-next-line no-restricted-syntax
    autoReset: enabled && process.env.DEMO_AUTO_RESET === "true",
    // eslint-disable-next-line no-restricted-syntax
    autoResetInterval: parseInt(process.env.DEMO_RESET_INTERVAL || "24", 10),
  };
}

/**
 * Check if a feature is restricted in demo mode
 */
export function isFeatureRestricted(featureName: string): boolean {
  if (!isDemoMode()) return false;
  const config = getDemoConfig();
  return config.restrictedFeatures.includes(featureName);
}

/**
 * Check if a claim can be edited in demo mode
 */
export function isClaimEditable(claimId: string): boolean {
  if (!isDemoMode()) return true;
  const config = getDemoConfig();

  // If no specific claims listed, allow all
  if (config.allowedClaims.length === 0) return true;

  return config.allowedClaims.includes(claimId);
}

/**
 * Get demo mode restrictions message
 */
export function getDemoRestrictionMessage(action: string): string {
  return `This action is restricted in demo mode. ${action} is disabled for the investor demo.`;
}
