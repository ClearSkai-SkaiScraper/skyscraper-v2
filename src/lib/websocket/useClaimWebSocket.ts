"use client";

/**
 * WebSocket Client Hook
 *
 * Usage:
 * const { connected, events } = useClaimWebSocket(claimId);
 *
 * // Listen for events:
 * useEffect(() => {
 *   if (events.timeline) {
 *     // Handle new timeline event
 *   }
 * }, [events.timeline]);
 */

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

import { APP_URL } from "@/lib/env";
import { logger } from "@/lib/logger";

interface ClaimEvents {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timeline?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  note?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  photo?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  claimUpdate?: any;
}

export function useClaimWebSocket(claimId: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<ClaimEvents>({});

  useEffect(() => {
    if (!claimId) return;

    // Initialize socket connection
    const socketIO = io(APP_URL, {
      transports: ["websocket", "polling"],
    });

    socketIO.on("connect", () => {
      logger.debug("[WebSocket] Connected");
      setConnected(true);
      socketIO.emit("join:claim", claimId);
    });

    socketIO.on("disconnect", () => {
      logger.debug("[WebSocket] Disconnected");
      setConnected(false);
    });

    // Listen for claim-specific events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socketIO.on("timeline:new", (data: any) => {
      logger.debug("[WebSocket] New timeline event:", data);
      setEvents((prev) => ({ ...prev, timeline: data }));
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socketIO.on("note:new", (data: any) => {
      logger.debug("[WebSocket] New note:", data);
      setEvents((prev) => ({ ...prev, note: data }));
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socketIO.on("document:new", (data: any) => {
      logger.debug("[WebSocket] New document:", data);
      setEvents((prev) => ({ ...prev, document: data }));
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socketIO.on("photo:new", (data: any) => {
      logger.debug("[WebSocket] New photo:", data);
      setEvents((prev) => ({ ...prev, photo: data }));
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socketIO.on("claim:updated", (data: any) => {
      logger.debug("[WebSocket] Claim updated:", data);
      setEvents((prev) => ({ ...prev, claimUpdate: data }));
    });

    setSocket(socketIO);

    return () => {
      logger.debug("[WebSocket] Cleaning up");
      if (claimId) {
        socketIO.emit("leave:claim", claimId);
      }
      socketIO.disconnect();
    };
  }, [claimId]);

  return { socket, connected, events };
}
