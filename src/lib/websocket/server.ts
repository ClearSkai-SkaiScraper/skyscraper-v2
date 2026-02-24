/**
 * WebSocket Server for Real-time Updates
 *
 * Handles:
 * - Timeline event notifications
 * - Note additions
 * - Document uploads
 * - Photo uploads
 * - Claim status changes
 */

import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import { logger } from "@/lib/logger";

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    logger.debug(`[WebSocket] Client connected: ${socket.id}`);

    // Join claim-specific room
    socket.on("join:claim", (claimId: string) => {
      socket.join(`claim:${claimId}`);
      logger.debug(`[WebSocket] ${socket.id} joined claim:${claimId}`);
    });

    // Leave claim-specific room
    socket.on("leave:claim", (claimId: string) => {
      socket.leave(`claim:${claimId}`);
      logger.debug(`[WebSocket] ${socket.id} left claim:${claimId}`);
    });

    socket.on("disconnect", () => {
      logger.debug(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("WebSocket server not initialized. Call initializeWebSocket first.");
  }
  return io;
}

// Emit events to claim room
export function emitToClaimRoom(claimId: string, event: string, data: any) {
  const socketIO = getIO();
  socketIO.to(`claim:${claimId}`).emit(event, data);
}

// Event emitters for specific actions
export function notifyTimelineEvent(claimId: string, event: any) {
  emitToClaimRoom(claimId, "timeline:new", event);
}

export function notifyNoteAdded(claimId: string, note: any) {
  emitToClaimRoom(claimId, "note:new", note);
}

export function notifyDocumentUploaded(claimId: string, document: any) {
  emitToClaimRoom(claimId, "document:new", document);
}

export function notifyPhotoUploaded(claimId: string, photo: any) {
  emitToClaimRoom(claimId, "photo:new", photo);
}

export function notifyClaimUpdated(claimId: string, changes: any) {
  emitToClaimRoom(claimId, "claim:updated", changes);
}
