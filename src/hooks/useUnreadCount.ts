/**
 * #175 — Unread Message Count Hook (Polling + Supabase Realtime)
 *
 * Provides a global unread-message count for the current user.
 * Strategy:
 * 1. Fetches from `/api/nav/badges` on mount (same endpoint the sidebar uses).
 * 2. Re-polls every `pollIntervalMs` (default 30 s).
 * 3. Also listens for Supabase Realtime INSERTs on the `Message` table;
 *    when a new message arrives the count is optimistically incremented
 *    and then re-fetched to stay accurate.
 *
 * Usage:
 *   const { unreadCount, refresh } = useUnreadCount();
 *   // or with a custom interval:
 *   const { unreadCount } = useUnreadCount({ pollIntervalMs: 15_000 });
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

interface UseUnreadCountOptions {
  /** Polling interval in ms. Default 30 000. Set 0 to disable polling. */
  pollIntervalMs?: number;
  /** If true, also subscribe to Supabase Realtime for instant bumps. */
  realtime?: boolean;
}

export function useUnreadCount(options: UseUnreadCountOptions = {}) {
  const { pollIntervalMs = 30_000, realtime = true } = options;

  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch from badges API ────────────────────────────────────────────
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/nav/badges");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && typeof data.data?.unreadMessages === "number") {
        setUnreadCount(data.data.unreadMessages);
      }
    } catch {
      // Silently fail — badges are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    void fetchCount();
    if (!pollIntervalMs) return;

    const interval = setInterval(fetchCount, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchCount, pollIntervalMs]);

  // ── Supabase Realtime: optimistic bump on new message ────────────────
  useEffect(() => {
    if (!realtime) return;

    try {
      void supabase.channel;
    } catch {
      return; // Supabase not configured
    }

    const channel = supabase
      .channel("unread-count-global")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
        },
        () => {
          // Optimistically bump, then reconcile with a re-fetch
          setUnreadCount((prev) => prev + 1);
          // Debounced re-fetch to reconcile
          setTimeout(fetchCount, 1_500);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [realtime, fetchCount]);

  // ── Also re-fetch on tab focus ───────────────────────────────────────
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") void fetchCount();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchCount]);

  return { unreadCount, loading, refresh: fetchCount };
}
