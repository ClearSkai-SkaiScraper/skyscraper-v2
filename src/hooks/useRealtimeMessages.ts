/**
 * #171 — Real-Time Messaging Hook (Supabase Realtime)
 *
 * Subscribes to a conversation channel and delivers messages in real-time.
 * Uses the project's shared Supabase client and `postgres_changes` pattern.
 *
 * Features:
 * - Real-time INSERT listening on the `Message` table
 * - Optimistic message sending via `/api/messages/send`
 * - Auto-loads existing messages from `/api/messages/:conversationId`
 * - Cleans up subscription on unmount
 *
 * Usage:
 * ```ts
 * const { messages, isConnected, sendMessage } = useRealtimeMessages(threadId);
 * ```
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RealtimeMessage {
  id: string;
  threadId: string;
  senderUserId: string;
  senderType: string;
  body: string;
  read: boolean;
  fromPortal: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRealtimeMessages(conversationId: string | null | undefined) {
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Load existing messages ───────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/messages/${conversationId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          // API returns thread with nested Message array
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const msgs: RealtimeMessage[] = (data.messages ?? data.Message ?? []).map((m: any) => ({
            id: m.id,
            threadId: m.threadId ?? conversationId,
            senderUserId: m.senderUserId ?? "",
            senderType: m.senderType ?? "unknown",
            body: m.body ?? m.content ?? "",
            read: m.read ?? false,
            fromPortal: m.fromPortal ?? false,
            createdAt: m.createdAt ?? new Date().toISOString(),
          }));
          setMessages(msgs);
        }
      } catch (err) {
        if (!cancelled) setError(String(err));
        logger.error("[useRealtimeMessages] Failed to load messages:", err);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // ── Supabase Realtime subscription ───────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    // Guard: if Supabase is a proxy stub (env vars missing), skip.
    try {
      // Accessing .channel will throw if supabase is the missing-env proxy.
      void supabase.channel;
    } catch {
      setError("Supabase not configured");
      return;
    }

    const channel = supabase
      .channel(`thread:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `threadId=eq.${conversationId}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = payload.new as Record<string, any>;
          const incoming: RealtimeMessage = {
            id: row.id,
            threadId: row.threadId,
            senderUserId: row.senderUserId ?? "",
            senderType: row.senderType ?? "unknown",
            body: row.body ?? "",
            read: row.read ?? false,
            fromPortal: row.fromPortal ?? false,
            createdAt: row.createdAt ?? new Date().toISOString(),
          };

          // Deduplicate (replace optimistic temp- message if present)
          setMessages((prev) => {
            const withoutTemp = prev.filter(
              (m) => !m.id.startsWith("temp-") || m.body !== incoming.body
            );
            // Avoid duplicate if already present (e.g. optimistic + realtime race)
            if (withoutTemp.some((m) => m.id === incoming.id)) return withoutTemp;
            return [...withoutTemp, incoming];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Message",
          filter: `threadId=eq.${conversationId}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = payload.new as Record<string, any>;
          setMessages((prev) =>
            prev.map((m) => (m.id === row.id ? { ...m, read: row.read ?? m.read } : m))
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
        if (status === "CHANNEL_ERROR") {
          setError("Realtime channel error");
        }
      });

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [conversationId]);

  // ── Send message ─────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (body: string) => {
      if (!conversationId || !body.trim()) return false;

      // Optimistic insert
      const tempId = `temp-${Date.now()}`;
      const optimistic: RealtimeMessage = {
        id: tempId,
        threadId: conversationId,
        senderUserId: "__self__",
        senderType: "pro",
        body,
        read: false,
        fromPortal: false,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const res = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId: conversationId, body }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return true;
      } catch (err) {
        // Roll back optimistic insert
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        logger.error("[useRealtimeMessages] Send failed:", err);
        return false;
      }
    },
    [conversationId]
  );

  return { messages, isConnected, sendMessage, error };
}
