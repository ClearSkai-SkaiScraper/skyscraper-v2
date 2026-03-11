/**
 * ============================================================================
 * useRetryQueue — React Hook for Dead Letter Queue Replay
 * ============================================================================
 *
 * Mount this in the claims layout to automatically retry failed saves
 * when the user returns to the app.
 *
 * Usage:
 *   import { useRetryQueue } from "@/hooks/useRetryQueue";
 *
 *   function ClaimsLayout({ children }) {
 *     useRetryQueue();
 *     return <>{children}</>;
 *   }
 *
 * ============================================================================
 */

"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { retryQueue } from "@/lib/client/retryQueue";

export function useRetryQueue() {
  const hasRun = useRef(false);

  useEffect(() => {
    // Only run once per session
    if (hasRun.current) return;
    hasRun.current = true;

    const replay = async () => {
      const queueSize = retryQueue.size();
      if (queueSize === 0) return;

      // Show user that we're recovering data
      toast.info(`Recovering ${queueSize} unsaved change${queueSize === 1 ? "" : "s"}...`, {
        duration: 3000,
      });

      const result = await retryQueue.replayAll();

      if (result.succeeded > 0) {
        toast.success(
          `✅ Recovered ${result.succeeded} unsaved change${result.succeeded === 1 ? "" : "s"}`,
          { duration: 4000 }
        );
      }

      if (result.failed > 0) {
        toast.warning(
          `⚠️ ${result.failed} change${result.failed === 1 ? "" : "s"} could not be saved — please re-enter`,
          { duration: 6000 }
        );
      }

      if (result.expired > 0) {
        // Silently discard expired items — no point alerting user
        retryQueue.clear();
      }
    };

    // Small delay to avoid blocking initial render
    const timer = setTimeout(replay, 2000);
    return () => clearTimeout(timer);
  }, []);
}
