/**
 * #174 — Read Receipts Hook (Supabase Realtime + API)
 *
 * Tracks which messages in a thread have been read and by whom.
 * - Subscribes to UPDATE events on the `Message` table so read-status
 *   changes appear in real-time.
 * - Exposes `markAsRead(messageId)` to mark a single message as read
 *   via the existing API route.
 * - Returns a `readBy` map: messageId → Date (when it was read).
 *
 * Usage:
 *   const { readBy, markAsRead } = useReadReceipts(threadId);
 *   readBy.get("msg_abc"); // Date | undefined
 *   await markAsRead("msg_abc");
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";

import { supabase } from "@/integrations/supabase/client";

export function useReadReceipts(conversationId: string | null | undefined) {
  const [readBy, setReadBy] = useState<Map<string, Date>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Subscribe to Message UPDATE events (read toggling) ───────────────
  useEffect(() => {
    if (!conversationId) return;

    try {
      void supabase.channel;
    } catch {
      return; // Supabase not configured
    }

    const channel = supabase
      .channel(`read-receipts:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Message",
          filter: `threadId=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, any>;
          if (row.read) {
            setReadBy((prev) => {
              const next = new Map(prev);
              if (!next.has(row.id)) {
                next.set(row.id, new Date());
              }
              return next;
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId]);

  // ── Load initial read state when messages arrive ─────────────────────
  const seedFromMessages = useCallback(
    (messages: Array<{ id: string; read?: boolean; createdAt?: string }>) => {
      setReadBy((prev) => {
        const next = new Map(prev);
        for (const m of messages) {
          if (m.read && !next.has(m.id)) {
            next.set(m.id, m.createdAt ? new Date(m.createdAt) : new Date());
          }
        }
        return next;
      });
    },
    []
  );

  // ── Mark a single message as read via API ────────────────────────────
  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!conversationId) return;

      // Optimistic update
      setReadBy((prev) => {
        const next = new Map(prev);
        next.set(messageId, new Date());
        return next;
      });

      try {
        const res = await fetch(`/api/messages/${conversationId}/${messageId}/read`, {
          method: "PATCH",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        // Roll back optimistic update
        setReadBy((prev) => {
          const next = new Map(prev);
          next.delete(messageId);
          return next;
        });
        logger.error("[useReadReceipts] markAsRead failed:", err);
      }
    },
    [conversationId]
  );

  // ── Mark all unread messages as read ─────────────────────────────────
  const markAllAsRead = useCallback(
    async (messageIds: string[]) => {
      await Promise.allSettled(messageIds.map((id) => markAsRead(id)));
    },
    [markAsRead]
  );

  return { readBy, markAsRead, markAllAsRead, seedFromMessages };
}
