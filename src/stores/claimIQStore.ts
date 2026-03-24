/**
 * ClaimIQ™ — Zustand Store
 *
 * Central client-side state for the entire ClaimIQ pipeline:
 *   - Readiness data from the assembly engine
 *   - Section generation/completion status
 *   - Autopilot execution state
 *   - Live progress tracking
 *
 * This replaces all the scattered useState hooks in the claims-ready-folder page.
 */

import type { ClaimIQReadiness, SectionReadiness } from "@/lib/claimiq/assembly-engine";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type GenerationStatus = "idle" | "generating" | "completed" | "error";

export interface SectionGenerationState {
  status: GenerationStatus;
  progress: number; // 0-100
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
  /** Number of times this section was regenerated */
  regenerationCount: number;
}

export type AutopilotStatus = "idle" | "planning" | "running" | "paused" | "completed" | "error";

export interface AutopilotActionState {
  field: string;
  label: string;
  status: "pending" | "running" | "completed" | "error" | "skipped";
  autonomous: boolean;
  message: string | null;
  durationMs: number | null;
}

export interface ClaimIQStoreState {
  // ── Readiness ────────────────────────────────────────────────────────────
  /** Currently loaded readiness data */
  readiness: ClaimIQReadiness | null;
  /** Loading state for readiness fetch */
  readinessLoading: boolean;
  /** Last time readiness was fetched (epoch ms) */
  lastFetchedAt: number | null;
  /** Error from last readiness fetch */
  readinessError: string | null;

  // ── Section Generation ───────────────────────────────────────────────────
  /** Per-section generation state, keyed by section key */
  sectionStates: Record<string, SectionGenerationState>;
  /** Sections selected for packet generation */
  selectedSections: string[];
  /** Global "generating packet" flag */
  isGeneratingPacket: boolean;
  /** Packet generation progress (0-100) */
  packetProgress: number;

  // ── Autopilot ────────────────────────────────────────────────────────────
  autopilotStatus: AutopilotStatus;
  autopilotActions: AutopilotActionState[];
  autopilotProgress: number; // 0-100
  autopilotCurrentAction: string | null;

  // ── UI State ─────────────────────────────────────────────────────────────
  /** Currently active tab on the assembly page */
  activeTab: string;
  /** Whether the readiness panel is expanded in compact mode */
  panelExpanded: boolean;
  /** Claim ID this state belongs to */
  activeClaimId: string | null;
  /** Polling interval handle */
  _pollingInterval: ReturnType<typeof setInterval> | null;
}

export interface ClaimIQStoreActions {
  // ── Readiness Actions ────────────────────────────────────────────────────
  /** Fetch readiness from the API */
  fetchReadiness: (claimId: string) => Promise<void>;
  /** Set readiness data directly */
  setReadiness: (data: ClaimIQReadiness) => void;
  /** Clear readiness and reset to initial state */
  clearReadiness: () => void;
  /** Refresh readiness after a data change (debounced) */
  refreshAfterChange: (claimId: string, changeType: string) => Promise<void>;
  /** Start polling readiness every N seconds */
  startPolling: (claimId: string, intervalMs?: number) => void;
  /** Stop polling */
  stopPolling: () => void;

  // ── Section Actions ──────────────────────────────────────────────────────
  /** Start generating a section */
  startSectionGeneration: (sectionKey: string) => void;
  /** Update section progress */
  updateSectionProgress: (sectionKey: string, progress: number) => void;
  /** Mark section generation complete */
  completeSectionGeneration: (sectionKey: string) => void;
  /** Mark section generation error */
  failSectionGeneration: (sectionKey: string, error: string) => void;
  /** Toggle section selection for batch operations */
  toggleSectionSelection: (sectionKey: string) => void;
  /** Select/deselect all sections */
  selectAllSections: (keys: string[]) => void;
  /** Clear all selections */
  clearSectionSelections: () => void;
  /** Get sections that meet readiness threshold */
  getReadySections: (minCompleteness?: number) => SectionReadiness[];

  // ── Packet Generation ────────────────────────────────────────────────────
  /** Start packet generation */
  startPacketGeneration: () => void;
  /** Update packet progress */
  updatePacketProgress: (progress: number) => void;
  /** Complete packet generation */
  completePacketGeneration: () => void;
  /** Fail packet generation */
  failPacketGeneration: (error: string) => void;

  // ── Autopilot Actions ────────────────────────────────────────────────────
  /** Set autopilot plan */
  setAutopilotPlan: (actions: AutopilotActionState[]) => void;
  /** Start autopilot execution */
  startAutopilot: () => void;
  /** Update current autopilot action */
  updateAutopilotAction: (field: string, update: Partial<AutopilotActionState>) => void;
  /** Advance to next autopilot action */
  advanceAutopilot: () => void;
  /** Pause autopilot */
  pauseAutopilot: () => void;
  /** Resume autopilot */
  resumeAutopilot: () => void;
  /** Complete autopilot */
  completeAutopilot: () => void;
  /** Reset autopilot */
  resetAutopilot: () => void;

  // ── UI Actions ───────────────────────────────────────────────────────────
  setActiveTab: (tab: string) => void;
  setPanelExpanded: (expanded: boolean) => void;
  setActiveClaimId: (claimId: string) => void;
}

type ClaimIQStore = ClaimIQStoreState & ClaimIQStoreActions;

// ─────────────────────────────────────────────────────────────────────────────
// Default Section State
// ─────────────────────────────────────────────────────────────────────────────

const defaultSectionState: SectionGenerationState = {
  status: "idle",
  progress: 0,
  startedAt: null,
  completedAt: null,
  error: null,
  regenerationCount: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useClaimIQStore = create<ClaimIQStore>()(
  persist(
    (set, get) => ({
      // ── Initial State ──────────────────────────────────────────────────────
      readiness: null,
      readinessLoading: false,
      lastFetchedAt: null,
      readinessError: null,
      sectionStates: {},
      selectedSections: [],
      isGeneratingPacket: false,
      packetProgress: 0,
      autopilotStatus: "idle",
      autopilotActions: [],
      autopilotProgress: 0,
      autopilotCurrentAction: null,
      activeTab: "claimiq",
      panelExpanded: false,
      activeClaimId: null,
      _pollingInterval: null,

      // ── Readiness Actions ──────────────────────────────────────────────────

      fetchReadiness: async (claimId: string) => {
        // If already loading for this claim, skip
        if (get().readinessLoading && get().activeClaimId === claimId) return;

        set({ readinessLoading: true, readinessError: null, activeClaimId: claimId });

        try {
          const res = await fetch(`/api/claims/${claimId}/claimiq/readiness`);
          if (!res.ok) {
            throw new Error(`Failed to fetch readiness: ${res.status}`);
          }
          const data: ClaimIQReadiness = await res.json();
          set({
            readiness: data,
            readinessLoading: false,
            lastFetchedAt: Date.now(),
            readinessError: null,
          });
        } catch (err) {
          set({
            readinessLoading: false,
            readinessError: err instanceof Error ? err.message : "Unknown error",
          });
        }
      },

      setReadiness: (data) => {
        set({
          readiness: data,
          lastFetchedAt: Date.now(),
          readinessError: null,
        });
      },

      clearReadiness: () => {
        set({
          readiness: null,
          readinessLoading: false,
          lastFetchedAt: null,
          readinessError: null,
          sectionStates: {},
          selectedSections: [],
          isGeneratingPacket: false,
          packetProgress: 0,
          autopilotStatus: "idle",
          autopilotActions: [],
          autopilotProgress: 0,
          autopilotCurrentAction: null,
        });
      },

      refreshAfterChange: async (claimId: string, changeType: string) => {
        // Small delay to let DB writes settle
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log(`[ClaimIQ] Refreshing after ${changeType}`);
        await get().fetchReadiness(claimId);
      },

      startPolling: (claimId: string, intervalMs = 30000) => {
        // Clear any existing polling
        const existing = get()._pollingInterval;
        if (existing) clearInterval(existing);

        // Fetch immediately
        get().fetchReadiness(claimId);

        // Set up polling interval (default 30s)
        const interval = setInterval(() => {
          // Only poll if we're still on the same claim
          if (get().activeClaimId === claimId) {
            get().fetchReadiness(claimId);
          } else {
            // Claim changed — stop polling
            clearInterval(interval);
            set({ _pollingInterval: null });
          }
        }, intervalMs);

        set({ _pollingInterval: interval });
      },

      stopPolling: () => {
        const interval = get()._pollingInterval;
        if (interval) {
          clearInterval(interval);
          set({ _pollingInterval: null });
        }
      },

      // ── Section Actions ────────────────────────────────────────────────────

      startSectionGeneration: (sectionKey: string) => {
        set((state) => ({
          sectionStates: {
            ...state.sectionStates,
            [sectionKey]: {
              ...(state.sectionStates[sectionKey] || defaultSectionState),
              status: "generating",
              progress: 0,
              startedAt: Date.now(),
              completedAt: null,
              error: null,
            },
          },
        }));
      },

      updateSectionProgress: (sectionKey: string, progress: number) => {
        set((state) => ({
          sectionStates: {
            ...state.sectionStates,
            [sectionKey]: {
              ...(state.sectionStates[sectionKey] || defaultSectionState),
              progress: Math.min(100, Math.max(0, progress)),
            },
          },
        }));
      },

      completeSectionGeneration: (sectionKey: string) => {
        set((state) => ({
          sectionStates: {
            ...state.sectionStates,
            [sectionKey]: {
              ...(state.sectionStates[sectionKey] || defaultSectionState),
              status: "completed",
              progress: 100,
              completedAt: Date.now(),
              regenerationCount: (state.sectionStates[sectionKey]?.regenerationCount || 0) + 1,
            },
          },
        }));
      },

      failSectionGeneration: (sectionKey: string, error: string) => {
        set((state) => ({
          sectionStates: {
            ...state.sectionStates,
            [sectionKey]: {
              ...(state.sectionStates[sectionKey] || defaultSectionState),
              status: "error",
              error,
            },
          },
        }));
      },

      toggleSectionSelection: (sectionKey: string) => {
        set((state) => {
          const selected = state.selectedSections.includes(sectionKey)
            ? state.selectedSections.filter((k) => k !== sectionKey)
            : [...state.selectedSections, sectionKey];
          return { selectedSections: selected };
        });
      },

      selectAllSections: (keys: string[]) => {
        set({ selectedSections: keys });
      },

      clearSectionSelections: () => {
        set({ selectedSections: [] });
      },

      getReadySections: (minCompleteness = 75) => {
        const readiness = get().readiness;
        if (!readiness) return [];
        return readiness.sections.filter(
          (s) => s.completeness >= minCompleteness || s.status === "ready"
        );
      },

      // ── Packet Generation ──────────────────────────────────────────────────

      startPacketGeneration: () => {
        set({ isGeneratingPacket: true, packetProgress: 0 });
      },

      updatePacketProgress: (progress: number) => {
        set({ packetProgress: Math.min(100, Math.max(0, progress)) });
      },

      completePacketGeneration: () => {
        set({ isGeneratingPacket: false, packetProgress: 100 });
      },

      failPacketGeneration: (error: string) => {
        set({ isGeneratingPacket: false });
        console.error("[ClaimIQ] Packet generation failed:", error);
      },

      // ── Autopilot Actions ──────────────────────────────────────────────────

      setAutopilotPlan: (actions: AutopilotActionState[]) => {
        set({
          autopilotActions: actions,
          autopilotStatus: "planning",
          autopilotProgress: 0,
          autopilotCurrentAction: null,
        });
      },

      startAutopilot: () => {
        const actions = get().autopilotActions;
        const first = actions.find((a) => a.status === "pending" && a.autonomous);
        set({
          autopilotStatus: "running",
          autopilotCurrentAction: first?.field || null,
        });
      },

      updateAutopilotAction: (field: string, update: Partial<AutopilotActionState>) => {
        set((state) => ({
          autopilotActions: state.autopilotActions.map((a) =>
            a.field === field ? { ...a, ...update } : a
          ),
          autopilotCurrentAction:
            update.status === "running" ? field : state.autopilotCurrentAction,
        }));
      },

      advanceAutopilot: () => {
        const actions = get().autopilotActions;
        const completed = actions.filter(
          (a) => a.status === "completed" || a.status === "error" || a.status === "skipped"
        ).length;
        const total = actions.filter((a) => a.autonomous).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 100;

        const next = actions.find((a) => a.status === "pending" && a.autonomous);

        set({
          autopilotProgress: progress,
          autopilotCurrentAction: next?.field || null,
        });

        // If no more autonomous actions, complete
        if (!next) {
          set({ autopilotStatus: "completed", autopilotProgress: 100 });
        }
      },

      pauseAutopilot: () => {
        set({ autopilotStatus: "paused" });
      },

      resumeAutopilot: () => {
        set({ autopilotStatus: "running" });
      },

      completeAutopilot: () => {
        set({
          autopilotStatus: "completed",
          autopilotProgress: 100,
          autopilotCurrentAction: null,
        });
      },

      resetAutopilot: () => {
        set({
          autopilotStatus: "idle",
          autopilotActions: [],
          autopilotProgress: 0,
          autopilotCurrentAction: null,
        });
      },

      // ── UI Actions ─────────────────────────────────────────────────────────

      setActiveTab: (tab: string) => set({ activeTab: tab }),
      setPanelExpanded: (expanded: boolean) => set({ panelExpanded: expanded }),
      setActiveClaimId: (claimId: string) => set({ activeClaimId: claimId }),
    }),
    {
      name: "claimiq-store",
      version: 1,
      // Only persist UI preferences and section generation history
      partialize: (state) => ({
        sectionStates: state.sectionStates,
        activeTab: state.activeTab,
        panelExpanded: state.panelExpanded,
        // Don't persist transient runtime state
      }),
    }
  )
);
