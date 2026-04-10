import { AnimatePresence,motion } from "framer-motion";
import { ArrowLeft,ArrowRight, X } from "lucide-react";
import React, { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/stores/onboardingStore";

import { OnboardingSpotlight } from "./OnboardingSpotlight";

export const OnboardingOverlay: React.FC = () => {
  const {
    isActive,
    currentStepIndex,
    steps,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
  } = useOnboardingStore();

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]">
        {/* Dimmed Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Spotlight */}
        {currentStep.targetElement && <OnboardingSpotlight selector={currentStep.targetElement} />}

        {/* Tooltip Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.2 }}
          className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform"
        >
          <div className="mx-4 rounded-2xl bg-white p-8 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={skipOnboarding}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              aria-label="Skip tour"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>

            {/* Content */}
            <div className="mb-6">
              <h2 className="mb-3 text-2xl font-bold text-gray-900">{currentStep.title}</h2>
              <p className="leading-relaxed text-gray-600">{currentStep.description}</p>
            </div>

            {/* Progress Dots */}
            <div className="mb-6 flex items-center justify-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStepIndex
                      ? "w-8 bg-blue-600"
                      : index < currentStepIndex
                        ? "w-2 bg-green-600"
                        : "w-2 bg-gray-300"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="text-sm text-gray-500">
                {currentStepIndex + 1} / {steps.length}
              </div>

              <Button
                onClick={isLastStep ? completeOnboarding : nextStep}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isLastStep ? "Get Started" : "Next"}
                {!isLastStep && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>

            {/* Skip Button */}
            {!isLastStep && (
              <button
                onClick={skipOnboarding}
                className="mt-4 w-full text-sm text-gray-500 transition-colors hover:text-gray-700"
              >
                Skip tour
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
