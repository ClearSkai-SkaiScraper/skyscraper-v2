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

    // Read preferences from portal_settings table
    const settings = await prisma.portal_settings.findMany({
      where: { userId: portalUser.userId },
      select: { key: true, value: true },
    });

    const preferences = { ...DEFAULT_PREFS };
    for (const s of settings) {
      if (s.key in preferences) {
        (preferences as Record<string, unknown>)[s.key] = s.value === "true";
      }
    }

    return NextResponse.json({ ok: true, preferences });
  } catch (error) {
    logger.error("[PORTAL_SETTINGS_GET]", error);
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

    // Upsert each preference into portal_settings
    const upserts = Object.entries(preferences).map(([key, value]) =>
      prisma.portal_settings.upsert({
        where: { userId_key: { userId: portalUser.userId, key } },
        update: { value: String(value), updatedAt: new Date() },
        create: { userId: portalUser.userId, key, value: String(value) },
      })
    );
    await Promise.all(upserts);

    logger.info("[PORTAL_SETTINGS_SAVE]", { userId: portalUser.userId, preferences });

    return NextResponse.json({ ok: true, preferences });
  } catch (error) {
    logger.error("[PORTAL_SETTINGS_PUT]", error);
    return NextResponse.json({ ok: false, error: "Failed to save preferences" }, { status: 500 });
  }
}
