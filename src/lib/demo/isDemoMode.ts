import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Demo Mode Infrastructure
 *
 * When an org is in demo mode:
 * - Sample data only (no real customer data)
 * - No emails sent (prevents accidental client communication)
 * - Shortened AI responses (faster demos)
 * - Resettable state (can reset demo data)
 * - Safe for sales demos and investor presentations
 */

/**
 * Check if an organization is in demo mode
 */
export async function isDemoMode(orgId: string): Promise<boolean> {
  try {
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { demoMode: true },
    });
    return org?.demoMode ?? false;
  } catch (error) {
    logger.error("Error checking demo mode:", error);
    return false; // Default to production mode on error
  }
}

/**
 * Gate mutation operations in demo mode
 * Prevents writes to real data when demoing
 *
 * @returns { allowed: boolean, reason?: string }
 */
export async function gateMutation(orgId: string): Promise<{ allowed: boolean; reason?: string }> {
  const demoMode = await isDemoMode(orgId);

  if (demoMode) {
    return {
      allowed: false,
      reason: "This organization is in demo mode. Data mutations are disabled.",
    };
  }

  return { allowed: true };
}

/**
 * Gate email operations in demo mode
 * Prevents sending emails to real clients during demos
 *
 * @returns { allowed: boolean, reason?: string }
 */
export async function gateEmail(orgId: string): Promise<{ allowed: boolean; reason?: string }> {
  const demoMode = await isDemoMode(orgId);

  if (demoMode) {
    return {
      allowed: false,
      reason:
        "This organization is in demo mode. Emails are disabled to prevent accidental client communication.",
    };
  }

  return { allowed: true };
}

/**
 * Shorten AI responses for demos (faster, more concise)
 */
export function getDemoAiOptions(demoMode: boolean) {
  if (demoMode) {
    return {
      maxTokens: 500, // Shorter responses
      temperature: 0.3, // More deterministic
      systemPrompt:
        "Keep responses extremely concise. This is a demo - prioritize speed and clarity.",
    };
  }

  return {
    maxTokens: 2000, // Full responses
    temperature: 0.7, // More creative
    systemPrompt: null,
  };
}

/**
 * Enable/disable demo mode for an organization (admin only)
 */
export async function setDemoMode(orgId: string, enabled: boolean): Promise<void> {
  await prisma.org.update({
    where: { id: orgId },
    data: { demoMode: enabled },
  });
}
