// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const notificationPrefsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  leadAlerts: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
});

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/notifications
 * Fetch user notification preferences
 */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to find existing preferences
    const prefs = (await prisma.user_registry.findUnique({
      where: { clerkUserId: user.id },
      select: {
        notificationEmail: true,
        notificationLeadAlerts: true,
        notificationWeeklySummary: true,
      } as unknown as Record<string, boolean>,
    })) as unknown as {
      notificationEmail?: boolean;
      notificationLeadAlerts?: boolean;
      notificationWeeklySummary?: boolean;
    } | null;

    return NextResponse.json({
      emailNotifications: prefs?.notificationEmail ?? true,
      leadAlerts: prefs?.notificationLeadAlerts ?? true,
      weeklySummary: prefs?.notificationWeeklySummary ?? false,
    });
  } catch (error) {
    logger.error("[API] GET /api/settings/notifications error:", error);
    return NextResponse.json({
      emailNotifications: true,
      leadAlerts: true,
      weeklySummary: false,
    });
  }
}

/**
 * POST /api/settings/notifications
 * Save user notification preferences
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = notificationPrefsSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { emailNotifications, leadAlerts, weeklySummary } = parsed.data;

    await (prisma.user_registry.upsert as Function)({
      where: { clerkUserId: user.id },
      update: {
        notificationEmail: emailNotifications ?? true,
        notificationLeadAlerts: leadAlerts ?? true,
        notificationWeeklySummary: weeklySummary ?? false,
      },
      create: {
        clerkUserId: user.id,
        userType: "pro",
        displayName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
        primaryEmail: user.emailAddresses?.[0]?.emailAddress || "",
        notificationEmail: emailNotifications ?? true,
        notificationLeadAlerts: leadAlerts ?? true,
        notificationWeeklySummary: weeklySummary ?? false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[API] POST /api/settings/notifications error:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
