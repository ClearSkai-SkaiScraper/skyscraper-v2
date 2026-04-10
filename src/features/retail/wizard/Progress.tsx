/**
 * Progress.tsx
 *
 * Visual progress bar for Retail Wizard showing 8 steps
 *
 * FEATURES:
 * - Shows current step highlighted
 * - Shows completed steps with checkmarks
 * - Shows upcoming steps as inactive
 * - Mobile-responsive (stacks on small screens)
 */

"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/theme";

interface ProgressProps {
  currentStep: number;
  totalSteps: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  steps: Array<{ id: number; label: string; component?: any }>;
}

export default function Progress({ currentStep, totalSteps, steps }: ProgressProps) {
  return (
    <div className="mb-8">
      {/* Desktop: Horizontal Progress Bar */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isUpcoming = step.id > currentStep;

            return (
              <div key={step.id} className="flex flex-1 items-center">
                {/* Step Circle */}
                <div className="relative flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all",
                      isCompleted && "bg-green-600 text-white",
                      isCurrent && "bg-blue-600 text-white ring-4 ring-blue-100",
                      isUpcoming && "bg-gray-200 text-gray-500"
                    )}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : <span>{step.id}</span>}
                  </div>

                  {/* Step Label */}
                  <div
                    className={cn(
                      "absolute top-12 w-24 text-center text-xs font-medium",
                      isCurrent && "text-blue-600",
                      isCompleted && "text-green-600",
                      isUpcoming && "text-gray-500"
                    )}
                  >
                    {step.label}
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 flex-1 transition-all",
                      step.id < currentStep ? "bg-green-600" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical List */}
      <div className="space-y-2 md:hidden">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-all",
                isCurrent && "border-blue-300 bg-blue-50",
                isCompleted && "border-green-300 bg-green-50",
                isUpcoming && "border-gray-200 bg-gray-50"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  isCompleted && "bg-green-600 text-white",
                  isCurrent && "bg-blue-600 text-white",
                  isUpcoming && "bg-gray-200 text-gray-500"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <span>{step.id}</span>}
              </div>

              <div
                className={cn(
                  "text-sm font-medium",
                  isCurrent && "text-blue-600",
                  isCompleted && "text-green-600",
                  isUpcoming && "text-gray-500"
                )}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Percentage */}
      <div className="mt-6">
        <div className="mb-2 flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>{Math.round(((currentStep - 1) / totalSteps) * 100)}% Complete</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
            data-progress={((currentStep - 1) / totalSteps) * 100}
            style={{ width: `${((currentStep - 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
