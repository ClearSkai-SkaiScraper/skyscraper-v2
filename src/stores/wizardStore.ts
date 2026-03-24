import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WizardStep {
  id: string;
  label: string;
  completed: boolean;
}

export interface JobData {
  // Step 1: Location
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  coordinates?: { lat: number; lng: number };

  // Step 2: Job Type
  jobType?: "residential" | "commercial" | "industrial";
  propertyType?: string;

  // Step 3: Details
  roofArea?: number;
  stories?: number;
  roofType?: string;
  notes?: string;

  // Step 4: Damage Assessment
  damageType?: string[];
  severity?: "minor" | "moderate" | "severe";
  urgency?: "low" | "medium" | "high";

  // Step 5: Photos
  photos?: string[];

  // Step 6: Review
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
}

interface WizardState {
  currentStep: number;
  steps: WizardStep[];
  jobData: JobData;
  isAutoSaving: boolean;
  lastSaved: Date | null;

  // Actions
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateJobData: (data: Partial<JobData>) => void;
  completeStep: (stepId: string) => void;
  resetWizard: () => void;
  setAutoSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;
}

const defaultSteps: WizardStep[] = [
  { id: "location", label: "Location", completed: false },
  { id: "jobType", label: "Job Type", completed: false },
  { id: "details", label: "Details", completed: false },
  { id: "damage", label: "Damage", completed: false },
  { id: "photos", label: "Photos", completed: false },
  { id: "review", label: "Review", completed: false },
];

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      steps: defaultSteps,
      jobData: {},
      isAutoSaving: false,
      lastSaved: null,

      setCurrentStep: (step: number) => {
        set({ currentStep: step });
      },

      nextStep: () => {
        const { currentStep, steps } = get();
        if (currentStep < steps.length - 1) {
          set({ currentStep: currentStep + 1 });
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      updateJobData: (data: Partial<JobData>) => {
        set((state) => ({
          jobData: { ...state.jobData, ...data },
        }));
      },

      completeStep: (stepId: string) => {
        set((state) => ({
          steps: state.steps.map((step) =>
            step.id === stepId ? { ...step, completed: true } : step
          ),
        }));
      },

      resetWizard: () => {
        set({
          currentStep: 0,
          steps: defaultSteps,
          jobData: {},
          lastSaved: null,
        });
      },

      setAutoSaving: (saving: boolean) => {
        set({ isAutoSaving: saving });
      },

      setLastSaved: (date: Date) => {
        set({ lastSaved: date });
      },
    }),
    {
      name: "wizard-storage",
      version: 1,
      partialize: (state) => ({
        currentStep: state.currentStep,
        jobData: state.jobData,
        steps: state.steps,
      }),
    }
  )
);
