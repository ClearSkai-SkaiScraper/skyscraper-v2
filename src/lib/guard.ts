import { requireOrg } from "./org";

/**
 * Enforce paid subscription access.
 *
 * Logic:
 * 1. Org must have an active/trialing/past_due subscription status.
 * 2. Plan tier must meet the minimum required (Solo < Business < Enterprise).
 * 3. FREE / missing plan → graceful UNPAID error (show upgrade prompt, not hard block).
 *
 * Uses `org.planKey` (from Org model) — NOT the deprecated token system.
 */
export async function assertPaidAccess(minPlan: "Solo" | "Business" | "Enterprise" = "Solo") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = (await requireOrg()) as any;

  const plan = org.Plan?.name ?? org.planKey ?? "FREE";
  const status = org.Subscription?.status ?? org.subscriptionStatus ?? "none";

  // Check subscription is in a valid billing state
  if (!["active", "trialing", "past_due"].includes(status)) {
    throw new Error("UNPAID");
  }

  // Enforce tier ordering: Solo(0) < Business(1) < Enterprise(2)
  const order = ["Solo", "Business", "Enterprise"];
  const currentIdx = order.indexOf(plan);
  const requiredIdx = order.indexOf(minPlan);

  if (currentIdx < 0 || currentIdx < requiredIdx) {
    throw new Error("PLAN_TOO_LOW");
  }

  return org;
}

/**
 * @deprecated Token system removed — flat $80/seat plan includes all features.
 * Kept as no-op stub to avoid breaking imports during migration.
 */
export async function checkTokenBalance(_type: "ai" | "dolCheck" | "dolFull", _needed: number = 1) {
  return 999999;
}
