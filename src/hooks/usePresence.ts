/**
 * #173 — Online Presence Hook (Supabase Realtime Presence)
 *
 * Tracks which users are currently online using Supabase Realtime presence.
 * Each user joins a shared presence channel; the hook automatically tracks
 * joins/leaves and exposes the set of online user IDs.
 *
 * Usage:
 *   const { onlineUsers, isOnline } = usePresence("global", myUserId);
 *   // or scope to a thread:
 *   const { onlineUsers, isOnline } = usePresence(threadId, myUserId);
 *   isOnline("user_abc"); // true | false
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export function usePresence(
  channelName: string | null | undefined,
  currentUserId: string | null | undefined
) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!channelName || !currentUserId) return;

    // Guard: Supabase not configured
    try {
      void supabase.channel;
    } catch {
      return;
    }

    const presenceChannel = supabase.channel(`presence:${channelName}`);

    // Sync presence state whenever it changes
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<{ userId: string }>();
        const ids = new Set<string>();
        for (const key of Object.keys(state)) {
          for (const entry of state[key]) {
            if (entry.userId) ids.add(entry.userId);
          }
        }
        setOnlineUsers(ids);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          for (const p of newPresences) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((p as any).userId) next.add((p as any).userId);
          }
          return next;
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          for (const p of leftPresences) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((p as any).userId) next.delete((p as any).userId);
          }
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            userId: currentUserId,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = presenceChannel;

    // Re-track on visibility change (tab refocus)
    function onVisibility() {
      if (document.visibilityState === "visible" && channelRef.current) {
        void channelRef.current.track({
          userId: currentUserId,
          online_at: new Date().toISOString(),
        });
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void supabase.removeChannel(presenceChannel);
      channelRef.current = null;
      setOnlineUsers(new Set());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, currentUserId]);

  // ── Helper: check if a specific user is online ───────────────────────
  const isOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers]);

  return { onlineUsers, isOnline };
}
