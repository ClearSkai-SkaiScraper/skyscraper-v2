/**
 * ═══════════════════════════════════════════════════════════════════════
 * SEAT ENFORCEMENT
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Checks whether an org has available seats before allowing user invites.
 * Call this from any invite/add-member flow.
 *
 * Logic:
 *   activeMembers = count(user_organizations WHERE orgId)
 *   purchasedSeats = subscription.seatCount
 *   allowed = activeMembers < purchasedSeats
 */
import prisma from "@/lib/prisma";

export interface SeatCheck {
  allowed: boolean;
  seatsUsed: number;
  seatsPurchased: number;
  seatsRemaining: number;
  error?: string;
}

/**
 * Check if an org can add another member
 */
export async function checkSeatAvailability(orgId: string): Promise<SeatCheck> {
  // Count active members
  const activeMembers = await prisma.user_organizations.count({
    where: { organizationId: orgId },
  });

  // Get subscription seat count
  const sub = await prisma.subscription.findUnique({
    where: { orgId },
    select: { seatCount: true, status: true },
  });

  // During beta or if no subscription, allow unlimited (beta mode)
  if (!sub) {
    // eslint-disable-next-line no-restricted-syntax
    const isBeta = process.env.NEXT_PUBLIC_BETA_MODE !== "false";
    if (isBeta) {
      return {
        allowed: true,
        seatsUsed: activeMembers,
        seatsPurchased: 999,
        seatsRemaining: 999 - activeMembers,
      };
    }

    // No subscription and not beta → free tier gets 1 seat
    return {
      allowed: activeMembers < 1,
      seatsUsed: activeMembers,
      seatsPurchased: 1,
      seatsRemaining: Math.max(0, 1 - activeMembers),
      error:
        activeMembers >= 1 ? "No active subscription. Subscribe to add team members." : undefined,
    };
  }

  // Subscription exists but inactive
  if (sub.status !== "active" && sub.status !== "trialing") {
    return {
      allowed: false,
      seatsUsed: activeMembers,
      seatsPurchased: sub.seatCount,
      seatsRemaining: 0,
      error: `Subscription is ${sub.status}. Please update your payment method.`,
    };
  }

  const remaining = sub.seatCount - activeMembers;

  return {
    allowed: remaining > 0,
    seatsUsed: activeMembers,
    seatsPurchased: sub.seatCount,
    seatsRemaining: Math.max(0, remaining),
    error:
      remaining <= 0
        ? `All ${sub.seatCount} seats are in use. Increase seats in billing settings.`
        : undefined,
  };
}

/**
 * Enforce seat limits — throws if no seats available
 */
export async function enforceSeatLimit(orgId: string): Promise<void> {
  const check = await checkSeatAvailability(orgId);
  if (!check.allowed) {
    throw new Error(
      check.error || `Seat limit reached (${check.seatsUsed}/${check.seatsPurchased})`
    );
  }
}
