import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AssistantMode =
  | "passive"
  | "smart_reactive"
  | "fully_embedded"
  | "field_mode"
  | "voice";

interface AssistantContext {
  page?: string;
  lastError?: string;
  userIdle?: boolean;
  recentUpload?: string;
}

interface AssistantStore {
  // State
  mode: AssistantMode;
  isOpen: boolean;
  isEnabled: boolean;
  lastContext: AssistantContext | null;
  suggestions: string[];

  // Actions
  setMode: (mode: AssistantMode) => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  updateContext: (context: AssistantContext) => void;
  addSuggestion: (suggestion: string) => void;
  clearSuggestions: () => void;
  triggerSmartReactive: (trigger: {
    type: "autosave_error" | "stripe_error" | "balance_zero" | "idle" | "photo_upload";
    data?: any;
  }) => void;
}

export const useAssistantStore = create<AssistantStore>()(
  persist(
    (set, get) => ({
      // Initial state
      mode: "smart_reactive",
      isOpen: false,
      isEnabled: true,
      lastContext: null,
      suggestions: [],

      // Actions
      setMode: (mode) => set({ mode }),

      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

      setOpen: (open) => set({ isOpen: open }),

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      updateContext: (context) => set({ lastContext: context }),

      addSuggestion: (suggestion) =>
        set((state) => ({
          suggestions: [...state.suggestions, suggestion].slice(-5), // Keep last 5
        })),

      clearSuggestions: () => set({ suggestions: [] }),

      triggerSmartReactive: (trigger) => {
        const { mode, isEnabled } = get();

        // Only trigger in smart reactive or fully embedded modes
        if (mode !== "smart_reactive" && mode !== "fully_embedded") {
          return;
        }

        if (!isEnabled) {
          return;
        }

        // Generate suggestion based on trigger type
        let suggestion = "";

        switch (trigger.type) {
          case "autosave_error":
            suggestion = "Autosave failed. Would you like to retry saving your work?";
            break;
          case "stripe_error":
            suggestion = "Payment error. Try again or visit your billing portal?";
            break;
          case "balance_zero":
            suggestion = "You're out of tokens. Purchase more to continue using AI tools.";
            break;
          case "idle":
            suggestion = "You've been idle on this wizard step. Need help completing it?";
            break;
          case "photo_upload":
            suggestion = "Photo uploaded! Run Box Summary AI to auto-caption this image?";
            break;
        }

        if (suggestion) {
          set((state) => ({
            suggestions: [...state.suggestions, suggestion],
            isOpen: true, // Auto-open for smart reactive
            lastContext: {
              ...state.lastContext,
              lastError: trigger.type,
            },
          }));
        }
      },
    }),
    {
      name: "skai-assistant-storage",
      version: 1,
      partialize: (state) => ({
        mode: state.mode,
        isEnabled: state.isEnabled,
      }),
    }
  )
);
