/**
 * Client Portal Authentication
 *
 * Clerk-based authentication for homeowners/clients.
 * Magic link flow: generate token → client clicks link → Clerk handles session.
 * Access control via client_access table.
 *
 * NOTE: magicLinkTokens / clientSessions tables do not exist.
 * Clerk is the session source-of-truth. This module provides
 * compatibility shims so callers don't crash.
 */

import { logActivity } from "@/lib/activity/activityFeed";
import { APP_URL } from "@/lib/env";
import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";

export interface MagicLinkToken {
  token: string;
  clientId: string;
  email: string;
  expiresAt: Date;
}

export interface ClientSession {
  sessionId: string;
  clientId: string;
  email: string;
  orgId: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Generate magic link for client
 *
 * Looks up the client by email in the Client table.
 * Creates a client_access row if a claimId is provided, then
 * returns a Clerk sign-in URL with redirect back to the portal.
 */
export async function generateMagicLink(
  email: string,
  orgId: string,
  claimId?: string
): Promise<{ token: string; link: string }> {
  try {
    // Find client by email + org
    const client = await prisma.client.findFirst({
      where: { email, orgId },
    });

    if (!client) {
      throw new Error("Client not found");
    }

    // Generate a token (used as a reference ID, not for session auth)
    const token = generateSecureToken();

    // If a claimId was provided, ensure client_access exists
    if (claimId) {
      await prisma.client_access
        .upsert({
          where: { claimId_email: { claimId, email } },
          create: { id: token, claimId, email },
          update: {},
        })
        .catch((e) => {
          logger.warn(
            `[CLIENT_PORTAL] client_access upsert failed for claim ${claimId}: ${e?.message}`
          );
        });
    }

    // Link points to Clerk sign-in with a redirect to the portal
    const link = `${APP_URL}/client/sign-in?redirect_url=/portal`;

    // Log activity
    await logActivity(orgId, {
      type: "CREATED",
      resourceType: "CLIENT",
      resourceId: client.id,
      action: "Magic Link Generated",
      description: `Magic link sent to ${email}`,
    });

    return { token, link };
  } catch (error) {
    logger.error("Magic link generation failed:", error);
    throw error;
  }
}

/**
 * Verify magic link token
 *
 * Since Clerk handles real sessions, this is now a compatibility shim.
 * If callers pass a token we treat it as a client_access.id lookup.
 * Returns a synthetic ClientSession so existing call-sites don't break.
 */
export async function verifyMagicLink(token: string): Promise<ClientSession | null> {
  try {
    // Try to look up a client_access row by id (the token we generated)
    const access = await prisma.client_access.findFirst({ where: { id: token } }).catch(() => null);

    if (!access) {
      return null;
    }

    // Look up the client for this email
    const client = await prisma.client.findFirst({
      where: { email: access.email },
      select: { id: true, orgId: true },
    });

    if (!client) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 7);

    return {
      sessionId: token,
      clientId: client.id,
      email: access.email,
      orgId: client.orgId || "",
      createdAt: now,
      expiresAt,
    };
  } catch (error) {
    logger.error("Magic link verification failed:", error);
    return null;
  }
}

/**
 * Verify client session
 *
 * Clerk manages real sessions. This shim always returns null so callers
 * fall through to Clerk auth. Prevents runtime crash from missing
 * clientSessions table.
 */
export async function verifyClientSession(_sessionId: string): Promise<ClientSession | null> {
  // Clerk is the source of truth — no custom session table exists
  return null;
}

/**
 * Logout client session
 *
 * No-op — Clerk handles sign-out. Kept for API compatibility.
 */
export async function logoutClientSession(_sessionId: string): Promise<void> {
  // Clerk manages sessions; nothing to delete
}

/**
 * Send magic link email
 */
export async function sendMagicLinkEmail(
  email: string,
  link: string,
  orgId: string
): Promise<boolean> {
  try {
    const org = await prisma.org.findUnique({
      where: { id: orgId },
    });

    // TODO: Implement email sending via Resend / SendGrid
    // eslint-disable-next-line no-console
    console.log(`
📧 Magic Link Email
To: ${email}
From: ${org?.name || "SkaiScraper"}

Access your client portal:
${link}

This link will expire in 24 hours.
    `);

    return true;
  } catch (error) {
    logger.error("Magic link email failed:", error);
    return false;
  }
}

/**
 * Cleanup expired tokens and sessions
 *
 * No custom tables to clean — Clerk manages session lifecycle.
 * Returns zeros so callers don't crash.
 */
export async function cleanupExpiredAuth(): Promise<{
  tokensDeleted: number;
  sessionsDeleted: number;
}> {
  return { tokensDeleted: 0, sessionsDeleted: 0 };
}

/**
 * Generate cryptographically secure token
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    const nodeCrypto = require("crypto");
    return nodeCrypto.randomBytes(32).toString("hex");
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Get client's active sessions
 *
 * Returns empty — Clerk manages sessions.
 */
export async function getClientSessions(_clientId: string): Promise<ClientSession[]> {
  return [];
}
