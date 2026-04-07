"use client";

import { useAuth } from "@clerk/nextjs";
import { logger } from "@/lib/logger";
import { useEffect, useRef,useState } from "react";

/**
 * Hook to automatically initialize user account on first login
 * Creates org, user, and starts trial if needed
 */
export function useAutoInit() {
  const { userId, orgId, isLoaded } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    // Only run once per session
    if (!isLoaded || !userId || hasRun.current) return;

    hasRun.current = true;

    const initUser = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/me/init", {
          method: "POST",
        });

        const data = await response.json();

        if (data.ok) {
          console.log("[AUTO_INIT] User initialized:", {
            createdOrg: data.createdOrg,
            createdUser: data.createdUser,
            orgId: data.orgId,
            userId: data.userId,
          });
          setInitialized(true);
        } else {
          console.error("[AUTO_INIT] Failed:", data.error);
          setError(data.error || "Initialization failed");
          setInitialized(true); // Mark as initialized even on error to prevent loop
        }
      } catch (err) {
        logger.error("[AUTO_INIT] Error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setInitialized(true); // Mark as initialized even on error to prevent loop
      } finally {
        setLoading(false);
      }
    };

    // Initialize on mount
    void initUser();
  }, [userId, isLoaded]); // Only depend on userId and isLoaded

  return { initialized, loading, error };
}
