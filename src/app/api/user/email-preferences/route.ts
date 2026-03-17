export const dynamic = "force-dynamic";

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/user/email-preferences
 * Retrieves current user's email preferences
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await prisma.user_email_preferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Return defaults if no preferences exist
      return NextResponse.json({
        preferences: {
          marketingOptIn: false,
          productUpdates: true,
          securityAlerts: true,
          weeklyDigest: false,
          partnerOffers: false,
        },
      });
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    logger.error("[Email Preferences GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

/**
 * POST /api/user/email-preferences
 * Creates or updates user's email preferences
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress || "";

    const body = await request.json();
    const {
      marketingOptIn = false,
      productUpdates = true,
      securityAlerts = true,
      weeklyDigest = false,
      partnerOffers = false,
      optInSource = "settings",
    } = body;

    // Upsert preferences
    const preferences = await prisma.user_email_preferences.upsert({
      where: { userId },
      create: {
        id: crypto.randomUUID(),
        userId,
        email,
        marketingOptIn,
        productUpdates,
        securityAlerts,
        weeklyDigest,
        partnerOffers,
        optInTimestamp: marketingOptIn ? new Date() : null,
        optInSource: marketingOptIn ? optInSource : null,
      },
      update: {
        email,
        marketingOptIn,
        productUpdates,
        securityAlerts,
        weeklyDigest,
        partnerOffers,
        optInTimestamp: marketingOptIn ? new Date() : undefined,
        optInSource: marketingOptIn ? optInSource : undefined,
        unsubscribedAt: !marketingOptIn ? new Date() : null,
      },
    });

    logger.info(
      `[Email Preferences] User ${userId} updated preferences - marketing: ${marketingOptIn}`
    );

    // Also save to email_subscribers table if marketing opt-in
    if (marketingOptIn && email) {
      try {
        // Get user's name from database
        const dbUser = await prisma.users.findUnique({
          where: { clerkUserId: userId },
          select: { id: true, name: true },
        });

        await db.query(
          `INSERT INTO email_subscribers (email, first_name, last_name, user_id, source, preferences, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true)
           ON CONFLICT (email) DO UPDATE SET 
             first_name = COALESCE(EXCLUDED.first_name, email_subscribers.first_name),
             last_name = COALESCE(EXCLUDED.last_name, email_subscribers.last_name),
             user_id = COALESCE(EXCLUDED.user_id, email_subscribers.user_id),
             preferences = EXCLUDED.preferences,
             is_active = true,
             updated_at = NOW()`,
          [
            email.toLowerCase(),
            dbUser?.name?.split(" ")[0] || user?.firstName || null,
            dbUser?.name?.split(" ").slice(1).join(" ") || user?.lastName || null,
            dbUser?.id || null,
            optInSource,
            JSON.stringify({ marketingOptIn, productUpdates, weeklyDigest, partnerOffers }),
          ]
        );
        logger.debug(`[Email Subscribers] Added/updated ${email} to newsletter list`);
      } catch (dbError) {
        // Table might not exist yet - that's okay, just log it
        logger.info(
          "[Email Subscribers] Could not add to newsletter list (table may not exist):",
          dbError
        );
      }
    }

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    logger.error("[Email Preferences POST] Error:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/email-preferences
 * Unsubscribe from all marketing emails
 */
export async function DELETE() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user_email_preferences.update({
      where: { userId },
      data: {
        marketingOptIn: false,
        weeklyDigest: false,
        partnerOffers: false,
        unsubscribedAt: new Date(),
      },
    });

    logger.debug(`[Email Preferences] User ${userId} unsubscribed from marketing`);

    return NextResponse.json({
      success: true,
      message: "Unsubscribed from marketing emails",
    });
  } catch (error) {
    logger.error("[Email Preferences DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
