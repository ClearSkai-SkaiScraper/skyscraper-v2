/**
 * Referral System Utilities
 * Handles referral code generation and reward distribution
 */

import { randomBytes } from "crypto";

import prisma from "@/lib/prisma";

/**
 * Generate a unique, URL-safe referral code
 */
export function makeRefCode(): string {
  return randomBytes(6).toString("base64url").slice(0, 8);
}

/**
 * Ensure an organization has a referral code
 * Creates one if it doesn't exist
 */
export async function ensureOrgReferralCode(orgId: string): Promise<string> {
  const org = await prisma.org.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true, referralCode: true },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  if (org.referralCode) {
    return org.referralCode;
  }

  const code = makeRefCode();

  // Update Org with referral code
  await prisma.org.update({
    where: { id: org.id },
    data: { referralCode: code },
  });

  // Create canonical referral row to anchor the link
  await prisma.referrals.create({
    data: {
      orgId: org.id,
      refCode: code,
      status: "invited",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });

  return code;
}

/**
 * Award referral reward: +30 days subscription extension.
 * All referrals now award a month extension (no tokens).
 */
export async function awardReferralMonth(
  orgId: string,
  referralId: string
): Promise<{ type: "month"; months: number }> {
  await prisma.referral_rewards.create({
    data: {
      orgId,
      type: "month",
      monthsAwarded: 1,
      tokensAwarded: 0,
      sourceReferral: referralId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });

  return { type: "month", months: 1 };
}

/**
 * Get organization ID from Clerk organization ID
 */
export async function getOrgIdFromClerkOrgId(clerkOrgId: string): Promise<string | null> {
  const org = await prisma.org.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });

  return org?.id || null;
}
