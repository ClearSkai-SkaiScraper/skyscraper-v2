/**
 * Trial management system for Phase 4
 * Handles 72-hour trial creation, expiration tracking, and status checks
 */

import prisma from "@/lib/prisma";

const TRIAL_DURATION_HOURS = 72;

export interface TrialInfo {
  isActive: boolean;
  hasEnded: boolean;
  timeRemaining: number; // milliseconds
  hoursRemaining: number;
  minutesRemaining: number;
  trialStartAt: Date | null;
  trialEndsAt: Date | null;
}

/**
 * Start a 72-hour trial for a new organization
 */
export async function startTrial(orgId: string, planKey?: string) {
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_HOURS * 60 * 60 * 1000);

  await prisma.org.update({
    where: { id: orgId },
    data: {
      trialStartAt: now,
      trialEndsAt,
      trialStatus: "active",
      planKey: planKey || null,
    },
  });

  // Trial start logged via ORM events or analytics (removed console noise).

  return {
    trialStartAt: now,
    trialEndsAt,
    trialStatus: "active",
  };
}

/**
 * Check if Org's trial has ended
 */
export function isTrialEnded(Org: {
  trialEndsAt: Date | null;
  trialStatus: string | null;
}): boolean {
  if (!Org.trialEndsAt || Org.trialStatus !== "active") {
    return Org.trialStatus === "ended";
  }

  return new Date() >= Org.trialEndsAt;
}

/**
 * Get trial time remaining (in milliseconds)
 */
export function getTrialTimeRemaining(Org: { trialEndsAt: Date | null }): number {
  if (!Org.trialEndsAt) return 0;

  const remaining = Org.trialEndsAt.getTime() - Date.now();
  return Math.max(0, remaining);
}

/**
 * Get comprehensive trial status for an Org
 */
export function getTrialInfo(Org: {
  trialStartAt: Date | null;
  trialEndsAt: Date | null;
  trialStatus: string | null;
  subscriptionStatus: string | null;
}): TrialInfo {
  const hasActiveSubscription =
    Org.subscriptionStatus === "active" || Org.subscriptionStatus === "trialing";

  if (!Org.trialEndsAt || !Org.trialStartAt) {
    return {
      isActive: false,
      hasEnded: false,
      timeRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      trialStartAt: null,
      trialEndsAt: null,
    };
  }

  const timeRemaining = getTrialTimeRemaining(Org);
  const hasEnded = Org.trialStatus === "ended" || timeRemaining === 0;
  const isActive = Org.trialStatus === "active" && !hasEnded && !hasActiveSubscription;

  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return {
    isActive,
    hasEnded,
    timeRemaining,
    hoursRemaining,
    minutesRemaining,
    trialStartAt: Org.trialStartAt,
    trialEndsAt: Org.trialEndsAt,
  };
}

/**
 * Mark trial as ended for an Org
 */
export async function endTrial(orgId: string) {
  await prisma.org.update({
    where: { id: orgId },
    data: { trialStatus: "ended" },
  });

  // Trial end event hook placeholder.
}

/**
 * Check trial status and return access decision
 */
export async function checkTrialAccess(orgId: string): Promise<{
  hasAccess: boolean;
  reason: "active_trial" | "active_subscription" | "trial_ended" | "no_trial";
}> {
  const Org = await prisma.org.findUnique({
    where: { id: orgId },
    select: {
      trialStartAt: true,
      trialEndsAt: true,
      trialStatus: true,
      subscriptionStatus: true,
    },
  });

  if (!Org) {
    return { hasAccess: false, reason: "no_trial" };
  }

  // Active subscription = always has access
  if (Org.subscriptionStatus === "active" || Org.subscriptionStatus === "trialing") {
    return { hasAccess: true, reason: "active_subscription" };
  }

  // Check trial status
  const trialInfo = getTrialInfo(Org);

  if (trialInfo.isActive && !trialInfo.hasEnded) {
    return { hasAccess: true, reason: "active_trial" };
  }

  if (trialInfo.hasEnded) {
    // Auto-mark as ended if not already
    if (Org.trialStatus === "active") {
      await endTrial(orgId);
    }
    return { hasAccess: false, reason: "trial_ended" };
  }

  return { hasAccess: false, reason: "no_trial" };
}

/**
 * Get orgs that need trial reminder emails (24h or 1h before expiration)
 */
export async function getOrgsNeedingTrialReminders() {
  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

  // Get orgs with trial ending in ~24h or ~1h (±5 min window)
  const orgs = await prisma.org.findMany({
    where: {
      trialStatus: "active",
      trialEndsAt: { not: null },
      subscriptionStatus: null, // Only orgs without subscription
    },
    select: {
      id: true,
      name: true,
      clerkOrgId: true,
      trialStartAt: true,
      trialEndsAt: true,
      users: {
        take: 1, // Get Org admin/owner email
        where: { role: "ADMIN" },
        select: { email: true, name: true },
      },
    },
  });

  const need24h: typeof orgs = [];
  const need1h: typeof orgs = [];

  orgs.forEach((Org) => {
    if (!Org.trialEndsAt) return;

    const timeToEnd = Org.trialEndsAt.getTime() - now.getTime();
    const hoursToEnd = timeToEnd / (1000 * 60 * 60);

    // 24h window: 23.9h to 24.1h
    if (hoursToEnd >= 23.9 && hoursToEnd <= 24.1) {
      need24h.push(Org);
    }

    // 1h window: 0.9h to 1.1h
    if (hoursToEnd >= 0.9 && hoursToEnd <= 1.1) {
      need1h.push(Org);
    }
  });

  return { need24h, need1h };
}
