import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { logger } from "@/lib/logger";
import {
  createPaymentFailedEmail,
  createTrialEndingEmail,
  createWelcomeEmail,
  safeSendEmail,
} from "@/lib/mail";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const stripe = getStripeClient()!;

// Validate webhook secret at module load — crash early if missing
// eslint-disable-next-line no-restricted-syntax
if (!process.env.STRIPE_WEBHOOK_SECRET && process.env.BUILD_PHASE !== "1") {
  throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
}
// eslint-disable-next-line no-restricted-syntax
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// Durable idempotency check using database
async function saveEventId(eventId: string, eventType: string): Promise<boolean> {
  try {
    await prisma.webhookEvent.create({
      data: {
        id: eventId,
        stripeEventId: eventId,
        type: eventType,
        payload: {}, // Minimal payload for idempotency
      },
    });
    return true; // New event, proceed
  } catch (error) {
    // Unique constraint violation means we've seen this event before
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === "P2002") {
      return false; // Already processed
    }
    throw error; // Other database errors should bubble up
  }
}

export async function POST(req: Request) {
  // Basic rate limiting per source IP to reduce abuse / signature brute force
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rl = await checkRateLimit(`stripe:${ip}`, "WEBHOOK");
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded", reset: rl.reset }, { status: 429 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err) {
    logger.error("Stripe signature verify failed", err?.message);
    Sentry.captureException(err, {
      tags: { component: "stripe-webhook" },
      extra: { eventType: "signature_verification_failed" },
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Durable idempotency check
  try {
    const isNewEvent = await saveEventId(event.id, event.type);
    if (!isNewEvent) {
      logger.debug(`[EMAIL:IDEMPOTENT] Skipping already processed event: ${event.id}`);
      return NextResponse.json({ received: true, processed: false });
    }
  } catch (error) {
    logger.error("Idempotency check failed:", error);
    Sentry.captureException(error, {
      tags: { component: "stripe-webhook", event_id: event.id },
      extra: { eventType: event.type },
    });
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "invoice.upcoming": {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription && invoice.status === "draft") {
          // Fail-safe: Log missing customer email for ops
          if (!invoice.customer_email) {
            logger.error(`[EMAIL:MISSING_EMAIL] invoice.upcoming without customer_email`, {
              invoiceId: invoice.id,
              customerId: invoice.customer,
              subscriptionId: invoice.subscription,
            });
            // ENHANCEMENT: Route to ops/support inbox if needed
            break;
          }

          let daysRemaining = 1; // Default to 1 day

          if (typeof invoice.subscription === "string") {
            const sub = await stripe.subscriptions.retrieve(invoice.subscription);
            if (sub.trial_end) {
              const trialEnd = new Date(sub.trial_end * 1000);
              daysRemaining = Math.max(
                1,
                Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              );
            }
          }

          const emailContent = createTrialEndingEmail({
            userName: invoice.customer_email?.split("@")[0] || "User",
            daysRemaining,
          });

          await safeSendEmail({
            to: invoice.customer_email,
            ...emailContent,
          });

          logger.debug(`[EMAIL:TRIAL_ENDING] Sent to ${invoice.customer_email}`);
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        let email: string | null = null;

        if (typeof sub.customer === "string") {
          const customer = await stripe.customers.retrieve(sub.customer);
          email = (customer as Stripe.Customer).email || null;
        } else {
          email = (sub.customer as Stripe.Customer).email || null;
        }

        if (email) {
          let daysRemaining = 1;
          if (sub.trial_end) {
            const trialEnd = new Date(sub.trial_end * 1000);
            daysRemaining = Math.max(
              1,
              Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            );
          }
          const emailContent = createTrialEndingEmail({
            userName: email.split("@")[0] || "User",
            daysRemaining,
          });

          await safeSendEmail({
            to: email,
            ...emailContent,
          });

          logger.debug(`[EMAIL:TRIAL_ENDING] Sent to ${email} (backup)`);
        } else {
          logger.error(`[EMAIL:MISSING_EMAIL] trial_will_end without email`, {
            subscriptionId: sub.id,
            customerId: sub.customer,
          });
        }
        break;
      }

      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;

        // Send welcome email for new subscriptions
        if (cs.customer_details?.email) {
          const emailContent = createWelcomeEmail({
            userName: cs.customer_details.email.split("@")[0] || "User",
          });

          await safeSendEmail({
            to: cs.customer_details.email,
            ...emailContent,
          });

          logger.debug(`[EMAIL:WELCOME] Sent to ${cs.customer_details.email}`);

          // STUB: Receipt email not yet wired. Will use Resend when template is ready.
        } else {
          logger.error(`[EMAIL:MISSING_EMAIL] checkout.session.completed without email`, {
            sessionId: cs.id,
            customerId: cs.customer,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        // Find Org by stripeCustomerId
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        const Org = await prisma.org.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (Org) {
          // Map Stripe status to our schema
          const statusMap: Record<string, string> = {
            trialing: "trialing",
            active: "active",
            past_due: "past_due",
            canceled: "canceled",
            unpaid: "canceled",
            incomplete: "incomplete",
            incomplete_expired: "incomplete_expired",
            paused: "paused",
          };

          const subscriptionStatus = statusMap[sub.status] || sub.status;

          // Extract planKey from price metadata if available
          let planKey = Org.planKey;
          if (sub.items.data[0]?.price.metadata?.planKey) {
            planKey = sub.items.data[0].price.metadata.planKey;
          }

          // ── Atomically update org + subscription in a transaction ──
          const quantity = sub.items.data[0]?.quantity || 1;
          const subItemId = sub.items.data[0]?.id;

          await prisma.$transaction([
            prisma.org.update({
              where: { id: Org.id },
              data: {
                stripeSubscriptionId: sub.id,
                subscriptionStatus,
                planKey,
              },
            }),
            prisma.subscription.upsert({
              where: { orgId: Org.id },
              create: {
                id: sub.id,
                orgId: Org.id,
                stripeCustomerId: customerId,
                stripeSubId: sub.id,
                stripeSubscriptionItemId: subItemId,
                seatCount: quantity,
                pricePerSeat: 8000,
                status: sub.status,
                currentPeriodEnd: sub.current_period_end
                  ? new Date(sub.current_period_end * 1000)
                  : null,
                updatedAt: new Date(),
              },
              update: {
                status: sub.status,
                seatCount: quantity,
                stripeSubscriptionItemId: subItemId,
                currentPeriodEnd: sub.current_period_end
                  ? new Date(sub.current_period_end * 1000)
                  : null,
                updatedAt: new Date(),
              },
            }),
          ]);

          logger.debug(
            `[SUBSCRIPTION:${event.type}] Updated Org ${Org.id}: status=${subscriptionStatus}, sub=${sub.id}, seats=${quantity}`
          );

          // 🎯 REFERRAL REWARD: Check if this subscription came from a referral
          if (event.type === "customer.subscription.created" && sub.metadata?.ref) {
            const refCode = sub.metadata.ref;
            logger.debug(`[REFERRAL] Processing referral code: ${refCode}`);

            try {
              // Find the referral record
              const referral = await prisma.referrals.findFirst({
                where: { ref_code: refCode },
              });

              if (referral && referral.status !== "subscribed") {
                // Atomically update referral status + look up referrer org
                await prisma.referrals.update({
                  where: { id: referral.id },
                  data: {
                    status: "subscribed",
                    invitee_org_id: Org.id,
                    updated_at: new Date(),
                  },
                });

                // Award the referrer: extend subscription by 30 days
                const referrerOrg = await prisma.org.findUnique({
                  where: { id: referral.org_id },
                });

                if (referrerOrg?.stripeSubscriptionId) {
                  const referrerSub = await stripe.subscriptions.retrieve(
                    referrerOrg.stripeSubscriptionId
                  );

                  // Calculate new period end (+30 days)
                  const currentEnd = referrerSub.current_period_end;
                  const newEnd = currentEnd + 30 * 24 * 60 * 60; // +30 days in seconds

                  // Extend the subscription
                  await stripe.subscriptions.update(referrerOrg.stripeSubscriptionId, {
                    trial_end: newEnd,
                    proration_behavior: "none",
                  });

                  logger.debug(
                    `[REFERRAL:MONTH] Extended subscription for Org ${referral.org_id} by 30 days`
                  );
                }
              }
            } catch (error) {
              logger.error("[REFERRAL] Error processing referral:", error);
              Sentry.captureException(error, {
                tags: { component: "stripe-webhook-referral" },
                extra: { refCode, orgId: Org.id },
              });
              // Don't fail the entire webhook if referral processing fails
            }
          }
        } else {
          logger.warn(`[SUBSCRIPTION:${event.type}] No Org found for customer ${customerId}`);
        }

        // ── Full Access / Trades Network subscription ──
        if (sub.metadata?.product === "full_access" && sub.metadata?.userId) {
          const faUserId = sub.metadata.userId;
          const isActive = sub.status === "active" || sub.status === "trialing";
          const expiresAt = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

          try {
            await prisma.$executeRaw`
              INSERT INTO tn_memberships (userId, full_access, expires_at, stripe_subscription_id)
              VALUES (${faUserId}::uuid, ${isActive}, ${expiresAt}, ${sub.id})
              ON CONFLICT (user_id)
              DO UPDATE SET
                full_access = ${isActive},
                expires_at = ${expiresAt},
                stripe_subscription_id = ${sub.id},
                updated_at = NOW()
            `;

            logger.debug(
              `[FULL_ACCESS] ${event.type} - User ${faUserId}: ${isActive ? "ACTIVE" : "INACTIVE"} until ${expiresAt}`
            );
          } catch (error) {
            logger.error("[FULL_ACCESS] Database update failed:", error);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        const Org = await prisma.org.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (Org) {
          // Atomically cancel org status + subscription record
          await prisma.$transaction([
            prisma.org.update({
              where: { id: Org.id },
              data: {
                subscriptionStatus: "canceled",
              },
            }),
            prisma.subscription.updateMany({
              where: { orgId: Org.id },
              data: {
                status: "canceled",
                updatedAt: new Date(),
              },
            }),
          ]);

          logger.debug(`[SUBSCRIPTION:DELETED] Canceled Org ${Org.id} subscription`);
        }

        // ── Full Access / Trades Network deactivation ──
        if (sub.metadata?.product === "full_access" && sub.metadata?.userId) {
          const faUserId = sub.metadata.userId;
          try {
            await prisma.$executeRaw`
              UPDATE tn_memberships
              SET full_access = false,
                  expires_at = NOW(),
                  updated_at = NOW()
              WHERE user_id = ${faUserId}::uuid
            `;
            logger.debug(`[FULL_ACCESS] Subscription deleted - User ${faUserId}: DEACTIVATED`);
          } catch (error) {
            logger.error("[FULL_ACCESS] Deactivation failed:", error);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        // ── Seat-billing: sync subscription on renewal ──────────────
        if (invoice.subscription) {
          const subId =
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.subscription.id;

          const localSub = await prisma.subscription.findFirst({
            where: { stripeSubId: subId },
          });

          if (localSub) {
            // Refresh period end from Stripe
            const stripeSub = await stripe.subscriptions.retrieve(subId);
            await prisma.subscription.update({
              where: { id: localSub.id },
              data: {
                status: stripeSub.status,
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                seatCount: stripeSub.items.data[0]?.quantity || localSub.seatCount,
                updatedAt: new Date(),
              },
            });
            logger.debug(
              `[SEAT-BILLING] Renewed sub ${subId}, seats=${stripeSub.items.data[0]?.quantity}`
            );
          }
        }

        logger.debug(`[INVOICE:PAYMENT_SUCCEEDED] Invoice ${invoice.id} paid`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        // Send dunning email
        if (invoice.customer_email) {
          const amountDue = invoice.amount_due ? invoice.amount_due / 100 : 0;

          const emailContent = createPaymentFailedEmail({
            userName: invoice.customer_email.split("@")[0] || "User",
            amount: amountDue,
          });

          await safeSendEmail({
            to: invoice.customer_email,
            ...emailContent,
          });

          logger.debug(`[EMAIL:PAYMENT_FAILED] Sent dunning email to ${invoice.customer_email}`);
        } else {
          logger.error(`[EMAIL:PAYMENT_FAILED] No customer email for invoice ${invoice.id}`);
        }

        // Update Org subscriptionStatus to past_due
        if (invoice.subscription) {
          const subId =
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : invoice.subscription.id;

          const Org = await prisma.org.findFirst({
            where: { stripeSubscriptionId: subId },
          });

          if (Org) {
            await prisma.org.update({
              where: { id: Org.id },
              data: { subscriptionStatus: "past_due" },
            });

            logger.debug(`[SUBSCRIPTION:PAST_DUE] Updated Org ${Org.id} to past_due`);
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const customerId =
          typeof charge.customer === "string" ? charge.customer : charge.customer?.id;

        if (customerId) {
          const org = await prisma.org.findFirst({
            where: { stripeCustomerId: customerId },
          });

          if (org) {
            logger.info(
              `[CHARGE:REFUNDED] Org ${org.id}: charge ${charge.id} refunded $${(charge.amount_refunded / 100).toFixed(2)}`
            );
            Sentry.captureMessage(
              `Stripe refund processed: $${(charge.amount_refunded / 100).toFixed(2)}`,
              {
                level: "info",
                tags: { component: "stripe-webhook", orgId: org.id },
                extra: { chargeId: charge.id, amount: charge.amount_refunded },
              }
            );
          }
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;

        logger.error(
          `[CHARGE:DISPUTE] Dispute ${dispute.id} created for charge ${chargeId}, reason: ${dispute.reason}, amount: $${(dispute.amount / 100).toFixed(2)}`
        );
        Sentry.captureMessage(`⚠️ Stripe dispute created: ${dispute.reason}`, {
          level: "error",
          tags: { component: "stripe-webhook-dispute" },
          extra: {
            disputeId: dispute.id,
            chargeId,
            reason: dispute.reason,
            amount: dispute.amount,
          },
        });
        break;
      }

      case "customer.deleted": {
        const customer = event.data.object as Stripe.Customer;

        const org = await prisma.org.findFirst({
          where: { stripeCustomerId: customer.id },
        });

        if (org) {
          await prisma.org.update({
            where: { id: org.id },
            data: {
              subscriptionStatus: "canceled",
              stripeCustomerId: null,
              stripeSubscriptionId: null,
            },
          });

          logger.warn(
            `[CUSTOMER:DELETED] Customer ${customer.id} deleted — Org ${org.id} subscription cleared`
          );
          Sentry.captureMessage(`Stripe customer deleted — org subscription cleared`, {
            level: "warning",
            tags: { component: "stripe-webhook", orgId: org.id },
          });
        }
        break;
      }

      default:
        logger.debug(`[EMAIL:UNHANDLED] Event type: ${event.type}`);
        break;
    }

    return NextResponse.json({
      received: true,
      rateLimit: { remaining: rl.remaining, limit: rl.limit, reset: rl.reset },
    });
  } catch (e) {
    const isRetryable =
      e instanceof Error &&
      (e.message.includes("ECONNREFUSED") ||
        e.message.includes("ETIMEDOUT") ||
        e.message.includes("database") ||
        e.message.includes("prisma") ||
        e.message.includes("P2024")); // Prisma connection pool timeout

    logger.error(`[WEBHOOK:${isRetryable ? "RETRYABLE" : "FATAL"}] ${event.type}`, e);
    Sentry.captureException(e, {
      tags: { component: "stripe-webhook", retryable: String(isRetryable), eventType: event.type },
      extra: { eventId: event.id },
    });

    // 500 = Stripe retries (good for transient errors)
    // 200 = swallow permanently (bad data we can't fix on retry)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: isRetryable ? 500 : 200 }
    );
  }
}
