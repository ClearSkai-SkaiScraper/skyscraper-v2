"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

/**
 * Onboarding step definitions for funnel tracking.
 * The order determines the funnel sequence.
 */
export const ONBOARDING_STEPS = [
  { id: "signup", label: "Account Created", route: "/sign-up" },
  { id: "org_created", label: "Organization Created", route: "/onboarding" },
  { id: "company_info", label: "Company Info Entered", route: "/onboarding" },
  { id: "branding", label: "Branding Configured", route: "/onboarding" },
  { id: "team_invited", label: "Team Invited", route: "/onboarding" },
  { id: "first_login", label: "First Dashboard Visit", route: "/dashboard" },
  { id: "first_claim", label: "First Claim Created", route: "/claims" },
  { id: "first_upload", label: "First Photo Uploaded", route: "/claims" },
  { id: "first_report", label: "First Report Generated", route: "/reports" },
  { id: "activated", label: "Fully Activated", route: "/dashboard" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

interface OnboardingEvent {
  stepId: OnboardingStepId;
  timestamp: number;
  durationMs?: number; // Time spent on this step
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = "skai-onboarding-progress";

/**
 * Hook to track onboarding funnel progress.
 *
 * Usage:
 *   const { trackStep, getProgress, getDropOffStep } = useOnboardingTracking();
 *   trackStep("company_info", { fieldsCompleted: 5 });
 */
export function useOnboardingTracking() {
  const { userId, orgId } = useAuth();
  const pathname = usePathname();
  const stepStartTime = useRef<number>(Date.now());

  // Reset step timer on route change
  useEffect(() => {
    stepStartTime.current = Date.now();
  }, [pathname]);

  /**
   * Track completion of an onboarding step
   */
  const trackStep = useCallback(
    async (stepId: OnboardingStepId, metadata?: Record<string, unknown>) => {
      const durationMs = Date.now() - stepStartTime.current;

      const event: OnboardingEvent = {
        stepId,
        timestamp: Date.now(),
        durationMs,
        metadata,
      };

      // Persist locally for offline resilience
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const existing = stored.findIndex((e: OnboardingEvent) => e.stepId === stepId);
        if (existing >= 0) {
          stored[existing] = event; // Update existing
        } else {
          stored.push(event);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch {
        // localStorage unavailable — continue
      }

      // Send to server
      try {
        await fetch("/api/pilot/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "other",
            message: `onboarding:${stepId}`,
            page: pathname,
            rating: null,
          }),
        });
      } catch {
        // Non-critical — don't block onboarding flow
      }

      // PostHog tracking (if available)
      if (typeof window !== "undefined" && (window as any).posthog) {
        (window as any).posthog.capture("onboarding_step_completed", {
          step_id: stepId,
          duration_ms: durationMs,
          org_id: orgId,
          ...metadata,
        });
      }
    },
    [pathname, orgId]
  );

  /**
   * Get locally stored onboarding progress
   */
  const getProgress = useCallback((): OnboardingEvent[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }, []);

  /**
   * Determine which step the user dropped off at
   */
  const getDropOffStep = useCallback((): OnboardingStepId | null => {
    const progress = getProgress();
    const completedIds = new Set(progress.map((e) => e.stepId));

    for (const step of ONBOARDING_STEPS) {
      if (!completedIds.has(step.id)) {
        return step.id;
      }
    }
    return null; // All steps completed
  }, [getProgress]);

  /**
   * Get completion percentage
   */
  const getCompletionPercent = useCallback((): number => {
    const progress = getProgress();
    return Math.round((progress.length / ONBOARDING_STEPS.length) * 100);
  }, [getProgress]);

  /**
   * Get time-to-complete for each step
   */
  const getStepDurations = useCallback((): Record<string, number> => {
    const progress = getProgress();
    const durations: Record<string, number> = {};
    for (const event of progress) {
      if (event.durationMs) {
        durations[event.stepId] = event.durationMs;
      }
    }
    return durations;
  }, [getProgress]);

  return {
    trackStep,
    getProgress,
    getDropOffStep,
    getCompletionPercent,
    getStepDurations,
    steps: ONBOARDING_STEPS,
  };
}
