/**
 * Profile Completion Service
 *
 * Determines if a user's trades profile is complete enough to use the platform.
 * Used by middleware and UI to enforce profile completion.
 */

import prisma from "@/lib/prisma";
import { calculateProStrength } from "@/lib/profile-strength";

export interface ProfileCompletion {
  isComplete: boolean;
  completionPercent: number;
  missingFields: string[];
  hasProfile: boolean;
  hasCompany: boolean;
}

/**
 * Required fields — profile cannot be considered "complete" without these.
 * These are a subset of the 15 fields checked by calculateProStrength.
 */
const REQUIRED_FIELDS = ["firstName", "lastName", "email", "tradeType", "jobTitle"] as const;

/**
 * Check if a user's trades profile is complete.
 * Uses the same calculateProStrength calculator as the UI so server and client agree.
 */
export async function checkProfileCompletion(userId: string): Promise<ProfileCompletion> {
  const member = await prisma.tradesCompanyMember.findFirst({
    where: { userId },
    include: { company: true },
  });

  if (!member) {
    return {
      isComplete: false,
      completionPercent: 0,
      missingFields: [...REQUIRED_FIELDS],
      hasProfile: false,
      hasCompany: false,
    };
  }

  // Use the shared calculator — same logic as the UI banner
  const { percent, missing } = calculateProStrength(member as Record<string, unknown>);

  // Check required fields are all present
  const missingRequired: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    const value = (member as Record<string, unknown>)[field];
    if (!value || (typeof value === "string" && value.trim() === "")) {
      missingRequired.push(field);
    }
  }

  return {
    isComplete: missingRequired.length === 0,
    completionPercent: percent,
    missingFields: missing,
    hasProfile: true,
    hasCompany: !!member.company,
  };
}

/**
 * Quick check - just returns boolean for middleware
 */
export async function isProfileComplete(userId: string): Promise<boolean> {
  const result = await checkProfileCompletion(userId);
  return result.isComplete;
}

/**
 * Routes that should bypass profile completion check
 */
export const PROFILE_BYPASS_ROUTES = [
  "/trades/onboarding",
  "/trades/profile/edit",
  "/trades/company/edit",
  "/trades/setup",
  "/sign-in",
  "/sign-up",
  "/sign-out",
  "/api/",
];

/**
 * Check if a path should bypass profile completion
 */
export function shouldBypassProfileCheck(pathname: string): boolean {
  return PROFILE_BYPASS_ROUTES.some((route) => pathname.startsWith(route));
}
