export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { randomUUID } from "crypto";
/**
 * Clerk User Webhook Handler
 *
 * Automatically bootstraps new organizations when users sign up
 * Integrates with scripts/bootstrap-new-Org.ts
 *
 * Setup:
 * 1. In Clerk Dashboard → Webhooks → Add Endpoint
 * 2. URL: https://your-domain.com/api/webhooks/clerk
 * 3. Subscribe to: user.created, organization.created
 * 4. Add CLERK_WEBHOOK_SECRET to .env
 */
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { bootstrapNewOrg } from "@/scripts/bootstrap-new-org";

// eslint-disable-next-line no-restricted-syntax
const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

/**
 * Auto-sync Stripe subscription seat count when members are added/removed.
 * Uses proration so billing adjusts mid-cycle.
 */
async function syncStripeSeats(orgId: string, direction: "increment" | "decrement") {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { orgId },
      select: { stripeSubId: true, stripeSubscriptionItemId: true, seatCount: true, status: true },
    });

    if (!sub || !sub.stripeSubId || !sub.stripeSubscriptionItemId) {
      logger.debug(`[Webhook] No active Stripe subscription for org ${orgId}, skipping seat sync`);
      return;
    }

    if (sub.status !== "active" && sub.status !== "trialing") {
      logger.debug(
        `[Webhook] Subscription ${sub.stripeSubId} status is ${sub.status}, skipping seat sync`
      );
      return;
    }

    const newCount = direction === "increment" ? sub.seatCount + 1 : Math.max(1, sub.seatCount - 1);

    // Lazy-load Stripe to avoid import issues at module scope
    const { getStripeClient } = await import("@/lib/stripe");
    const stripe = getStripeClient();
    if (!stripe) {
      logger.warn("[Webhook] Stripe not configured, cannot sync seats");
      return;
    }

    await stripe.subscriptionItems.update(sub.stripeSubscriptionItemId, {
      quantity: newCount,
      proration_behavior: "create_prorations",
    });

    await prisma.subscription.update({
      where: { orgId },
      data: { seatCount: newCount, updatedAt: new Date() },
    });

    logger.info(`[Webhook] ✅ Stripe seats synced: ${sub.seatCount} → ${newCount} (${direction})`);
  } catch (err) {
    logger.error(`[Webhook] ❌ Failed to sync Stripe seats (${direction}):`, err);
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rl = await checkRateLimit(`clerk:${ip}`, "WEBHOOK");
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded", reset: rl.reset }, { status: 429 });
  }
  if (!webhookSecret) {
    logger.error("[Webhook] CLERK_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  try {
    // Get headers
    const svix_id = req.headers.get("svix-id");
    const svix_timestamp = req.headers.get("svix-timestamp");
    const svix_signature = req.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
    }

    // Get body
    const body = await req.text();

    // Verify webhook signature
    const wh = new Webhook(webhookSecret);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let evt: any;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      logger.error("[Webhook] Verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle different event types
    const eventType = evt.type;
    logger.debug(`[Webhook] Received event: ${eventType}`);

    // User created event
    if (eventType === "user.created") {
      const {
        id: userId,
        email_addresses,
        primary_email_address_id,
        first_name,
        last_name,
      } = evt.data;
      const primaryEmail = email_addresses.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => e.id === primary_email_address_id
      )?.email_address;

      logger.debug(`[Webhook] New user created: ${userId} (${primaryEmail})`);

      // Bootstrap user with default Org
      try {
        // Create Org first
        const Org = await prisma.org.upsert({
          where: { clerkOrgId: `org_${userId}` },
          update: {},
          create: {
            id: randomUUID(),
            clerkOrgId: `org_${userId}`,
            name: `${primaryEmail?.split("@")[0] || "My"} Company`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        });

        // ⭐ CRITICAL FIX: Create the users table record FIRST
        const userName =
          [first_name, last_name].filter(Boolean).join(" ") ||
          primaryEmail?.split("@")[0] ||
          "New User";
        await prisma.users.upsert({
          where: { clerkUserId: userId },
          update: {
            email: primaryEmail || "",
            orgId: Org.id,
          },
          create: {
            id: randomUUID(),
            clerkUserId: userId,
            email: primaryEmail || "",
            name: userName,
            orgId: Org.id,
          },
        });
        logger.debug(`[Webhook] ✅ User record created in users table`);

        // Now bootstrap (creates userOrganization, team_members, tokens, etc.)
        const result = await bootstrapNewOrg(userId, Org.id, {
          includeWelcomeData: true,
          initialTokens: 100,
          skipBrandingSetup: false,
        });

        if (result.success) {
          logger.debug(`[Webhook] ✅ User ${userId} fully bootstrapped`);
        } else {
          logger.error(`[Webhook] ⚠️ Bootstrap completed with errors:`, result.errors);
        }
      } catch (error) {
        logger.error(`[Webhook] ❌ Bootstrap failed for user ${userId}:`, error);
        // Don't return error - allow signup to continue
      }
    }

    // Organization created event
    if (eventType === "organization.created") {
      const { id: orgId, created_by: userId } = evt.data;

      logger.debug(`[Webhook] New Org created: ${orgId} by user ${userId}`);

      // Bootstrap organization
      try {
        const result = await bootstrapNewOrg(userId, orgId, {
          includeWelcomeData: false, // Orgs don't need welcome data
          initialTokens: 200, // More tokens for Org accounts
          skipBrandingSetup: false,
        });

        if (result.success) {
          logger.debug(`[Webhook] ✅ Org ${orgId} bootstrapped successfully`);
        } else {
          logger.error(`[Webhook] ⚠️ Bootstrap completed with errors:`, result.errors);
        }
      } catch (error) {
        logger.error(`[Webhook] ❌ Bootstrap failed for Org ${orgId}:`, error);
      }
    }

    // ─── Organization Membership Deleted ───────────────────────
    // When a user is removed from an org in Clerk Dashboard,
    // clean up their DB membership so withOrgScope rejects future requests.
    // Also decrement Stripe seat count.
    if (eventType === "organizationMembership.deleted") {
      const { organization, public_user_data } = evt.data;
      const clerkOrgId = organization?.id;
      const removedUserId = public_user_data?.user_id;

      if (clerkOrgId && removedUserId) {
        logger.info(`[Webhook] Membership removed: user ${removedUserId} from org ${clerkOrgId}`);

        try {
          // Find the DB org by Clerk org ID
          const org = await prisma.org.findFirst({
            where: { clerkOrgId },
            select: { id: true },
          });

          if (org) {
            // Find the DB user by Clerk user ID
            const user = await prisma.users.findFirst({
              where: { clerkUserId: removedUserId },
              select: { id: true },
            });

            if (user) {
              // Delete the user_organizations row → withOrgScope will reject future API calls
              await prisma.user_organizations.deleteMany({
                where: {
                  userId: user.id,
                  organizationId: org.id,
                },
              });

              // Also remove from team_members if exists
              try {
                await prisma.$executeRaw`
                  DELETE FROM team_members
                  WHERE "userId" = ${user.id}
                    AND "orgId" = ${org.id}
                `;
              } catch {
                // team_members table may not exist in all environments
              }

              logger.info(
                `[Webhook] ✅ Removed user ${removedUserId} from org ${clerkOrgId} in DB`
              );
            }

            // ── Auto-decrement Stripe seat count ──────────────────────
            await syncStripeSeats(org.id, "decrement");
          }
        } catch (error) {
          logger.error(`[Webhook] ❌ Failed to remove membership:`, error);
        }
      }
    }

    // ─── Organization Membership Created ──────────────────────────
    // When a new member joins an org (invite accepted, admin adds),
    // auto-increment the Stripe seat count.
    if (eventType === "organizationMembership.created") {
      const { organization, public_user_data } = evt.data;
      const clerkOrgId = organization?.id;
      const newUserId = public_user_data?.user_id;

      if (clerkOrgId && newUserId) {
        logger.info(`[Webhook] Membership added: user ${newUserId} to org ${clerkOrgId}`);

        try {
          const org = await prisma.org.findFirst({
            where: { clerkOrgId },
            select: { id: true },
          });

          if (org) {
            // ── Auto-increment Stripe seat count ──────────────────────
            await syncStripeSeats(org.id, "increment");
          }
        } catch (error) {
          logger.error(`[Webhook] ❌ Failed to sync seats on membership created:`, error);
        }
      }
    }

    return NextResponse.json({ success: true, eventType });
  } catch (error) {
    logger.error("[Webhook] Handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "Clerk webhook endpoint active",
    events: [
      "user.created",
      "organization.created",
      "organizationMembership.created",
      "organizationMembership.deleted",
    ],
    timestamp: new Date().toISOString(),
  });
}
