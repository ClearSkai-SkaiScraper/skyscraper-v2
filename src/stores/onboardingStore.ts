import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector for spotlight
  position?: "top" | "bottom" | "left" | "right";
  completed: boolean;
}

interface OnboardingState {
  isActive: boolean;
  currentStepIndex: number;
  steps: OnboardingStep[];
  hasCompletedOnboarding: boolean;
  dismissedAt: Date | null;

  // Actions
  startOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setCurrentStep: (index: number) => void;
}

const defaultSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "👋 Welcome to SkaiScraper!",
    description: "Let's take a quick tour to show you around. This will only take 60 seconds.",
    completed: false,
  },
  {
    id: "create-job",
    title: "🏗️ Create Your First Job",
    description:
      "Click here to start the AI-powered job wizard. We'll guide you through every step.",
    targetElement: '[data-onboarding="create-job-button"]',
    position: "bottom",
    completed: false,
  },
  {
    id: "dashboard",
    title: "📊 Your Dashboard",
    description: "View all your jobs, track progress, and manage your account from here.",
    targetElement: '[data-onboarding="dashboard-link"]',
    position: "bottom",
    completed: false,
  },
  {
    id: "billing",
    title: "💳 Flat Pricing — $80/seat/month",
    description:
      "Unlimited AI generations included. Manage seats and billing from Settings → Billing.",
    targetElement: '[data-onboarding="billing-link"]',
    position: "bottom",
    completed: false,
  },
  {
    id: "support",
    title: "💬 Need Help?",
    description: "Click the help icon anytime for support. We're here to help you succeed!",
    targetElement: '[data-onboarding="help-button"]',
    position: "left",
    completed: false,
  },
];

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStepIndex: 0,
      steps: defaultSteps,
      hasCompletedOnboarding: false,
      dismissedAt: null,

      startOnboarding: () => {
        set({
          isActive: true,
          currentStepIndex: 0,
          steps: defaultSteps,
        });
      },

      nextStep: () => {
        const { currentStepIndex, steps } = get();
        if (currentStepIndex < steps.length - 1) {
          set({
            currentStepIndex: currentStepIndex + 1,
            steps: steps.map((step, index) =>
              index === currentStepIndex ? { ...step, completed: true } : step
            ),
          });
        } else {
          get().completeOnboarding();
        }
      },

      prevStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },

      skipOnboarding: () => {
        set({
          isActive: false,
          dismissedAt: new Date(),
        });
      },

      completeOnboarding: () => {
        set({
          isActive: false,
          hasCompletedOnboarding: true,
          steps: get().steps.map((step) => ({ ...step, completed: true })),
        });
      },

      resetOnboarding: () => {
        set({
          isActive: false,
          currentStepIndex: 0,
          steps: defaultSteps,
          hasCompletedOnboarding: false,
          dismissedAt: null,
        });
      },

      setCurrentStep: (index: number) => {
        set({ currentStepIndex: index });
      },
    }),
    {
      name: "onboarding-storage",
      version: 1,
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        // Serialize Date to ISO string for reliable JSON round-trips
        dismissedAt: state.dismissedAt ? state.dismissedAt.toISOString() : null,
      }),
      // Rehydrate ISO string back to Date
      onRehydrateStorage: () => (state) => {
        if (state?.dismissedAt && typeof state.dismissedAt === "string") {
          state.dismissedAt = new Date(state.dismissedAt);
        }
      },
    }
  )
);
