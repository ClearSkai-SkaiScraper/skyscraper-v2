/**
 * usePresenceHeartbeat — fires a heartbeat on mount and every 2 minutes
 * Import this in your main layout or page to keep lastSeenAt fresh.
 */

"use client";

import { useEffect } from "react";

export function usePresenceHeartbeat() {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function beat() {
      try {
        await fetch("/api/presence/heartbeat", { method: "POST" });
      } catch {
        // Silently fail
      }
    }

    // Immediate heartbeat
    void beat();

    // Then every 2 minutes
    interval = setInterval(beat, 2 * 60 * 1000);

    // Also beat on visibility change (tab focus)
    function onVisibility() {
      if (document.visibilityState === "visible") void beat();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
