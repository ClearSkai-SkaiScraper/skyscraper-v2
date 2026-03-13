/**
 * Profile Completion Service
 *
 * Determines if a user's trades profile is complete enough to use the platform.
 * Used by middleware and UI to enforce profile completion.
 */

import prisma from "@/lib/prisma";

export interface ProfileCompletion {
  isComplete: boolean;
  completionPercent: number;
  missingFields: string[];
  hasProfile: boolean;
  hasCompany: boolean;
}

/**
 * Required fields for a complete profile
 */
const REQUIRED_FIELDS = ["firstName", "lastName", "email", "tradeType", "jobTitle"] as const;

/**
 * Optional but recommended fields
 */
const RECOMMENDED_FIELDS = ["phone", "bio", "yearsExperience", "avatar"] as const;

/**
 * Check if a user's trades profile is complete
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

  const missingFields: string[] = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    const value = (member as Record<string, unknown>)[field];
    if (!value || (typeof value === "string" && value.trim() === "")) {
      missingFields.push(field);
    }
  }

  // Calculate completion percentage
  const totalFields = REQUIRED_FIELDS.length + RECOMMENDED_FIELDS.length;
  let completedFields = REQUIRED_FIELDS.length - missingFields.length;

  // Count recommended fields
  for (const field of RECOMMENDED_FIELDS) {
    const value = (member as Record<string, unknown>)[field];
    if (value && (typeof value !== "string" || value.trim() !== "")) {
      completedFields++;
    }
  }

  const completionPercent = Math.round((completedFields / totalFields) * 100);
  const isComplete = missingFields.length === 0;

  return {
    isComplete,
    completionPercent,
    missingFields,
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
