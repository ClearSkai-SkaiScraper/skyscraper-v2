/**
 * Sprint 27 — Remote View Context
 *
 * Allows admin/owner to view any team member's workspace,
 * and managers to view their direct reports — all read-only.
 *
 * When active:
 *   - x-remote-view-user cookie is set with the target userId
 *   - All data fetching scopes to the viewed user
 *   - A persistent banner shows "Viewing as [Name]"
 *   - A read-only overlay prevents mutations
 */

"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RemoteViewTarget {
  userId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface RemoteViewState {
  /** Whether Remote View is currently active */
  active: boolean;
  /** The user being viewed */
  target: RemoteViewTarget | null;
  /** Loading state during start/stop */
  loading: boolean;
}

interface RemoteViewContextValue extends RemoteViewState {
  /** Start viewing as a team member */
  startRemoteView: (target: RemoteViewTarget) => Promise<void>;
  /** Stop Remote View and return to own account */
  stopRemoteView: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const RemoteViewContext = createContext<RemoteViewContextValue>({
  active: false,
  target: null,
  loading: false,
  startRemoteView: async () => {},
  stopRemoteView: async () => {},
});

// ─── Cookie helpers ──────────────────────────────────────────────────────────

const COOKIE_NAME = "x-remote-view-user";

function getRemoteViewCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setRemoteViewCookie(value: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)};path=/;max-age=3600;SameSite=Lax`;
}

function clearRemoteViewCookie() {
  document.cookie = `${COOKIE_NAME}=;path=/;max-age=0;SameSite=Lax`;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function RemoteViewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RemoteViewState>({
    active: false,
    target: null,
    loading: false,
  });

  // Restore from cookie + localStorage on mount
  useEffect(() => {
    const cookieValue = getRemoteViewCookie();
    if (cookieValue) {
      // Cookie stores plain userId; full target is in localStorage
      try {
        const stored =
          typeof window !== "undefined" ? localStorage.getItem("x-remote-view-target") : null;
        if (stored) {
          const target = JSON.parse(stored) as RemoteViewTarget;
          if (target.userId === cookieValue) {
            setState({ active: true, target, loading: false });
            return;
          }
        }
        // Fallback: cookie has userId but localStorage is missing/stale — still active but minimal target
        setState({
          active: true,
          target: { userId: cookieValue, name: "Team Member", email: "", role: "" },
          loading: false,
        });
      } catch {
        clearRemoteViewCookie();
      }
    }
  }, []);

  const startRemoteView = useCallback(async (target: RemoteViewTarget) => {
    setState({ active: false, target: null, loading: true });
    try {
      const res = await fetch("/api/remote-view/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: target.userId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start Remote View");
      }

      // Store target userId in cookie for server-side reads (must match server's plain userId format)
      setRemoteViewCookie(target.userId);
      // Also store full target in localStorage for client-side restoration
      if (typeof window !== "undefined") {
        localStorage.setItem("x-remote-view-target", JSON.stringify(target));
      }
      setState({ active: true, target, loading: false });

      // Full page reload to re-fetch all data scoped to the viewed user
      window.location.reload();
    } catch (err: any) {
      setState({ active: false, target: null, loading: false });
      throw err;
    }
  }, []);

  const stopRemoteView = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      await fetch("/api/remote-view/stop", { method: "POST" });
    } catch {
      // Best effort
    }
    clearRemoteViewCookie();
    if (typeof window !== "undefined") {
      localStorage.removeItem("x-remote-view-target");
    }
    setState({ active: false, target: null, loading: false });

    // Full page reload to return to own data
    window.location.reload();
  }, []);

  return (
    <RemoteViewContext.Provider value={{ ...state, startRemoteView, stopRemoteView }}>
      {children}
    </RemoteViewContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useRemoteView() {
  return useContext(RemoteViewContext);
}

/** Returns true if we're currently in Remote View mode */
export function useIsRemoteView(): boolean {
  return useContext(RemoteViewContext).active;
}
