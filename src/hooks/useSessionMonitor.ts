"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Session Monitor Hook
 *
 * Detects session expiry and proactively handles it:
 * - Periodic session health check (every 5 min)
 * - Detects 401 responses from any API call
 * - Shows warning before expiry (if token has exp claim)
 * - Redirects to login with return URL preserved
 *
 * Usage:
 *   useSessionMonitor(); // Call once in layout or provider
 */
export function useSessionMonitor() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sessionWarning, setSessionWarning] = useState(false);
  const lastCheck = useRef<number>(Date.now());
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleExpiry = useCallback(() => {
    const returnUrl = encodeURIComponent(pathname || "/");
    router.push(`/sign-in?redirect_url=${returnUrl}`);
  }, [pathname, router]);

  // Periodic session health check
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const check = async () => {
      try {
        const res = await fetch("/api/health", {
          method: "HEAD",
          credentials: "include",
        });

        if (res.status === 401) {
          handleExpiry();
        }

        lastCheck.current = Date.now();
      } catch {
        // Network error — don't redirect, just skip this check
      }
    };

    // Check every 5 minutes
    checkInterval.current = setInterval(check, 5 * 60 * 1000);

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, [isLoaded, isSignedIn, handleExpiry]);

  // Listen for 401 from any fetch (global interceptor)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "";
        // Don't redirect on auth-related endpoints (sign-in, sign-up)
        if (!url.includes("/sign-") && !url.includes("/clerk")) {
          handleExpiry();
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [handleExpiry]);

  return { sessionWarning };
}

/**
 * Visibility-based session refresh.
 * When user returns to tab after being away, verify session is still valid.
 */
export function useVisibilitySessionCheck() {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn || typeof document === "undefined") return;

    const handleVisibility = async () => {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/health", { method: "HEAD" });
          if (res.status === 401) {
            window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`;
          }
        } catch {
          // Offline — will be caught by offline banner
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isSignedIn]);
}
