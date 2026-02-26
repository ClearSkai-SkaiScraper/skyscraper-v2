"use client";

import { useEffect, useState } from "react";

/**
 * Inline Onboarding Hint
 *
 * Shows a dismissible tooltip/hint on onboarding steps with high drop-off.
 * Persists dismissals in localStorage so users only see each hint once.
 *
 * Usage:
 *   <OnboardingHint
 *     stepId="company_info"
 *     title="Almost there!"
 *     message="Complete your company info to unlock claims management."
 *   />
 */
export function OnboardingHint({
  stepId,
  title,
  message,
  position = "bottom",
}: {
  stepId: string;
  title: string;
  message: string;
  position?: "top" | "bottom" | "left" | "right";
}) {
  const [dismissed, setDismissed] = useState(true); // Start hidden, show after check

  useEffect(() => {
    try {
      const dismissedHints = JSON.parse(
        localStorage.getItem("skai-onboarding-hints-dismissed") || "[]"
      );
      if (!dismissedHints.includes(stepId)) {
        setDismissed(false);
      }
    } catch {
      setDismissed(false);
    }
  }, [stepId]);

  const dismiss = () => {
    setDismissed(true);
    try {
      const dismissed = JSON.parse(localStorage.getItem("skai-onboarding-hints-dismissed") || "[]");
      dismissed.push(stepId);
      localStorage.setItem("skai-onboarding-hints-dismissed", JSON.stringify(dismissed));
    } catch {
      // Ignore
    }
  };

  if (dismissed) return null;

  return (
    <div className="relative mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-950">
      <button
        onClick={dismiss}
        className="absolute right-2 top-2 text-indigo-400 hover:text-indigo-600"
        aria-label="Dismiss hint"
      >
        ✕
      </button>
      <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{title}</p>
      <p className="mt-0.5 text-xs text-indigo-600 dark:text-indigo-400">{message}</p>
    </div>
  );
}

/**
 * Onboarding Progress Bar
 *
 * Floating bar that shows completion progress during onboarding.
 * Auto-hides once all steps are complete.
 */
export function OnboardingProgressBar({
  completedSteps,
  totalSteps,
  currentStepLabel,
}: {
  completedSteps: number;
  totalSteps: number;
  currentStepLabel?: string;
}) {
  const percent = Math.round((completedSteps / totalSteps) * 100);

  if (percent >= 100) return null;

  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm dark:bg-zinc-900">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">
          Setup Progress: {completedSteps}/{totalSteps} steps
        </span>
        <span className="font-bold text-indigo-600">{percent}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      {currentStepLabel && (
        <p className="mt-1 text-xs text-muted-foreground">Next: {currentStepLabel}</p>
      )}
    </div>
  );
}
