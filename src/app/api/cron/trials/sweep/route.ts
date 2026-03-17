import { NextRequest, NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron/verifyCronSecret";
import { logger } from "@/lib/logger";
import {
  createTrial1HourEmail,
  createTrial24HourEmail,
  createTrialEndedEmail,
  safeSendEmail,
} from "@/lib/mail";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Trial Sweeper Cron Job
 * Runs hourly to:
 * 1. Mark expired trials as 'ended'
 * 2. Send T-24h reminder emails
 * 3. Send T-1h reminder emails
 * 4. Send trial ended emails
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const results = {
      markedEnded: 0,
      sent24h: 0,
      sent1h: 0,
      sentEnded: 0,
      errors: [] as string[],
    };

    // 1. Find and mark expired trials
    let expiredTrials: any[] = [];
    try {
      expiredTrials = await prisma.org.findMany({
        where: {
          trialStatus: "active",
          trialEndsAt: {
            lte: now,
          },
          subscriptionStatus: {
            not: "active",
          },
        },
        select: {
          id: true,
          name: true,
          users: {
            take: 1,
            orderBy: { createdAt: "asc" }, // First user (owner)
            select: {
              email: true,
            },
          },
        },
      });
    } catch (err) {
      logger.error(
        "[CRON:TRIALS_SWEEP] Skipping expiredTrials step due to DB schema issue:",
        err?.message || err
      );
      results.errors.push("expiredTrials-step-failed: " + (err?.message || String(err)));
      // Proceed but treat as zero
      expiredTrials = [];
    }

    for (const Org of expiredTrials) {
      try {
        // Mark as ended
        await prisma.org.update({
          where: { id: Org.id },
          data: {
            trialStatus: "ended",
          },
        });

        results.markedEnded++;

        // Send trial ended email
        const email = Org.users[0]?.email;
        if (email) {
          const emailContent = createTrialEndedEmail({
            userName: Org.name || "there",
          });

          await safeSendEmail({
            to: email,
            ...emailContent,
          });

          results.sentEnded++;
          logger.debug(`[CRON:TRIAL_ENDED] Sent to ${email} for Org ${Org.id}`);
        }
      } catch (error) {
        const msg = `Failed to process expired trial for Org ${Org.id}: ${error}`;
        logger.error(msg);
        results.errors.push(msg);
      }
    }

    // 2. Send T-24h reminders (23-25 hour window)
    const t24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const t24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    let t24hOrgs: any[] = [];
    try {
      t24hOrgs = await prisma.org.findMany({
        where: {
          trialStatus: "active",
          sentTrialT24: false,
          trialEndsAt: {
            gte: t24hStart,
            lte: t24hEnd,
          },
        },
        select: {
          id: true,
          name: true,
          trialEndsAt: true,
          users: {
            take: 1,
            orderBy: { createdAt: "asc" }, // First user (owner)
            select: {
              email: true,
            },
          },
        },
      });
    } catch (err) {
      logger.error(
        "[CRON:TRIALS_SWEEP] Skipping T-24 step due to DB schema issue:",
        err?.message || err
      );
      results.errors.push("t24-step-failed: " + (err?.message || String(err)));
      t24hOrgs = [];
    }

    for (const Org of t24hOrgs) {
      try {
        const email = Org.users[0]?.email;
        if (email && Org.trialEndsAt) {
          const emailContent = createTrial24HourEmail({
            userName: Org.name || "there",
            trialEndsAt: Org.trialEndsAt,
          });

          await safeSendEmail({
            to: email,
            ...emailContent,
          });

          // Mark as sent
          await prisma.org.update({
            where: { id: Org.id },
            data: { sentTrialT24: true },
          });

          results.sent24h++;
          logger.debug(`[CRON:T-24H] Sent to ${email} for Org ${Org.id}`);
        }
      } catch (error) {
        const msg = `Failed to send T-24h email for Org ${Org.id}: ${error}`;
        logger.error(msg);
        results.errors.push(msg);
      }
    }

    // 3. Send T-1h reminders (50-70 minute window)
    const t1hStart = new Date(now.getTime() + 50 * 60 * 1000);
    const t1hEnd = new Date(now.getTime() + 70 * 60 * 1000);

    let t1hOrgs: any[] = [];
    try {
      t1hOrgs = await prisma.org.findMany({
        where: {
          trialStatus: "active",
          sentTrialT1: false,
          trialEndsAt: {
            gte: t1hStart,
            lte: t1hEnd,
          },
        },
        select: {
          id: true,
          name: true,
          trialEndsAt: true,
          users: {
            take: 1,
            orderBy: { createdAt: "asc" }, // First user (owner)
            select: {
              email: true,
            },
          },
        },
      });
    } catch (err) {
      logger.error(
        "[CRON:TRIALS_SWEEP] Skipping T-1 step due to DB schema issue:",
        err?.message || err
      );
      results.errors.push("t1-step-failed: " + (err?.message || String(err)));
      t1hOrgs = [];
    }

    for (const Org of t1hOrgs) {
      try {
        const email = Org.users[0]?.email;
        if (email && Org.trialEndsAt) {
          const emailContent = createTrial1HourEmail({
            userName: Org.name || "there",
            trialEndsAt: Org.trialEndsAt,
          });

          await safeSendEmail({
            to: email,
            ...emailContent,
          });

          // Mark as sent
          await prisma.org.update({
            where: { id: Org.id },
            data: { sentTrialT1: true },
          });

          results.sent1h++;
          logger.debug(`[CRON:T-1H] Sent to ${email} for Org ${Org.id}`);
        }
      } catch (error) {
        const msg = `Failed to send T-1h email for Org ${Org.id}: ${error}`;
        logger.error(msg);
        results.errors.push(msg);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    logger.error("[CRON:TRIALS_SWEEP] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Cron job failed",
        details: "Internal error",
      },
      { status: 500 }
    );
  }
}
