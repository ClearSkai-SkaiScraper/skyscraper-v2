import { requireOrg } from "./org";

export async function assertPaidAccess(minPlan: "Solo" | "Business" | "Enterprise" = "Solo") {
  const org = (await requireOrg()) as any;

  // BETA MODE: Allow FREE tier access during beta testing
  // TODO: Re-enable strict enforcement after beta when Stripe is activated
  const plan = org.plan?.name ?? "FREE";

  // During beta, FREE tier gets full access
  if (plan === "FREE") {
    return org;
  }

  // For paid tiers (post-beta), enforce normal tier checks
  const status = org.subscription?.status ?? "none";
  if (!["active", "trialing", "past_due"].includes(status)) {
    throw new Error("UNPAID");
  }

  const order = ["Solo", "Business", "Enterprise"];
  if (order.indexOf(plan) < order.indexOf(minPlan)) {
    throw new Error("PLAN_TOO_LOW");
  }

  return org;
}

/**
 * @deprecated Token system removed — flat plan includes all features.
 * Kept as no-op stub to avoid breaking imports.
 */
export async function checkTokenBalance(_type: "ai" | "dolCheck" | "dolFull", _needed: number = 1) {
  return 999999;
}
