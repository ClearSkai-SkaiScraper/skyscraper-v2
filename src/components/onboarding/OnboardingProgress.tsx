"use client";

/**
 * ============================================================================
 * OnboardingProgress — Step progress bar for onboarding flows
 * ============================================================================
 *
 * Usage:
 *   <OnboardingProgress currentStep={2} totalSteps={5} stepLabels={["Role", "Company", "Branding", "Team", "Done"]} />
 */

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
  stepLabels,
}: OnboardingProgressProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full">
      {/* Step indicators */}
      <div className="mb-2 flex items-center justify-between">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepNum = i + 1;
          const isComplete = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={i} className="flex flex-1 items-center">
              {/* Step circle */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isComplete
                    ? "bg-green-500 text-white"
                    : isCurrent
                      ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900"
                      : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {isComplete ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              {/* Connector line */}
              {i < totalSteps - 1 && (
                <div
                  className={`mx-1 h-0.5 flex-1 transition-colors ${
                    stepNum < currentStep ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step labels */}
      {stepLabels && (
        <div className="flex justify-between">
          {stepLabels.map((label, i) => (
            <span
              key={i}
              className={`text-xs ${
                i + 1 === currentStep
                  ? "font-semibold text-blue-600 dark:text-blue-400"
                  : i + 1 < currentStep
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-400"
              }`}
              style={{ width: `${100 / totalSteps}%`, textAlign: "center" }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs text-gray-500">{percentage}% complete</p>
    </div>
  );
}

export default OnboardingProgress;
