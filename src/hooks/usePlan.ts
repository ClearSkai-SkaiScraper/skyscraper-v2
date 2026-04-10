"use client";

/**
 * ============================================================================
 * usePlan — Client-side plan & feature check hook
 * ============================================================================
 *
 * Usage:
 *   const { plan, hasFeature, isLoading } = usePlan();
 *   if (!hasFeature("ai_assistant")) return <UpgradeModal feature="ai_assistant" />;
 */

import { useEffect, useState } from "react";

import type { FeatureKey, PlanSlug } from "@/lib/billing/featureGates";
import {
  getMinPlanForFeature,
  hasFeature as checkFeature,
  PLAN_DISPLAY_NAMES,
} from "@/lib/billing/featureGates";

interface PlanInfo {
  slug: PlanSlug;
  name: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "none";
  seatCount: number;
  currentPeriodEnd: string | null;
}

interface UsePlanReturn {
  plan: PlanInfo | null;
  isLoading: boolean;
  error: string | null;
  hasFeature: (feature: FeatureKey) => boolean;
  getUpgradePlan: (feature: FeatureKey) => string;
  isPastDue: boolean;
  isTrialing: boolean;
}

export function usePlan(): UsePlanReturn {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPlan() {
      try {
        const res = await fetch("/api/billing/plan");
        if (!res.ok) {
          // If no billing endpoint yet, default to free
          setPlan({
            slug: "free",
            name: "Free",
            status: "none",
            seatCount: 1,
            currentPeriodEnd: null,
          });
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setPlan({
            slug: data.plan?.slug || "free",
            name: data.plan?.name || "Free",
            status: data.subscription?.status || "none",
            seatCount: data.subscription?.seatCount || 1,
            currentPeriodEnd: data.subscription?.currentPeriodEnd || null,
          });
        }
      } catch (_err) {
        if (!cancelled) {
          setError("Failed to load plan info");
          setPlan({
            slug: "free",
            name: "Free",
            status: "none",
            seatCount: 1,
            currentPeriodEnd: null,
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchPlan();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasFeature = (feature: FeatureKey): boolean => {
    if (!plan) return false;
    // Active or trialing = has features for their plan
    if (plan.status === "active" || plan.status === "trialing") {
      return checkFeature(plan.slug, feature);
    }
    // Past due = grace period — still has features
    if (plan.status === "past_due") {
      return checkFeature(plan.slug, feature);
    }
    // Canceled or none = free tier only
    return checkFeature("free", feature);
  };

  const getUpgradePlan = (feature: FeatureKey): string => {
    const minPlan = getMinPlanForFeature(feature);
    return PLAN_DISPLAY_NAMES[minPlan];
  };

  return {
    plan,
    isLoading,
    error,
    hasFeature,
    getUpgradePlan,
    isPastDue: plan?.status === "past_due",
    isTrialing: plan?.status === "trialing",
  };
}
