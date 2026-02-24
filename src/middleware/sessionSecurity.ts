/**
 * Session Security
 *
 * Adds session timeout (30min) and refresh token rotation
 * Prevents session hijacking and unauthorized access
 */

import { NextRequest, NextResponse } from "next/server";

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh if < 5 minutes remaining

interface SessionData {
  userId: string;
  orgId: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  refreshToken?: string;
}

// In-memory session store (use Redis in production)
const sessionStore = new Map<string, SessionData>();

// Cleanup expired sessions every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [sessionId, session] of sessionStore.entries()) {
      if (session.expiresAt < now) {
        sessionStore.delete(sessionId);
      }
    }
  },
  10 * 60 * 1000
);

/**
 * Create new session
 */
export function createSession(
  userId: string,
  orgId: string
): { sessionId: string; expiresAt: number } {
  const now = Date.now();
  const sessionId = generateSessionId();

  const session: SessionData = {
    userId,
    orgId,
    createdAt: now,
    lastActivity: now,
    expiresAt: now + SESSION_TIMEOUT,
  };

  sessionStore.set(sessionId, session);

  return {
    sessionId,
    expiresAt: session.expiresAt,
  };
}

/**
 * Validate session
 */
export function validateSession(sessionId: string): {
  valid: boolean;
  session?: SessionData;
  shouldRefresh?: boolean;
} {
  const session = sessionStore.get(sessionId);

  if (!session) {
    return { valid: false };
  }

  const now = Date.now();

  // Check if expired
  if (session.expiresAt < now) {
    sessionStore.delete(sessionId);
    return { valid: false };
  }

  // Update last activity
  session.lastActivity = now;

  // Check if should refresh
  const timeRemaining = session.expiresAt - now;
  const shouldRefresh = timeRemaining < REFRESH_THRESHOLD;

  return {
    valid: true,
    session,
    shouldRefresh,
  };
}

/**
 * Refresh session
 */
export function refreshSession(sessionId: string): { sessionId: string; expiresAt: number } {
  const validation = validateSession(sessionId);

  if (!validation.valid || !validation.session) {
    throw new Error("Invalid session");
  }

  // Create new session with same user/org
  const newSession = createSession(validation.session.userId, validation.session.orgId);

  // Invalidate old session
  sessionStore.delete(sessionId);

  return newSession;
}

/**
 * Destroy session
 */
export function destroySession(sessionId: string): void {
  sessionStore.delete(sessionId);
}

/**
 * Generate secure session ID
 */
function generateSessionId(): string {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Get session from request
 */
export function getSessionFromRequest(req: NextRequest): string | null {
  // Try cookie first
  const sessionCookie = req.cookies.get("session")?.value;
  if (sessionCookie) {
    return sessionCookie;
  }

  // Try Authorization header
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Middleware for session validation
 */
export async function enforceSession(req: NextRequest): Promise<{ userId: string; orgId: string }> {
  const sessionId = getSessionFromRequest(req);

  if (!sessionId) {
    throw new Error("No session found");
  }

  const validation = validateSession(sessionId);

  if (!validation.valid || !validation.session) {
    throw new Error("Invalid or expired session");
  }

  return {
    userId: validation.session.userId,
    orgId: validation.session.orgId,
  };
}

/**
 * Session middleware wrapper
 */
export function withSession() {
  return async (req: NextRequest) => {
    const sessionId = getSessionFromRequest(req);

    if (!sessionId) {
      return new NextResponse(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validation = validateSession(sessionId);

    if (!validation.valid) {
      return new NextResponse(JSON.stringify({ error: "Session expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // If session should be refreshed, include new session in response headers
    if (validation.shouldRefresh) {
      const newSession = refreshSession(sessionId);

      return new NextResponse(null, {
        headers: {
          "X-Session-Refresh": "true",
          "X-New-Session-Id": newSession.sessionId,
          "X-Session-Expires": newSession.expiresAt.toString(),
        },
      });
    }

    return null; // Allow request to proceed
  };
}

/**
 * Get all active sessions for user
 */
export function getUserSessions(userId: string): SessionData[] {
  const sessions: SessionData[] = [];

  for (const [_sessionId, session] of sessionStore.entries()) {
    if (session.userId === userId) {
      sessions.push(session);
    }
  }

  return sessions;
}

/**
 * Destroy all sessions for user
 */
export function destroyAllUserSessions(userId: string): void {
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId === userId) {
      sessionStore.delete(sessionId);
    }
  }
}

/**
 * Check for concurrent sessions
 */
export function checkConcurrentSessions(userId: string, maxSessions: number = 5): boolean {
  const sessions = getUserSessions(userId);
  return sessions.length < maxSessions;
}

/**
 * Get session statistics
 */
export function getSessionStats(): {
  total: number;
  active: number;
  expired: number;
} {
  const now = Date.now();
  let active = 0;
  let expired = 0;

  for (const [, session] of sessionStore.entries()) {
    if (session.expiresAt >= now) {
      active++;
    } else {
      expired++;
    }
  }

  return {
    total: sessionStore.size,
    active,
    expired,
  };
}
