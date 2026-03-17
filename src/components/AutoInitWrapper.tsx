"use client";

import { useEffect } from "react";

import { useAutoInit } from "@/hooks/useAutoInit";
import { logger } from "@/lib/logger";

/**
 * Client component that auto-initializes user on first dashboard load
 * This ensures user/org are created and trial is started
 * IMPORTANT: Does not block rendering - runs in background
 */
export function AutoInitWrapper({ children }: { children: React.ReactNode }) {
  const { initialized, loading, error } = useAutoInit();

  useEffect(() => {
    if (error) {
      logger.error("[DASHBOARD] Auto-init error:", error);
    }
    if (initialized) {
      logger.debug("[DASHBOARD] Auto-init complete");
    }
  }, [error, initialized]);

  // NEVER block rendering - always show children immediately
  // The initialization happens in the background
  return <>{children}</>;
}
