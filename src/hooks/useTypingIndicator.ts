/**
 * #172 — Typing Indicator Hook (Supabase Realtime Broadcast)
 *
 * Uses Supabase Realtime broadcast events on a conversation channel
 * to signal and receive typing indicators.
 *
 * - `startTyping()` — broadcasts that the current user is typing
 * - `stopTyping()`  — explicitly clears the local broadcast
 * - Auto-clears remote indicators after 3 seconds of silence
 * - Debounced: calling `startTyping()` repeatedly resets the 3 s timer
 *
 * Usage:
 * ```ts
 * const { typingUsers, startTyping, stopTyping } = useTypingIndicator(threadId, userId);
 * ```
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

// How long (ms) before a remote indicator is considered stale.
const TYPING_TIMEOUT_MS = 3_000;

interface TypingEntry {
  userId: string;
  ts: number;
}

export function useTypingIndicator(
  conversationId: string | null | undefined,
  currentUserId: string | null | undefined
) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entriesRef = useRef<Map<string, number>>(new Map());

  // ── Subscribe to broadcast typing events ─────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    try {
      void supabase.channel;
    } catch {
      return; // Supabase not configured
    }

    const channelName = `typing:${conversationId}`;

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "typing" }, (payload) => {
        const entry = payload.payload as TypingEntry | undefined;
        if (!entry?.userId) return;

        // Ignore own typing events
        if (entry.userId === currentUserId) return;

        entriesRef.current.set(entry.userId, entry.ts);
        flush();
      });

    channel.subscribe();
    channelRef.current = channel;

    // Periodic cleanup of stale entries
    const cleanupInterval = setInterval(flush, TYPING_TIMEOUT_MS);

    const currentEntries = entriesRef.current;
    return () => {
      clearInterval(cleanupInterval);
      void supabase.removeChannel(channel);
      channelRef.current = null;
      currentEntries.clear();
      setTypingUsers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId]);

  // ── Flush: derive typingUsers from the entries map ───────────────────
  function flush() {
    const now = Date.now();
    const active: string[] = [];
    entriesRef.current.forEach((ts, uid) => {
      if (now - ts < TYPING_TIMEOUT_MS) {
        active.push(uid);
      } else {
        entriesRef.current.delete(uid);
      }
    });
    setTypingUsers((prev) => {
      // Only update if the set changed (avoids unnecessary re-renders)
      if (prev.length === active.length && prev.every((u) => active.includes(u))) return prev;
      return active;
    });
  }

  // ── startTyping ──────────────────────────────────────────────────────
  const startTyping = useCallback(() => {
    if (!channelRef.current || !currentUserId) return;

    // Clear any pending stop-timer so it doesn't fire prematurely
    if (debounceRef.current) clearTimeout(debounceRef.current);

    void channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId, ts: Date.now() } satisfies TypingEntry,
    });

    // Auto-stop after 3 seconds of inactivity
    debounceRef.current = setTimeout(() => {
      // No explicit "stopped" event needed — remote side auto-expires
    }, TYPING_TIMEOUT_MS);
  }, [currentUserId]);

  // ── stopTyping (explicit) ────────────────────────────────────────────
  const stopTyping = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  return { typingUsers, startTyping, stopTyping };
}
