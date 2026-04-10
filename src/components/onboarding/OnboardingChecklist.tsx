"use client";

/**
 * OnboardingChecklist
 *
 * Interactive checklist for pilot users to complete onboarding steps.
 * Tracks progress and provides guidance for getting started.
 */

import {
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  MessageSquare,
  Settings,
  Upload,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  completed?: boolean;
  optional?: boolean;
}

interface OnboardingChecklistProps {
  orgId: string;
  completedSteps?: string[];
  onStepComplete?: (stepId: string) => void;
  onAllComplete?: () => void;
  className?: string;
}

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: "company_profile",
    title: "Set up your company profile",
    description: "Add your company name, logo, and contact information",
    icon: <Building2 className="h-5 w-5" />,
    href: "/settings/company",
  },
  {
    id: "invite_team",
    title: "Invite your team",
    description: "Add team members to collaborate on claims",
    icon: <Users className="h-5 w-5" />,
    href: "/settings/team",
    optional: true,
  },
  {
    id: "first_claim",
    title: "Create your first claim",
    description: "Start a new claim to see the workflow",
    icon: <FileText className="h-5 w-5" />,
    href: "/claims/new",
  },
  {
    id: "upload_photos",
    title: "Upload damage photos",
    description: "Add photos for AI analysis and damage detection",
    icon: <Camera className="h-5 w-5" />,
    href: "/claims",
  },
  {
    id: "generate_report",
    title: "Generate a report",
    description: "Create your first AI-powered claim report",
    icon: <Upload className="h-5 w-5" />,
    href: "/reports",
  },
  {
    id: "configure_settings",
    title: "Configure preferences",
    description: "Set up notifications, integrations, and defaults",
    icon: <Settings className="h-5 w-5" />,
    href: "/settings",
    optional: true,
  },
  {
    id: "provide_feedback",
    title: "Share your feedback",
    description: "Help us improve by sharing your experience",
    icon: <MessageSquare className="h-5 w-5" />,
    href: "/feedback",
  },
];

export function OnboardingChecklist({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  orgId,
  completedSteps = [],
  onStepComplete,
  onAllComplete,
  className,
}: OnboardingChecklistProps) {
  const [steps, setSteps] = useState<OnboardingStep[]>(() =>
    DEFAULT_STEPS.map((step) => ({
      ...step,
      completed: completedSteps.includes(step.id),
    }))
  );
  const [isExpanded, setIsExpanded] = useState(true);

  const completedCount = steps.filter((s) => s.completed).length;
  const requiredSteps = steps.filter((s) => !s.optional);
  const requiredComplete = requiredSteps.filter((s) => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const allRequiredComplete = requiredComplete === requiredSteps.length;

  useEffect(() => {
    if (allRequiredComplete) {
      onAllComplete?.();
    }
  }, [allRequiredComplete, onAllComplete]);

  const handleStepClick = (stepId: string) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, completed: !step.completed } : step))
    );
    onStepComplete?.(stepId);
  };

  return (
    <div className={cn("rounded-lg border bg-white shadow-sm", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
            <CheckCircle2 className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Getting Started</h3>
            <p className="text-sm text-gray-500">
              {completedCount} of {steps.length} steps complete
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress Ring */}
          <div className="relative h-10 w-10">
            <svg className="h-10 w-10 -rotate-90 transform">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#E5E7EB" strokeWidth="3" />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="#4F46E5"
                strokeWidth="3"
                strokeDasharray={`${progress} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
              {progress}%
            </span>
          </div>

          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Steps List */}
      {isExpanded && (
        <div className="border-t">
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-4 border-b px-4 py-3 last:border-b-0",
                step.completed && "bg-green-50"
              )}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleStepClick(step.id)}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                  step.completed
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-gray-300 hover:border-indigo-500"
                )}
              >
                {step.completed && <Check className="h-4 w-4" />}
              </button>

              {/* Icon */}
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  step.completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
                )}
              >
                {step.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "font-medium",
                      step.completed ? "text-green-700" : "text-gray-900"
                    )}
                  >
                    {step.title}
                  </p>
                  {step.optional && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>

              {/* Action */}
              {step.href && !step.completed && (
                <Button variant="outline" size="sm" asChild>
                  <a href={step.href}>Start</a>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {allRequiredComplete && (
        <div className="border-t bg-green-50 px-4 py-3">
          <p className="text-center text-sm font-medium text-green-700">
            🎉 You&apos;ve completed all required steps! You&apos;re ready to go.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage onboarding state — persisted via API, not localStorage.
 * Falls back to localStorage if the API is unreachable.
 */
export function useOnboardingProgress(orgId: string) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from API, fall back to localStorage
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/onboarding/progress");
        if (res.ok) {
          const data = await res.json();
          // The API returns boolean flags — convert to step IDs for the checklist
          const steps: string[] = [];
          if (data.hasBranding) steps.push("company_profile");
          if (data.hasClient || data.hasClaim) steps.push("invite_team");
          if (data.hasClaim) steps.push("first_claim");
          if (data.hasPhotos) steps.push("upload_photos");
          if (data.hasAiArtifact) steps.push("generate_report");
          if (data.hasVendorReference || data.hasTradesMember) steps.push("configure_settings");
          if (data.hasPdfExport) steps.push("provide_feedback");
          if (!cancelled) setCompletedSteps(steps);
          return;
        }
      } catch (e) {
        logger.error(
          "Failed to fetch onboarding progress from API, falling back to localStorage:",
          e
        );
      }
      // Fallback: localStorage
      try {
        const stored = localStorage.getItem(`onboarding_${orgId}`);
        if (stored && !cancelled) {
          setCompletedSteps(JSON.parse(stored));
        }
      } catch (e) {
        logger.error("Failed to parse onboarding progress:", e);
      }
    }
    void load().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const markStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = prev.includes(stepId) ? prev.filter((s) => s !== stepId) : [...prev, stepId];
      // Keep localStorage as a fast cache
      try {
        localStorage.setItem(`onboarding_${orgId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const resetProgress = () => {
    setCompletedSteps([]);
    try {
      localStorage.removeItem(`onboarding_${orgId}`);
    } catch {}
  };

  return {
    completedSteps,
    isLoading,
    markStepComplete,
    resetProgress,
    isComplete: completedSteps.length >= DEFAULT_STEPS.filter((s) => !s.optional).length,
  };
}
