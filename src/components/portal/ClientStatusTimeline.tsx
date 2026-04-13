"use client";

/**
 * ClientStatusTimeline (C7 Enhancement)
 *
 * Visual timeline for clients showing claim progress.
 * Simplified view compared to pro timeline - focuses on key milestones.
 *
 * Features:
 * - Clear visual progress indicator
 * - Mobile-friendly design
 * - Estimated completion dates
 * - Current status highlighted
 */

import {
  Camera,
  CheckCircle2,
  CircleDot,
  Clock,
  FileCheck,
  FileText,
  Send,
  Shield,
} from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

interface StatusStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: "completed" | "current" | "upcoming";
  date?: string;
  estimatedDate?: string;
}

interface ClientStatusTimelineProps {
  currentStatus: string;
  claimCreatedAt?: Date;
  inspectionDate?: Date;
  className?: string;
}

// Map claim status to timeline steps
function getTimelineSteps(
  currentStatus: string,
  claimCreatedAt?: Date,
  inspectionDate?: Date
): StatusStep[] {
  const statusOrder = [
    "FILED",
    "INSPECTION_SCHEDULED",
    "INSPECTION_COMPLETE",
    "DOCUMENTATION",
    "UNDER_REVIEW",
    "APPROVED",
    "COMPLETE",
  ];

  const statusIndex = statusOrder.indexOf(currentStatus);

  const steps: StatusStep[] = [
    {
      id: "filed",
      label: "Claim Filed",
      description: "Your claim has been submitted",
      icon: <FileText className="h-4 w-4" />,
      status: statusIndex >= 0 ? "completed" : "upcoming",
      date: claimCreatedAt?.toLocaleDateString(),
    },
    {
      id: "inspection",
      label: "Inspection Scheduled",
      description: "A contractor will inspect the damage",
      icon: <Camera className="h-4 w-4" />,
      status: statusIndex >= 1 ? (statusIndex === 1 ? "current" : "completed") : "upcoming",
      date: inspectionDate?.toLocaleDateString(),
    },
    {
      id: "documented",
      label: "Documentation",
      description: "Photos and damage report prepared",
      icon: <FileCheck className="h-4 w-4" />,
      status: statusIndex >= 3 ? (statusIndex === 3 ? "current" : "completed") : "upcoming",
    },
    {
      id: "submitted",
      label: "Submitted to Insurance",
      description: "Your claim package is with the adjuster",
      icon: <Send className="h-4 w-4" />,
      status: statusIndex >= 4 ? (statusIndex === 4 ? "current" : "completed") : "upcoming",
    },
    {
      id: "approved",
      label: "Claim Approved",
      description: "Insurance has approved coverage",
      icon: <Shield className="h-4 w-4" />,
      status: statusIndex >= 5 ? (statusIndex === 5 ? "current" : "completed") : "upcoming",
    },
    {
      id: "complete",
      label: "Complete",
      description: "Repairs finished and claim closed",
      icon: <CheckCircle2 className="h-4 w-4" />,
      status: statusIndex >= 6 ? "completed" : "upcoming",
    },
  ];

  // Mark current step
  if (statusIndex >= 0 && statusIndex < steps.length) {
    steps[statusIndex].status = "current";
  }

  return steps;
}

export function ClientStatusTimeline({
  currentStatus,
  claimCreatedAt,
  inspectionDate,
  className,
}: ClientStatusTimelineProps) {
  const steps = getTimelineSteps(currentStatus, claimCreatedAt, inspectionDate);
  const currentStepIndex = steps.findIndex((s) => s.status === "current");
  const progressPercent = Math.round(((currentStepIndex + 0.5) / steps.length) * 100);

  return (
    <div className={cn("rounded-xl bg-white p-6 shadow-sm dark:bg-slate-800", className)}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Claim Progress</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentStepIndex >= 0
            ? `Step ${currentStepIndex + 1} of ${steps.length}`
            : "Getting started"}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Filed</span>
          <span>{progressPercent}% Complete</span>
          <span>Done</span>
        </div>
      </div>

      {/* Timeline steps */}
      <div className="space-y-0">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "absolute left-4 top-10 h-12 w-0.5",
                  step.status === "completed" ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                )}
              />
            )}

            {/* Step content */}
            <div className="flex items-start gap-4 pb-6">
              {/* Icon */}
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
                  step.status === "completed" &&
                    "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                  step.status === "current" &&
                    "bg-blue-100 text-blue-600 ring-4 ring-blue-50 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-900/20",
                  step.status === "upcoming" &&
                    "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
                )}
              >
                {step.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : step.status === "current" ? (
                  <CircleDot className="h-4 w-4 animate-pulse" />
                ) : (
                  step.icon
                )}
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4
                    className={cn(
                      "font-medium",
                      step.status === "completed" && "text-emerald-600 dark:text-emerald-400",
                      step.status === "current" && "text-blue-600 dark:text-blue-400",
                      step.status === "upcoming" && "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {step.label}
                  </h4>
                  {step.status === "current" && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      Current
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-0.5 text-sm",
                    step.status === "upcoming"
                      ? "text-slate-400 dark:text-slate-600"
                      : "text-muted-foreground"
                  )}
                >
                  {step.description}
                </p>
                {step.date && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {step.date}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Help text */}
      <div className="mt-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-900/50">
        <p className="text-sm text-muted-foreground">
          📱 Questions about your claim? Contact your contractor or check the{" "}
          <a href="/portal/help" className="font-medium text-blue-600 hover:underline">
            Help Center
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default ClientStatusTimeline;
