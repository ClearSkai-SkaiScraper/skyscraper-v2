"use client";

// ============================================================================
// AUTOSAVE HOOK - Phase 3
// ============================================================================
// Auto-saves draft state every 5 seconds or on blur

import { useCallback, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";

interface AutosaveOptions {
  reportId: string;
  data: any;
  enabled?: boolean;
  interval?: number; // milliseconds
  onSave?: (data: any) => Promise<void>;
  onError?: (error: Error) => void;
}

export function useAutosave({
  reportId,
  data,
  enabled = true,
  interval = 5000,
  onSave,
  onError,
}: AutosaveOptions) {
  const [debouncedData] = useDebounce(data, interval);
  const lastSaved = useRef<string | null>(null);
  const isSaving = useRef(false);

  const saveDraft = useCallback(
    async (dataToSave: any) => {
      if (!enabled || isSaving.current) return;

      const dataString = JSON.stringify(dataToSave);
      if (dataString === lastSaved.current) return;

      isSaving.current = true;

      try {
        const res = await fetch(`/api/reports/${reportId}/draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draftState: dataToSave,
            lastAutosave: new Date().toISOString(),
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to save draft");
        }

        lastSaved.current = dataString;
        if (onSave) await onSave(dataToSave);
      } catch (error: any) {
        console.error("[Autosave]", error);
        if (onError) onError(error);
      } finally {
        isSaving.current = false;
      }
    },
    [reportId, enabled, onSave, onError]
  );

  // Auto-save on data change (debounced)
  useEffect(() => {
    if (enabled && debouncedData) {
      void saveDraft(debouncedData);
    }
  }, [debouncedData, enabled, saveDraft]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (enabled && data) {
        // Immediate save without debounce
        void saveDraft(data);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    saveDraft: () => saveDraft(data),
    isSaving: isSaving.current,
  };
}
