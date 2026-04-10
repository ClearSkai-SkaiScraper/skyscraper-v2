import { logger } from "@/lib/logger";

/**
 * Demo Mode Configuration
 *
 * Centralized demo mode detection and safety checks
 * Used throughout the app to prevent real emails/SMS in demo mode
 */

export const isDemoMode = (): boolean => {
  // eslint-disable-next-line no-restricted-syntax
  return process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
};

export const DEMO_ORG_NAME = "Arizona Storm Demo";
export const DEMO_ORG_CLERK_ID = "org_demo_arizona_storm";

/**
 * Check if an organization is a demo org
 */
export const isDemoOrg = (orgName?: string | null, clerkOrgId?: string | null): boolean => {
  if (!orgName && !clerkOrgId) return false;
  return orgName === DEMO_ORG_NAME || clerkOrgId === DEMO_ORG_CLERK_ID;
};

/**
 * Safe wrapper for email sending - blocks emails in demo mode
 */
export const shouldSendEmail = (orgName?: string | null): boolean => {
  if (isDemoMode()) {
    logger.debug("📧 [DEMO MODE] Email sending blocked for demo org");
    return false;
  }
  if (isDemoOrg(orgName)) {
    logger.debug("📧 [DEMO ORG] Email sending blocked for demo org");
    return false;
  }
  return true;
};

/**
 * Safe wrapper for SMS sending - blocks SMS in demo mode
 */
export const shouldSendSMS = (orgName?: string | null): boolean => {
  if (isDemoMode()) {
    logger.debug("📱 [DEMO MODE] SMS sending blocked for demo org");
    return false;
  }
  if (isDemoOrg(orgName)) {
    logger.debug("📱 [DEMO ORG] SMS sending blocked for demo org");
    return false;
  }
  return true;
};

/**
 * Get demo mode badge config for UI
 */
export const getDemoModeBadge = () => {
  if (!isDemoMode()) return null;

  return {
    text: "DEMO MODE",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  };
};
