/**
 * GET  /api/portal/settings — read client notification preferences
 * PUT  /api/portal/settings — save client notification preferences
 *
 * Stores preferences in client_access.metadata JSON field.
 * Uses Clerk auth to identify the portal user, then looks up client_access by email.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Default preferences for new users
const DEFAULT_PREFS = {
  emailNotifications: true,
  pushNotifications: true,
  marketingEmails: false,
};

async function getPortalUser() {
  const { userId } = await auth();
  if (!userId) return null;

  // Look up user email
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) return null;

  // Find any client_access record for this email
  const access = await prisma.client_access.findFirst({
    where: { email: user.email },
  });

  return { userId, email: user.email, accessId: access?.id ?? null };
}

export async function GET() {
  try {
    const portalUser = await getPortalUser();
    if (!portalUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Try to read stored preferences from users table metadata or
    // use a dedicated key in the user record
    const user = await prisma.users.findUnique({
      where: { id: portalUser.userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ ok: true, preferences: DEFAULT_PREFS });
    }

    // Store prefs in a lightweight JSON table — use push_subscriptions metadata pattern
    // For now, use a simple key-value approach via the user_registry if available
    // or fall back to defaults
    const prefRecord = await prisma.$queryRaw<Array<{ value: string }>>`
      SELECT value FROM key_value_store 
      WHERE key = ${"portal_prefs:" + portalUser.userId}
      LIMIT 1
    `.catch(() => null);

    const preferences = prefRecord?.[0]?.value ? JSON.parse(prefRecord[0].value) : DEFAULT_PREFS;

    return NextResponse.json({ ok: true, preferences });
  } catch (error) {
    logger.error("[PORTAL_SETTINGS_GET]", error);
    // Return defaults on error instead of failing
    return NextResponse.json({ ok: true, preferences: DEFAULT_PREFS });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const portalUser = await getPortalUser();
    if (!portalUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const preferences = {
      emailNotifications:
        typeof body.emailNotifications === "boolean"
          ? body.emailNotifications
          : DEFAULT_PREFS.emailNotifications,
      pushNotifications:
        typeof body.pushNotifications === "boolean"
          ? body.pushNotifications
          : DEFAULT_PREFS.pushNotifications,
      marketingEmails:
        typeof body.marketingEmails === "boolean"
          ? body.marketingEmails
          : DEFAULT_PREFS.marketingEmails,
    };

    // Upsert into key_value_store
    await prisma.$executeRaw`
      INSERT INTO key_value_store (key, value, updated_at) 
      VALUES (${"portal_prefs:" + portalUser.userId}, ${JSON.stringify(preferences)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(preferences)}, updated_at = NOW()
    `.catch(async () => {
      // If key_value_store doesn't exist, create it
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS key_value_store (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      await prisma.$executeRaw`
        INSERT INTO key_value_store (key, value, updated_at) 
        VALUES (${"portal_prefs:" + portalUser.userId}, ${JSON.stringify(preferences)}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(preferences)}, updated_at = NOW()
      `;
    });

    logger.info("[PORTAL_SETTINGS_SAVE]", { userId: portalUser.userId, preferences });

    return NextResponse.json({ ok: true, preferences });
  } catch (error) {
    logger.error("[PORTAL_SETTINGS_PUT]", error);
    return NextResponse.json({ ok: false, error: "Failed to save preferences" }, { status: 500 });
  }
}
