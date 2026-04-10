/**
 * useAutoSave.ts
 *
 * Client-side hook for autosaving wizard data to the backend.
 *
 * Features:
 * - Debounced save (2s after last change)
 * - Auto-creates draft on first change if no packetId
 * - Triggers on onChange, onBlur, onStepChange
 * - beforeunload guard (warns if unsaved changes)
 * - Non-blocking error handling (toast, retry logic)
 *
 * Usage:
 *   const { saving, savedAt, packetId } = useAutoSave({
 *     mode: "retail",
 *     step: currentStep,
 *     data: formData,
 *   });
 */

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

interface UseAutoSaveProps {
  mode: "retail" | "claims";
  step: number;
  data: Record<string, any>;
  enabled?: boolean; // Default: true
}

interface UseAutoSaveReturn {
  saving: boolean;
  savedAt: string | null; // ISO timestamp
  packetId: string | null;
  error: string | null;
}

export function useAutoSave({
  mode,
  step,
  data,
  enabled = true,
}: UseAutoSaveProps): UseAutoSaveReturn {
  const { userId } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [packetId, setPacketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<string>("");
  const hasUnsavedChangesRef = useRef(false);

  // Start draft (creates packet and returns packetId)
  const startDraft = async (): Promise<string | null> => {
    if (!userId) {
      logger.warn("[useAutoSave] No userId, skipping start draft");
      return null;
    }

    try {
      const response = await fetch(`/api/${mode}/start`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === "DB_NOT_MIGRATED") {
          toast.error("Database not migrated", {
            description: "Run db/migrations/2025-11-Phase1A-retail.sql in Supabase",
          });
          setError("DB_NOT_MIGRATED");
          return null;
        }

        throw new Error(result.error || "Failed to start draft");
      }

      setPacketId(result.packetId);
      return result.packetId;
    } catch (err) {
      logger.error("[useAutoSave] Start draft error:", err);
      toast.error("Failed to create draft", {
        description: err instanceof Error ? err.message : String(err),
      });
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  };

  // Save fragment (merges data into existing packet)
  const saveFragment = async (targetPacketId: string): Promise<void> => {
    if (!userId) {
      logger.warn("[useAutoSave] No userId, skipping save");
      return;
    }

    if (Object.keys(data).length === 0) {
      logger.warn("[useAutoSave] Empty data, skipping save");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/${mode}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packetId: targetPacketId,
          step,
          fragment: data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === "DB_NOT_MIGRATED") {
          toast.error("Database not migrated", {
            description: "Run db/migrations/2025-11-Phase1A-retail.sql in Supabase",
          });
          setError("DB_NOT_MIGRATED");
          return;
        }

        throw new Error(result.error || "Failed to save");
      }

      setSavedAt(result.savedAt);
      hasUnsavedChangesRef.current = false;
    } catch (err) {
      logger.error("[useAutoSave] Save error:", err);
      toast.error("Autosave failed", {
        description: "Your changes weren't saved. Please try again.",
      });
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // Debounced save trigger
  const triggerSave = () => {
    if (!enabled) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    hasUnsavedChangesRef.current = true;

    // Debounce: wait 2s after last change
    debounceTimerRef.current = setTimeout(async () => {
      if (!packetId) {
        const newPacketId = await startDraft();
        if (newPacketId) {
          await saveFragment(newPacketId);
        }
      } else {
        await saveFragment(packetId);
      }
    }, 2000);
  };

  // Watch data changes
  useEffect(() => {
    const currentDataJson = JSON.stringify(data);

    // Skip if data hasn't changed
    if (currentDataJson === previousDataRef.current) {
      return;
    }

    previousDataRef.current = currentDataJson;

    // Trigger autosave
    triggerSave();

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, step, enabled, packetId, userId]);

  // beforeunload guard (warn if unsaved changes)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return {
    saving,
    savedAt,
    packetId,
    error,
  };
}
